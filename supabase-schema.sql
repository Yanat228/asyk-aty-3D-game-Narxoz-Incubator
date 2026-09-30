-- Выполни в Supabase → SQL Editor

create table if not exists progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stars jsonb default '{}'::jsonb,
  unlocked jsonb default '[1]'::jsonb,
  coins int default 100,
  skins jsonb default '["classic"]'::jsonb,
  active_skin text default 'classic',
  played boolean default false,
  updated_at timestamptz default now()
);

create table if not exists results (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  level int not null,
  score int not null default 0,
  stars int not null default 0,
  win boolean default false,
  mode int default 1,
  created_at timestamptz default now()
);

alter table progress enable row level security;
alter table results enable row level security;

create policy "progress own" on progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "results own" on results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
