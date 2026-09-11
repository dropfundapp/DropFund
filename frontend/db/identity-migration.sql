-- Apply this migration to the existing Neon database before deploying the identity changes.
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

alter table campaigns add column if not exists creator_display_name text;

-- Existing campaigns predate creator-name snapshots. Preserve their existing profile name
-- where available; new campaigns are always inserted with a non-null snapshot by the API.
update campaigns campaign
set creator_display_name = coalesce(nullif(profile.name, ''), 'DropFund creator')
from profiles profile
where campaign.creator_wallet_address = profile.wallet_address
  and campaign.creator_display_name is null;

update campaigns
set creator_display_name = 'DropFund creator'
where creator_display_name is null;

alter table campaigns alter column creator_display_name set not null;