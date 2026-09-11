-- DropFund's empty Postgres schema for the Vercel migration.
-- Amounts are stored as integer micro-USDC (6 decimals).

create table if not exists profiles (
  wallet_address text primary key,
  name text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  privy_did text primary key,
  solana_address text not null unique,
  display_name text not null check (char_length(display_name) between 1 and 50),
  image_url text,
  name_change_count integer not null default 0 check (name_change_count between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_name_history (
  id bigserial primary key,
  privy_did text not null references users(privy_did),
  old_name text not null,
  new_name text not null,
  changed_at timestamptz not null default now()
);

create table if not exists campaigns (
  id text primary key,
  title text not null,
  description text not null,
  goal bigint not null check (goal > 0),
  duration_days integer not null check (duration_days between 0 and 365),
  image_url text not null default '',
  thumbnail_url text,
  creator_wallet_address text not null,
  creator_display_name text not null,
  is_reported boolean not null default false,
  report_count integer not null default 0 check (report_count >= 0),
  created_at timestamptz not null default now(),
  end_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended', 'funded', 'goal_reached')),
  total_raised bigint not null default 0 check (total_raised >= 0),
  donation_count integer not null default 0 check (donation_count >= 0),
  website_url text,
  twitter_url text,
  telegram_url text,
  category text not null default 'Other'
);

create index if not exists campaigns_creator_idx on campaigns (creator_wallet_address);
create index if not exists campaigns_created_idx on campaigns (created_at desc);

create table if not exists campaign_reports (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  reporter_wallet_address text not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (campaign_id, reporter_wallet_address)
);

create table if not exists donations (
  transaction_signature text primary key,
  fee_transaction_signature text not null default '',
  amount bigint not null check (amount > 0),
  fee_amount bigint not null default 0 check (fee_amount >= 0),
  donor_wallet_address text not null,
  campaign_id text not null references campaigns(id),
  created_at timestamptz not null default now()
);

create index if not exists donations_campaign_idx on donations (campaign_id, created_at desc);
create index if not exists donations_donor_idx on donations (donor_wallet_address, created_at desc);
