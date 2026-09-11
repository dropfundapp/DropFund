alter table campaigns add column if not exists is_reported boolean not null default false;
alter table campaigns add column if not exists report_count integer not null default 0 check (report_count >= 0);

create table if not exists campaign_reports (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  reporter_wallet_address text not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (campaign_id, reporter_wallet_address)
);

create index if not exists campaign_reports_open_idx on campaign_reports (status, created_at);