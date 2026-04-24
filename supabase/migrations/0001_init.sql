-- Waypoint MVP schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`).

-- ─── facilities ─────────────────────────────────────────────────
create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text,
  floor_plan_url text,
  floor_plan_width int,
  floor_plan_height int,
  created_at timestamptz default now()
);

alter table facilities enable row level security;

drop policy if exists "Users own their facilities" on facilities;
create policy "Users own their facilities"
  on facilities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── waypoints ──────────────────────────────────────────────────
create table if not exists waypoints (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references facilities(id) on delete cascade not null,
  label text not null,
  x float not null,
  y float not null,
  sequence_order int not null,
  ai_suggested boolean default false,
  created_at timestamptz default now()
);

create index if not exists waypoints_facility_id_idx on waypoints(facility_id);

alter table waypoints enable row level security;

drop policy if exists "Users manage waypoints for their facilities" on waypoints;
create policy "Users manage waypoints for their facilities"
  on waypoints for all
  using (
    facility_id in (select id from facilities where user_id = auth.uid())
  )
  with check (
    facility_id in (select id from facilities where user_id = auth.uid())
  );

-- ─── walk_sessions ──────────────────────────────────────────────
create table if not exists walk_sessions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references facilities(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text default 'in_progress' check (status in ('in_progress', 'completed'))
);

create index if not exists walk_sessions_facility_id_idx on walk_sessions(facility_id);

alter table walk_sessions enable row level security;

drop policy if exists "Users own their sessions" on walk_sessions;
create policy "Users own their sessions"
  on walk_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── photos ─────────────────────────────────────────────────────
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references walk_sessions(id) on delete cascade not null,
  waypoint_id uuid references waypoints(id) on delete set null,
  facility_id uuid references facilities(id) on delete cascade not null,
  storage_path text not null,
  public_url text not null,
  captured_at timestamptz default now(),
  capture_source text default 'phone' check (capture_source in ('phone', 'glasses'))
);

create index if not exists photos_session_id_idx on photos(session_id);
create index if not exists photos_waypoint_id_idx on photos(waypoint_id);

alter table photos enable row level security;

drop policy if exists "Users access photos from their sessions" on photos;
create policy "Users access photos from their sessions"
  on photos for all
  using (
    session_id in (select id from walk_sessions where user_id = auth.uid())
  )
  with check (
    session_id in (select id from walk_sessions where user_id = auth.uid())
  );
