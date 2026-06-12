-- Admin-authored dismissible modals system
-- Tables: modals (config), modal_events (per-user seen/dismissed/accepted)

create table if not exists modals (
  id            uuid primary key default gen_random_uuid(),
  type          text not null default 'announcement',
  title         text not null,
  body          text not null,
  cta_label     text,
  cta_link      text,
  -- audience: {"kind":"all"} or {"kind":"tier","minLevel":2}
  audience      jsonb not null default '{"kind":"all"}',
  -- frequency: "once" | "daily" | "always"
  frequency     text not null default 'once',
  -- if true, modal shows only an "I Agree" button (no dismiss ×)
  requires_acceptance boolean not null default false,
  -- higher number = shown first when multiple are eligible
  priority      integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists modal_events (
  id         bigserial primary key,
  modal_id   uuid not null references modals(id) on delete cascade,
  user_id    text not null,
  -- action: "seen" | "dismissed" | "accepted"
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists modal_events_user_modal_idx
  on modal_events (user_id, modal_id);

-- RLS: service role bypasses; these tables are not exposed to anon/authenticated PostgREST calls
alter table modals       enable row level security;
alter table modal_events enable row level security;

-- Allow nothing from client side (all access via service role in Netlify functions)
create policy "no client access" on modals       for all using (false);
create policy "no client access" on modal_events for all using (false);
