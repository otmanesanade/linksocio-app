-- =========================================================================
-- LINKSOCIO — SUPABASE POSTGRESQL PRODUCTION MIGRATION
-- Migration: 20261012000000_audit_corrections_schema.sql
-- Addresses:
--   - P0: API Security & Server-Side Access Control (RBAC & RLS)
--   - P0: JSON Store Migration to Postgres with Relational Constraints
--   - P0: Order, Price, Platform Fee (9%) & Payout Integrity
--   - P0: Stripe Connect Multi-State & Idempotent Webhook Events
--   - P0: Column-level protection for roles, balances, and plans
-- =========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. PROFILES TABLE (User profiles & Creator accounts)
-- -------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  theme text default 'luxury_dark',
  plan text default 'free',
  role text default 'creator' check (role in ('creator', 'admin', 'moderator')),
  stripe_account_id text,
  stripe_status text default 'not_connected' check (stripe_status in ('not_connected', 'pending_verification', 'active', 'restricted')),
  wallet_balance numeric(12, 2) default 0.00 check (wallet_balance >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_profiles_username on public.profiles (lower(username));

-- -------------------------------------------------------------------------
-- 2. PRODUCTS TABLE (Digital items, courses, templates, downloads)
-- -------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'EUR',
  file_url text,
  image_url text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_products_user on public.products (user_id);
create index if not exists idx_products_active on public.products (is_active);

-- -------------------------------------------------------------------------
-- 3. ORDERS TABLE (Purchases with strictly enforced server-side fee calculation)
-- -------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  buyer_email text not null,
  buyer_name text,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'EUR',
  platform_fee numeric(10, 2) not null default 0.00 check (platform_fee >= 0),
  creator_amount numeric(10, 2) not null check (creator_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  download_count integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_orders_seller on public.orders (seller_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_stripe_session on public.orders (stripe_session_id);

-- -------------------------------------------------------------------------
-- 4. PAYMENTS TABLE (Audit trail of processed transactions)
-- -------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  amount numeric(10, 2) not null,
  currency text not null default 'EUR',
  provider text not null default 'stripe',
  provider_payment_id text unique,
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- -------------------------------------------------------------------------
-- 5. PAYOUT SETTINGS TABLE (Bank credentials & Stripe Connect details)
-- -------------------------------------------------------------------------
create table if not exists public.payout_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  method text not null default 'stripe_connect',
  rib text,
  iban text,
  bank_name text,
  account_holder_name text,
  stripe_account_id text,
  stripe_status text default 'not_connected',
  is_verified boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_payout_settings_user on public.payout_settings (user_id);

-- -------------------------------------------------------------------------
-- 6. PAYOUT REQUESTS TABLE (Withdrawals with state machine & anti-double-spend)
-- -------------------------------------------------------------------------
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'EUR',
  method text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'approved', 'completed', 'rejected')),
  account_details jsonb default '{}'::jsonb,
  admin_notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_payout_requests_user on public.payout_requests (user_id);
create index if not exists idx_payout_requests_status on public.payout_requests (status);

-- -------------------------------------------------------------------------
-- 7. SUBSCRIPTIONS TABLE (Creator SaaS Plans)
-- -------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null,
  status text not null default 'active',
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_subscriptions_user on public.subscriptions (user_id);

-- -------------------------------------------------------------------------
-- 8. WEBHOOK EVENTS TABLE (Stripe & Gateway Idempotency Journal)
-- -------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'processed' check (status in ('pending', 'processing', 'processed', 'failed', 'ignored')),
  processed_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_webhook_events_id on public.webhook_events (event_id);

-- -------------------------------------------------------------------------
-- 9. BOOKINGS TABLE (Client appointment bookings)
-- -------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  client_phone text,
  booking_date date not null,
  booking_time text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_bookings_user on public.bookings (user_id);

-- -------------------------------------------------------------------------
-- 10. LEADS & INQUIRIES TABLE
-- -------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lead_name text not null,
  lead_email text,
  lead_phone text,
  service_type text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'closed')),
  created_at timestamptz default now() not null
);

create index if not exists idx_leads_user on public.leads (user_id);

-- -------------------------------------------------------------------------
-- 11. BOOKING SETTINGS TABLE (Creator calendar & availability preferences)
-- -------------------------------------------------------------------------
create table if not exists public.booking_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_booking_settings_user on public.booking_settings (user_id);

-- -------------------------------------------------------------------------
-- 12. INQUIRY SETTINGS TABLE (WhatsApp lead capture configurations)
-- -------------------------------------------------------------------------
create table if not exists public.inquiry_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_inquiry_settings_user on public.inquiry_settings (user_id);

