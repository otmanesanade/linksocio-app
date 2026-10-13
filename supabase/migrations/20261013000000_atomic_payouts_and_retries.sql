-- =========================================================================
-- LINKSOCIO — ATOMIC PAYOUTS, IDEMPOTENCY RETRIES & CONCURRENCY CONTROL
-- Migration: 20261013000000_atomic_payouts_and_retries.sql
-- =========================================================================

-- 1. Extend webhook_events with retry and error diagnostic columns
alter table if exists public.webhook_events
  add column if not exists attempts integer default 1,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz default now();

-- 2. Atomic Withdrawal Request Creation with Row Locking & Immediate Reservation
create or replace function public.create_payout_request_atomic(
  p_user_id uuid,
  p_amount numeric,
  p_currency text default 'EUR',
  p_method text default 'bank',
  p_details jsonb default '{}'::jsonb
)
returns jsonb as $$
declare
  v_current_balance numeric;
  v_active_count integer;
  v_new_request public.payout_requests%rowtype;
begin
  if p_amount <= 0 or p_amount is null then
    raise exception 'INVALID_AMOUNT: Withdrawal amount must be greater than zero';
  end if;

  -- 1. Exclusively lock the profile row to prevent concurrent race conditions
  select wallet_balance into v_current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'USER_NOT_FOUND: User profile does not exist';
  end if;

  -- 2. Check for existing concurrent active withdrawal requests
  select count(*) into v_active_count
  from public.payout_requests
  where user_id = p_user_id
    and status in ('pending', 'processing');

  if v_active_count > 0 then
    raise exception 'ACTIVE_REQUEST_EXISTS: You already have an active withdrawal request being processed';
  end if;

  -- 3. Verify sufficient balance against locked balance
  if coalesce(v_current_balance, 0) < p_amount then
    raise exception 'INSUFFICIENT_BALANCE: Available balance is insufficient for requested withdrawal';
  end if;

  -- 4. Atomically reserve / deduct the funds from wallet_balance
  update public.profiles
  set wallet_balance = round((v_current_balance - p_amount)::numeric, 2),
      updated_at = now()
  where id = p_user_id;

  -- 5. Insert new payout request in locked transaction
  insert into public.payout_requests (
    user_id,
    amount,
    currency,
    method,
    status,
    account_details,
    created_at,
    updated_at
  ) values (
    p_user_id,
    round(p_amount::numeric, 2),
    upper(coalesce(p_currency, 'EUR')),
    coalesce(p_method, 'bank'),
    'pending',
    coalesce(p_details, '{}'::jsonb),
    now(),
    now()
  )
  returning * into v_new_request;

  return to_jsonb(v_new_request);
end;
$$ language plpgsql security definer;

-- 3. Atomic Payout Approval with Anti-Double-Approval Guarantee
create or replace function public.approve_payout_atomic(
  p_payout_id uuid,
  p_admin_id uuid
)
returns jsonb as $$
declare
  v_admin_role text;
  v_request public.payout_requests%rowtype;
begin
  -- 1. Verify caller admin authority
  select role into v_admin_role
  from public.profiles
  where id = p_admin_id;

  if v_admin_role is null or (v_admin_role != 'admin' and v_admin_role != 'superadmin') then
    raise exception 'UNAUTHORIZED_ADMIN: Administrator privileges required to approve payouts';
  end if;

  -- 2. Lock payout request row exclusively
  select * into v_request
  from public.payout_requests
  where id = p_payout_id
  for update;

  if not found then
    raise exception 'PAYOUT_NOT_FOUND: Payout request does not exist';
  end if;

  -- 3. Prevent double approval
  if v_request.status = 'completed' then
    raise exception 'ALREADY_COMPLETED: Payout request has already been approved and completed';
  end if;

  if v_request.status not in ('pending', 'processing', 'approved') then
    raise exception 'INVALID_STATUS: Payout request is not in an approvable state';
  end if;

  -- 4. Transition status to completed
  update public.payout_requests
  set status = 'completed',
      updated_at = now()
  where id = p_payout_id
  returning * into v_request;

  return to_jsonb(v_request);
end;
$$ language plpgsql security definer;

-- 4. Atomic Payout Rejection with Balance Refund
create or replace function public.reject_payout_atomic(
  p_payout_id uuid,
  p_admin_id uuid,
  p_reason text default 'Administrative rejection'
)
returns jsonb as $$
declare
  v_admin_role text;
  v_request public.payout_requests%rowtype;
