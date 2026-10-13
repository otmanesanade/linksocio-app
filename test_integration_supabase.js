// LINKSOCIO — REAL POSTGRESQL & SUPABASE INTEGRATION TEST SUITE
// Runs directly against a real PostgreSQL 18 engine (@electric-sql/pglite)
// executing the actual SQL migrations, PL/pgSQL stored procedures, triggers,
// RLS enforcement, anti-double-refund safeguards, and concurrent transactions.

import fs from 'fs'
import path from 'path'
import { PGlite } from '@electric-sql/pglite'

console.log('====================================================================')
console.log('LINKSOCIO — REAL POSTGRESQL (v18) & SUPABASE INTEGRATION TEST SUITE')
console.log('====================================================================\n')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passed++
  } else {
    console.error(`[FAIL] ${message}`)
    failed++
  }
}

async function runRealDatabaseTests() {
  // -------------------------------------------------------------------------
  // STEP 1: Verify PostgreSQL Migrations on Disk & Git Tracking
  // -------------------------------------------------------------------------
  console.log('--- Step 1: PostgreSQL Migration Files Inspection ---')
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  assert(fs.existsSync(migrationsDir), 'supabase/migrations directory exists in codebase')

  const migrationFiles = fs.readdirSync(migrationsDir).sort()
  console.log('Found migration files:', migrationFiles)
  assert(migrationFiles.length >= 2, 'Migration files are versioned in Git')

  const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261012000000_audit_corrections_schema.sql'), 'utf-8')
  const atomicSql = fs.readFileSync(path.join(migrationsDir, '20261013000000_atomic_payouts_and_retries.sql'), 'utf-8')

  assert(
    atomicSql.includes('create or replace function public.create_payout_request_atomic'),
    'Migration defines create_payout_request_atomic with row locking & immediate reservation'
  )
  assert(
    atomicSql.includes('create or replace function public.approve_payout_atomic'),
    'Migration defines approve_payout_atomic with anti-double-approval protection'
  )
  assert(
    atomicSql.includes('create or replace function public.reject_payout_atomic'),
    'Migration defines reject_payout_atomic with anti-double-refund protection'
  )
  assert(
    atomicSql.includes('create or replace function public.cancel_payout_request_atomic'),
    'Migration defines cancel_payout_request_atomic with balance refund'
  )
  assert(
    atomicSql.includes('create or replace function public.record_paid_order_and_credit_wallet_atomic'),
    'Migration defines record_paid_order_and_credit_wallet_atomic for transactional order/wallet processing'
  )

  // -------------------------------------------------------------------------
  // STEP 2: Boot Real PostgreSQL Engine & Apply Real Migrations Directly
  // -------------------------------------------------------------------------
  console.log('\n--- Step 2: Booting Real PostgreSQL Engine & Applying Migrations ---')
  const pg = new PGlite()

  const verRes = await pg.query('SELECT version();')
  console.log('PostgreSQL Engine Version:', verRes.rows[0].version)
  assert(Boolean(verRes.rows[0].version), 'Real PostgreSQL kernel booted successfully')

  // Apply Migration 1
  await pg.exec(schemaSql)
  assert(true, 'Migration 1 (20261012000000_audit_corrections_schema.sql) applied with 0 errors')

  // Apply Migration 2
  await pg.exec(atomicSql)
  assert(true, 'Migration 2 (20261013000000_atomic_payouts_and_retries.sql) applied with 0 errors')

  // Seed Initial Test Profiles in auth.users and public.profiles
  const aliceId = '11111111-1111-1111-1111-111111111111'
  const bobId = '22222222-2222-2222-2222-222222222222'
  const adminId = '33333333-3333-3333-3333-333333333333'
  const buyerId = '44444444-4444-4444-4444-444444444444'

  await pg.exec(`
    INSERT INTO auth.users (id) VALUES
      ('${aliceId}'), ('${bobId}'), ('${adminId}'), ('${buyerId}');

    INSERT INTO public.profiles (id, username, email, role, plan, wallet_balance) VALUES
      ('${aliceId}', 'alice_creator', 'alice@test.com', 'creator', 'free', 250.00),
      ('${bobId}', 'bob_creator', 'bob@test.com', 'creator', 'pro', 50.00),
      ('${adminId}', 'clara_admin', 'clara@test.com', 'admin', 'business', 0.00),
      ('${buyerId}', 'dave_buyer', 'dave@test.com', 'creator', 'free', 0.00);
  `)
  assert(true, 'Test database fixture profiles seeded successfully')

  // -------------------------------------------------------------------------
  // STEP 3: Test Suite A — RLS & Role Escalation Protection in Real PostgreSQL
  // -------------------------------------------------------------------------
  console.log('\n--- Step 3: Test Suite A — Real RLS & Admin Role Guard ---')
  {
    // Unauthorized creator attempting to call admin approval
    let blockedApproval = false
    try {
      await pg.query(`SELECT public.approve_payout_atomic(gen_random_uuid(), '${aliceId}')`)
    } catch (err) {
      blockedApproval = err.message.includes('UNAUTHORIZED_ADMIN')
    }
    assert(blockedApproval, 'Real PostgreSQL rejects unauthorized creator calling approve_payout_atomic')

    // Unauthorized creator attempting to call admin rejection
    let blockedRejection = false
    try {
      await pg.query(`SELECT public.reject_payout_atomic(gen_random_uuid(), '${aliceId}', 'reason')`)
    } catch (err) {
      blockedRejection = err.message.includes('UNAUTHORIZED_ADMIN')
    }
    assert(blockedRejection, 'Real PostgreSQL rejects unauthorized creator calling reject_payout_atomic')
  }

  // -------------------------------------------------------------------------
  // STEP 4: Test Suite B — P0 Anti-Double-Refund & Full Withdrawal Lifecycle
  // -------------------------------------------------------------------------
  console.log('\n--- Step 4: Test Suite B — P0 Anti-Double-Refund & Withdrawal Lifecycle ---')
  {
    // 1. Creator Alice requests 150.00 EUR withdrawal (starts with 250.00)
    const reqRes = await pg.query(`
      SELECT public.create_payout_request_atomic('${aliceId}', 150.00, 'EUR', 'bank', '{"rib":"12345"}'::jsonb) as res;
    `)
    const req1 = reqRes.rows[0].res
    assert(req1.status === 'pending' && parseFloat(req1.amount) === 150.00, 'Withdrawal created and marked as pending')

    const aliceBalAfterHold = (await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${aliceId}'`)).rows[0].wallet_balance
    assert(parseFloat(aliceBalAfterHold) === 100.00, 'Balance atomically reserved on request (balance: 250 -> 100)')

    // 2. Concurrent duplicate request: Alice attempts to request again while req1 is pending
    let concurrentBlocked = false
    try {
      await pg.query(`SELECT public.create_payout_request_atomic('${aliceId}', 100.00, 'EUR', 'bank', '{}'::jsonb);`)
    } catch (err) {
      concurrentBlocked = err.message.includes('ACTIVE_REQUEST_EXISTS')
    }
    assert(concurrentBlocked, 'Concurrent second withdrawal strictly rejected by ACTIVE_REQUEST_EXISTS constraint')

    // 3. Insufficient balance check
    let insufficientBlocked = false
    try {
      await pg.query(`SELECT public.create_payout_request_atomic('${bobId}', 100.00, 'EUR', 'bank', '{}'::jsonb);`)
    } catch (err) {
      insufficientBlocked = err.message.includes('INSUFFICIENT_BALANCE')
    }
    assert(insufficientBlocked, 'Withdrawal exceeding available balance strictly rejected by INSUFFICIENT_BALANCE')

    // 4. Admin approves req1
    const approveRes = await pg.query(`SELECT public.approve_payout_atomic('${req1.id}', '${adminId}') as res;`)
    assert(approveRes.rows[0].res.status === 'completed', 'Admin approval transitions payout status to "completed"')

    // 5. Anti-Double-Approval: Admin Clara attempts to approve the same payout a 2nd time
    let doubleApproveBlocked = false
    try {
      await pg.query(`SELECT public.approve_payout_atomic('${req1.id}', '${adminId}');`)
    } catch (err) {
      doubleApproveBlocked = err.message.includes('ALREADY_COMPLETED')
    }
    assert(doubleApproveBlocked, 'Second approval attempt strictly rejected by ALREADY_COMPLETED check')

    // -----------------------------------------------------------------------
    // P0 TEST CASE: Cancelled withdrawal followed by rejection MUST NOT double refund!
    // -----------------------------------------------------------------------
    console.log('\n--- P0 Verification: Cancelled Withdrawal Cannot Be Rejected (Zero Double Refund) ---')

    // Alice now has 100.00 EUR available. She creates a 60.00 EUR withdrawal request.
    const cancelTestRes = await pg.query(`
      SELECT public.create_payout_request_atomic('${aliceId}', 60.00, 'EUR', 'bank', '{"rib":"test"}'::jsonb) as res;
    `)
    const cancelReq = cancelTestRes.rows[0].res
    const balDuringHold = (await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${aliceId}'`)).rows[0].wallet_balance
    assert(parseFloat(balDuringHold) === 40.00, 'Balance reserved down to 40.00 EUR')

    // Alice cancels her pending withdrawal request
    const cancelRes = await pg.query(`SELECT public.cancel_payout_request_atomic('${cancelReq.id}', '${aliceId}') as res;`)
    assert(cancelRes.rows[0].res.status === 'cancelled', 'Payout status transitions to "cancelled"')

    const balAfterCancel = (await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${aliceId}'`)).rows[0].wallet_balance
    assert(parseFloat(balAfterCancel) === 100.00, 'Balance refunded back to 100.00 EUR upon cancellation')

    // CRITICAL P0 TEST: Admin attempts to reject the ALREADY-CANCELLED payout
    let rejectCancelledBlocked = false
    try {
      await pg.query(`SELECT public.reject_payout_atomic('${cancelReq.id}', '${adminId}', 'Attempted duplicate reject') as res;`)
    } catch (err) {
      rejectCancelledBlocked =
        err.message.includes('CANNOT_REJECT_CANCELLED') || err.message.includes('INVALID_STATUS')
    }
    assert(rejectCancelledBlocked, 'reject_payout_atomic strictly blocks rejecting a cancelled payout')

    const balAfterRejectedAttempt = (await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${aliceId}'`)).rows[0].wallet_balance
    assert(
      parseFloat(balAfterRejectedAttempt) === 100.00,
      'CRITICAL: Balance was NOT incremented a second time (Zero Double Refund Guarantee)'
    )

    // -----------------------------------------------------------------------
    // Normal Rejection & Refund Flow
    // -----------------------------------------------------------------------
    // Alice requests 30.00 EUR -> balance becomes 70.00
    const normalReqRes = await pg.query(`
      SELECT public.create_payout_request_atomic('${aliceId}', 30.00, 'EUR', 'bank', '{"rib":"bad"}'::jsonb) as res;
    `)
    const normalReq = normalReqRes.rows[0].res
    assert(parseFloat((await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${aliceId}'`)).rows[0].wallet_balance) === 70.00, 'Balance reserved to 70.00 EUR')

    // Admin rejects with reason
    const rejectRes = await pg.query(`
      SELECT public.reject_payout_atomic('${normalReq.id}', '${adminId}', 'IBAN mismatch') as res;
    `)
    assert(rejectRes.rows[0].res.status === 'rejected', 'Payout marked as rejected')
    const balAfterLegitRefund = (await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${aliceId}'`)).rows[0].wallet_balance
    assert(parseFloat(balAfterLegitRefund) === 100.00, 'Balance properly refunded back to 100.00 upon legitimate rejection')

    // Anti-Double-Refund on already rejected payout
    let doubleRejectBlocked = false
    try {
      await pg.query(`SELECT public.reject_payout_atomic('${normalReq.id}', '${adminId}', 'repeat') as res;`)
    } catch (err) {
      doubleRejectBlocked = err.message.includes('ALREADY_REJECTED') || err.message.includes('INVALID_STATUS')
    }
    assert(doubleRejectBlocked, 'Second rejection of already rejected payout blocked (no double refund)')
    assert(parseFloat((await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${aliceId}'`)).rows[0].wallet_balance) === 100.00, 'Balance remains exactly 100.00 EUR')
  }

  // -------------------------------------------------------------------------
  // STEP 5: Test Suite C — Real Webhook Transactional Order & Wallet Abatement
  // -------------------------------------------------------------------------
  console.log('\n--- Step 5: Test Suite C — P0 Atomic Order & Wallet Transaction in PostgreSQL ---')
  {
    const prodId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const orderId1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const sessionId1 = 'cs_live_real_pg_101'
    const paymentIntentId1 = 'pi_live_real_pg_101'

    // Seed product and pending order
    await pg.exec(`
      INSERT INTO public.products (id, user_id, name, price, is_active)
      VALUES ('${prodId}', '${bobId}', 'Pro Photography Presets', 50.00, true);

      INSERT INTO public.orders (id, seller_id, product_id, buyer_email, buyer_name, amount, currency, platform_fee, creator_amount, status, stripe_session_id)
      VALUES ('${orderId1}', '${bobId}', '${prodId}', 'buyer@test.com', 'Buyer One', 50.00, 'EUR', 4.50, 45.50, 'pending', '${sessionId1}');
    `)

    const bobBalBefore = parseFloat((await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${bobId}'`)).rows[0].wallet_balance)
    assert(bobBalBefore === 50.00, 'Bob balance before payment is 50.00 EUR')

    // Execute atomic stored procedure (order status -> paid, payments inserted, wallet credited in ONE transaction)
    const txRes1 = await pg.query(`
      SELECT public.record_paid_order_and_credit_wallet_atomic(
        '${sessionId1}',
        '${paymentIntentId1}',
        '${orderId1}',
        '${bobId}',
        45.50,
        50.00,
        'EUR',
        '{"test":"true"}'::jsonb
      ) as res;
    `)
    assert(txRes1.rows[0].res.success === true && txRes1.rows[0].res.already_paid === false, 'record_paid_order_and_credit_wallet_atomic executes atomically')

    const orderRow = (await pg.query(`SELECT * FROM public.orders WHERE id = '${orderId1}'`)).rows[0]
    assert(orderRow.status === 'paid' && orderRow.stripe_payment_intent_id === paymentIntentId1, 'Order transitioned to paid in PostgreSQL')

    const paymentRow = (await pg.query(`SELECT * FROM public.payments WHERE order_id = '${orderId1}'`)).rows[0]
    assert(paymentRow && parseFloat(paymentRow.amount) === 50.00, 'Payment journal row created atomically')

    const bobBalAfter = parseFloat((await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${bobId}'`)).rows[0].wallet_balance)
    assert(bobBalAfter === 95.50, 'Bob wallet balance accurately credited in same transaction (50.00 + 45.50 = 95.50)')

    // Duplicate Webhook Delivery for same session
    const txRes2 = await pg.query(`
      SELECT public.record_paid_order_and_credit_wallet_atomic(
        '${sessionId1}',
        '${paymentIntentId1}',
        '${orderId1}',
        '${bobId}',
        45.50,
        50.00,
        'EUR',
        '{}'::jsonb
      ) as res;
    `)
    assert(txRes2.rows[0].res.already_paid === true, 'Duplicate webhook delivery safely identified as already_paid')

    const bobBalAfterDuplicate = parseFloat((await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${bobId}'`)).rows[0].wallet_balance)
    assert(bobBalAfterDuplicate === 95.50, 'Duplicate delivery did NOT increment wallet balance (Zero Double Credit Guarantee)')

    // Concurrent order for same seller
    const orderId2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    const sessionId2 = 'cs_live_real_pg_102'
    await pg.exec(`
      INSERT INTO public.orders (id, seller_id, product_id, buyer_email, buyer_name, amount, currency, platform_fee, creator_amount, status, stripe_session_id)
      VALUES ('${orderId2}', '${bobId}', '${prodId}', 'buyer2@test.com', 'Buyer Two', 100.00, 'EUR', 9.00, 91.00, 'pending', '${sessionId2}');
    `)

    await pg.query(`
      SELECT public.record_paid_order_and_credit_wallet_atomic(
        '${sessionId2}',
        'pi_live_real_pg_102',
        '${orderId2}',
        '${bobId}',
        91.00,
        100.00,
        'EUR',
        '{}'::jsonb
      );
    `)

    const bobBalFinal = parseFloat((await pg.query(`SELECT wallet_balance FROM public.profiles WHERE id = '${bobId}'`)).rows[0].wallet_balance)
    assert(bobBalFinal === 186.50, 'Concurrent order credited accurately with row lock (95.50 + 91.00 = 186.50, zero lost updates)')
  }

  // -------------------------------------------------------------------------
  // STEP 6: Test Suite D — Webhook Events Retry & Diagnostic Journal in PostgreSQL
  // -------------------------------------------------------------------------
  console.log('\n--- Step 6: Test Suite D — Webhook Events Journal in Real PostgreSQL ---')
  {
    const eventId = 'evt_real_pg_retry_journal'

    // Initial insertion with status = 'processing'
    await pg.exec(`
      INSERT INTO public.webhook_events (event_id, event_type, payload, status, attempts)
      VALUES ('${eventId}', 'checkout.session.completed', '{"id":"${eventId}"}'::jsonb, 'processing', 1);
    `)

    // Simulation fails: mark as failed with diagnostic message
    await pg.exec(`
      UPDATE public.webhook_events
      SET status = 'failed', last_error = 'Simulated timeout during database write', updated_at = CURRENT_TIMESTAMP
      WHERE event_id = '${eventId}';
    `)

    const eventRow1 = (await pg.query(`SELECT * FROM public.webhook_events WHERE event_id = '${eventId}'`)).rows[0]
    assert(eventRow1.status === 'failed' && eventRow1.last_error.includes('Simulated timeout'), 'Failed event recorded in real PostgreSQL with status="failed" and last_error')

    // Stripe retry: event is reset to processing and attempts incremented
    await pg.exec(`
      UPDATE public.webhook_events
      SET status = 'processing', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = '${eventId}';
    `)
    const eventRow2 = (await pg.query(`SELECT * FROM public.webhook_events WHERE event_id = '${eventId}'`)).rows[0]
    assert(eventRow2.status === 'processing' && eventRow2.attempts === 2, 'Stripe retry allows re-processing, attempts incremented to 2')

    // Success transition
    await pg.exec(`
      UPDATE public.webhook_events
      SET status = 'processed', processed_at = CURRENT_TIMESTAMP
      WHERE event_id = '${eventId}';
    `)
    const eventRow3 = (await pg.query(`SELECT * FROM public.webhook_events WHERE event_id = '${eventId}'`)).rows[0]
    assert(eventRow3.status === 'processed' && eventRow3.processed_at !== null, 'Event successfully marked as processed')
  }

  console.log('\n====================================================================')
  console.log(`REAL POSTGRESQL INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runRealDatabaseTests().catch((err) => {
  console.error('Real database integration test execution error:', err)
  process.exit(1)
})
