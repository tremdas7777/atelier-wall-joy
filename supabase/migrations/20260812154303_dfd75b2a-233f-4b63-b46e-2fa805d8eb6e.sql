create extension if not exists pgcrypto;

create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigserial primary key,
  order_uid text not null unique,
  email text not null,
  customer_name text,
  plan text not null,
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null default 'pending',
  stripe_session_id text,
  stripe_payment_intent text,
  download_token text not null,
  download_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_views (
  id bigserial primary key,
  path text not null,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.checkout_events (
  id bigserial primary key,
  event_type text not null,
  plan text,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- The app accesses all tables through the service role (server-side only),
-- so only service_role gets privileges. RLS is enabled with no public policies,
-- keeping anon/authenticated fully locked out.
grant all on public.settings to service_role;
grant all on public.orders to service_role;
grant all on public.page_views to service_role;
grant all on public.checkout_events to service_role;

alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.page_views enable row level security;
alter table public.checkout_events enable row level security;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_settings_updated_at on public.settings;
create trigger update_settings_updated_at before update on public.settings
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at before update on public.orders
  for each row execute function public.update_updated_at_column();

create or replace function public.orders_status_counts()
returns table(status text, count bigint)
language sql
security definer
set search_path = public
as $$
  select status, count(*)::bigint
  from public.orders
  group by status
$$;

grant execute on function public.orders_status_counts() to service_role;

insert into public.settings (key, value) values
  ('essential_price_cents', '990'),
  ('premium_price_cents', '1990'),
  ('store_name', 'Atelier Wallpapers'),
  ('support_email', 'kontakt@atelierwallpapers.de')
on conflict (key) do nothing;