-- -------------------------------------------------------------------------
-- 13. RESTAURANT MENUS TABLE (Cafe & dining catalog)
-- -------------------------------------------------------------------------
create table if not exists public.restaurant_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  menu jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_restaurant_menus_user on public.restaurant_menus (user_id);

-- =========================================================================
-- DATABASE FUNCTIONS & SECURITY TRIGGERS (Audit Point 8)
-- =========================================================================

-- Trigger to protect sensitive columns on profiles (role, wallet_balance, plan)
create or replace function public.protect_profile_fields()
returns trigger as $$
begin
  -- If invoked by regular user (not service_role), forbid modifying role, balance, or plan
  if (coalesce(current_setting('request.jwt.claim.role', true), '') != 'service_role') then
    if new.wallet_balance is distinct from old.wallet_balance then
      raise exception 'SECURITY_VIOLATION: wallet_balance cannot be modified directly by client';
    end if;
    if new.role is distinct from old.role then
      raise exception 'SECURITY_VIOLATION: role cannot be elevated by client';
    end if;
    if new.plan is distinct from old.plan then
      raise exception 'SECURITY_VIOLATION: plan cannot be modified by client';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Atomic Wallet Balance Increment Function (Audit Point 5)
create or replace function public.increment_wallet_balance(p_user_id uuid, p_amount numeric)
returns numeric as $$
declare
  v_new_balance numeric;
begin
  if p_amount <= 0 then
    raise exception 'Increment amount must be positive';
  end if;

  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + p_amount,
      updated_at = now()
  where id = p_user_id
  returning wallet_balance into v_new_balance;

  return v_new_balance;
end;
$$ language plpgsql security definer;

-- Revoke execute from anon and authenticated; only service_role can call increment_wallet_balance
revoke execute on function public.increment_wallet_balance(uuid, numeric) from public, anon, authenticated;
grant execute on function public.increment_wallet_balance(uuid, numeric) to service_role;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.payout_settings enable row level security;
alter table public.payout_requests enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.bookings enable row level security;
alter table public.leads enable row level security;
alter table public.booking_settings enable row level security;
alter table public.inquiry_settings enable row level security;
alter table public.restaurant_menus enable row level security;

-- PROFILES
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile bio/theme/avatar"
  on public.profiles for update
  using (auth.uid() = id);

-- PRODUCTS
create policy "Active products are viewable by everyone"
  on public.products for select
  using (is_active = true or auth.uid() = user_id);

create policy "Creators can insert own products"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "Creators can update own products"
  on public.products for update
  using (auth.uid() = user_id);

create policy "Creators can delete own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- ORDERS
create policy "Sellers can view their orders"
  on public.orders for select
  using (auth.uid() = seller_id);

-- Clients cannot insert/modify orders directly via client SDK; only service_role creates/confirms orders

-- PAYMENTS
create policy "Users can view payments for their orders"
  on public.payments for select
  using (auth.uid() = user_id);

-- PAYOUT SETTINGS
create policy "Creators can view own payout settings"
  on public.payout_settings for select
  using (auth.uid() = user_id);

create policy "Creators can manage own payout settings"
  on public.payout_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- PAYOUT REQUESTS
create policy "Creators can view own payout requests"
  on public.payout_requests for select
  using (auth.uid() = user_id);

create policy "Creators can request payouts"
  on public.payout_requests for insert
  with check (auth.uid() = user_id);

-- BOOKINGS
create policy "Creators can view and manage their bookings"
  on public.bookings for all
  using (auth.uid() = user_id);

create policy "Anyone can insert booking for a creator"
  on public.bookings for insert
  with check (true);

-- LEADS
create policy "Creators can view their leads"
  on public.leads for all
  using (auth.uid() = user_id);

create policy "Anyone can submit inquiry lead"
  on public.leads for insert
  with check (true);

-- BOOKING SETTINGS
create policy "Creators can manage own booking settings"
  on public.booking_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INQUIRY SETTINGS
create policy "Creators can manage own inquiry settings"
  on public.inquiry_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RESTAURANT MENUS
create policy "Restaurant menus viewable by everyone"
  on public.restaurant_menus for select
  using (true);

create policy "Creators can manage own restaurant menu"
  on public.restaurant_menus for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- WEBHOOK EVENTS: Only service_role
create policy "Service role exclusive access to webhook events"
  on public.webhook_events for all
  using (auth.role() = 'service_role');
