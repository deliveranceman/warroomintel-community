-- Additive, non-destructive. ai_usage_log was created out-of-band without
-- user_id / tier / cost columns, so per-user attribution and spend tracking
-- did not persist. These columns are nullable and safe to add online.

alter table ai_usage_log add column if not exists user_id  text;
alter table ai_usage_log add column if not exists tier     text;
alter table ai_usage_log add column if not exists cost_usd numeric(12,6);

create index if not exists ai_usage_log_called_at   on ai_usage_log (called_at);
create index if not exists ai_usage_log_user_called on ai_usage_log (user_id, called_at);
