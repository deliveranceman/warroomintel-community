-- AI usage tracking: one row per user per feature per UTC day
create table if not exists ai_usage_daily (
  id           bigserial primary key,
  user_id      text        not null,
  feature      text        not null,  -- 'ask_dake' | 'ai_assistant' | 'bible_ask' | 'symptom_investigator' | 'gateway' | 'dream' | 'document' | 'session_ai' | 'assessment'
  usage_date   date        not null default current_date,
  call_count   int         not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, feature, usage_date)
);

create index if not exists ai_usage_daily_user_date on ai_usage_daily (user_id, usage_date);

-- RLS: users read their own rows; service role writes
alter table ai_usage_daily enable row level security;
create policy "users read own usage" on ai_usage_daily
  for select using (auth.uid()::text = user_id);
create policy "service role full access" on ai_usage_daily
  using (true) with check (true);

-- Atomic increment function (avoids race conditions on concurrent requests)
create or replace function increment_ai_usage(
  p_user_id text,
  p_feature text,
  p_usage_date date
) returns int language plpgsql security definer as $$
declare v_count int;
begin
  insert into ai_usage_daily (user_id, feature, usage_date, call_count)
  values (p_user_id, p_feature, p_usage_date, 1)
  on conflict (user_id, feature, usage_date)
  do update set call_count = ai_usage_daily.call_count + 1, updated_at = now()
  returning call_count into v_count;
  return v_count;
end;
$$;
