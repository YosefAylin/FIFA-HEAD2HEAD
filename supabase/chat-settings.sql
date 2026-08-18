-- ============================================================
-- Group chat + app settings ("Cumba of Shabbat" build)
-- Run this in the Supabase SQL editor AFTER reset-and-seed.sql.
-- It creates:
--   1. chat_messages    – the group chat thread
--   2. settings         – tournament gate (active Sat only, with manual override)
-- Everything is open (anonymous friends group, same as the rest).
-- ============================================================

-- ---------- 1. chat_messages ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "Public chat select" on public.chat_messages;
create policy "Public chat select" on public.chat_messages
  for select using (true);

drop policy if exists "Public chat insert" on public.chat_messages;
create policy "Public chat insert" on public.chat_messages
  for insert with check (true);

drop policy if exists "Public chat delete" on public.chat_messages;
create policy "Public chat delete" on public.chat_messages
  for delete using (true);

alter publication supabase_realtime add table public.chat_messages;

-- ---------- 2. settings (tournament gate) ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "Public settings select" on public.settings;
create policy "Public settings select" on public.settings
  for select using (true);

drop policy if exists "Public settings insert" on public.settings;
create policy "Public settings insert" on public.settings
  for insert with check (true);

drop policy if exists "Public settings update" on public.settings;
create policy "Public settings update" on public.settings
  for update using (true);

drop policy if exists "Public settings delete" on public.settings;
create policy "Public settings delete" on public.settings
  for delete using (true);

alter publication supabase_realtime add table public.settings;

-- Default: "auto" = open only on Saturdays.
insert into public.settings (key, value)
values ('tournament', '{"mode": "auto"}')
on conflict (key) do nothing;