begin
  select role into v_admin_role
  from public.profiles
  where id = p_admin_id;

  if v_admin_role is null or (v_admin_role != 'admin' and v_admin_role != 'superadmin') then
    raise exception 'UNAUTHORIZED_ADMIN: Administrator privileges required to reject payouts';
  end if;

  select * into v_request
  from public.payout_requests
  where id = p_payout_id
  for update;

  if not found then
    raise exception 'PAYOUT_NOT_FOUND: Payout request does not exist';
  end if;

  if v_request.status = 'completed' then
    raise exception 'CANNOT_REJECT_COMPLETED: Completed payouts cannot be rejected';
  end if;

  if v_request.status = 'rejected' then
    raise exception 'ALREADY_REJECTED: Payout request is already rejected';
  end if;

  -- Refund reserved balance back to user profile
  update public.profiles
  set wallet_balance = round((coalesce(wallet_balance, 0) + v_request.amount)::numeric, 2),
      updated_at = now()
  where id = v_request.user_id;

  -- Update payout request status to rejected
  update public.payout_requests
  set status = 'rejected',
      admin_notes = p_reason,
      updated_at = now()
  where id = p_payout_id
  returning * into v_request;

  return to_jsonb(v_request);
end;
$$ language plpgsql security definer;

-- 5. Atomic Cancellation of Pending Payout by Creator with Refund
create or replace function public.cancel_payout_request_atomic(
  p_payout_id uuid,
  p_user_id uuid
)
returns jsonb as $$
declare
  v_request public.payout_requests%rowtype;
begin
  select * into v_request
  from public.payout_requests
  where id = p_payout_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'PAYOUT_NOT_FOUND: Payout request not found or unauthorized';
  end if;

  if v_request.status != 'pending' then
    raise exception 'CANNOT_CANCEL: Only pending payout requests can be cancelled';
  end if;

  -- Refund reserved balance back to profile
  update public.profiles
  set wallet_balance = round((coalesce(wallet_balance, 0) + v_request.amount)::numeric, 2),
      updated_at = now()
  where id = p_user_id;

  update public.payout_requests
  set status = 'cancelled',
      updated_at = now()
  where id = p_payout_id
  returning * into v_request;

  return to_jsonb(v_request);
end;
$$ language plpgsql security definer;

-- 6. Atomic Paid Order Transition and Wallet Balance Credit
create or replace function public.record_paid_order_and_credit_wallet_atomic(
  p_session_id text,
  p_payment_intent_id text default null,
  p_order_id uuid default null,
  p_seller_id uuid default null,
  p_creator_amount numeric default null,
  p_total_amount numeric default null,
  p_currency text default 'EUR',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb as $$
declare
  v_order public.orders%rowtype;
  v_new_balance numeric;
begin
  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id for update;
  else
    select * into v_order from public.orders where stripe_session_id = p_session_id for update;
  end if;

  if not found then
    raise exception 'ORDER_NOT_FOUND: Order with session id % not found', p_session_id;
  end if;

  -- Idempotency check: if already paid, do not double credit
  if v_order.status = 'paid' then
    return jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_id', v_order.id,
      'seller_id', v_order.seller_id
    );
  end if;

  -- Transition order status to paid
  update public.orders
  set status = 'paid',
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      updated_at = now()
  where id = v_order.id
  returning * into v_order;

  -- Insert into payments journal if not already recorded
  insert into public.payments (
    order_id,
    user_id,
    amount,
    currency,
    provider,
    provider_payment_id,
    status,
    metadata
  ) values (
    v_order.id,
    v_order.seller_id,
    coalesce(p_total_amount, v_order.amount),
    coalesce(p_currency, v_order.currency),
    'stripe',
    coalesce(p_payment_intent_id, p_session_id),
    'succeeded',
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider_payment_id) do nothing;

  -- Atomically credit the seller's wallet balance
  if v_order.seller_id is not null and coalesce(v_order.creator_amount, p_creator_amount, 0) > 0 then
    update public.profiles
    set wallet_balance = round((coalesce(wallet_balance, 0) + coalesce(v_order.creator_amount, p_creator_amount, 0))::numeric, 2),
        updated_at = now()
    where id = v_order.seller_id
    returning wallet_balance into v_new_balance;
  end if;

  return jsonb_build_object(
    'success', true,
    'already_paid', false,
    'order_id', v_order.id,
    'seller_id', v_order.seller_id,
    'new_wallet_balance', v_new_balance
  );
end;
$$ language plpgsql security definer;

-- 7. Revoke direct execution from untrusted roles; grant exclusively to service_role
revoke execute on function public.create_payout_request_atomic(uuid, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_payout_request_atomic(uuid, numeric, text, text, jsonb) to service_role;

revoke execute on function public.approve_payout_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_payout_atomic(uuid, uuid) to service_role;

revoke execute on function public.reject_payout_atomic(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reject_payout_atomic(uuid, uuid, text) to service_role;

revoke execute on function public.cancel_payout_request_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_payout_request_atomic(uuid, uuid) to service_role;

revoke execute on function public.record_paid_order_and_credit_wallet_atomic(text, text, uuid, uuid, numeric, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_paid_order_and_credit_wallet_atomic(text, text, uuid, uuid, numeric, numeric, text, jsonb) to service_role;
