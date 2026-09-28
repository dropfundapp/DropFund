-- Apply this migration to the existing Neon database before deploying campaign comments.

alter table donations add column if not exists message text;
alter table donations add constraint donations_message_length check (message is null or char_length(message) <= 500);

create table if not exists campaign_comments (
  id bigserial primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  author_wallet_address text not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists campaign_comments_campaign_created_idx
  on campaign_comments (campaign_id, created_at desc);
