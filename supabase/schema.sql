-- CODFEST schema. Run this in the Supabase SQL editor.
-- All application access is server-side (API routes) using the service role key,
-- so RLS is enabled with NO policies: the public anon key can read/write nothing.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'player' check (role in ('admin', 'team_captain', 'player')),
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null unique,
  logo_url text,
  discord text,
  whatsapp text,
  email text,
  phone text,
  captain_id uuid not null references users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  points int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  maps_won int not null default 0,
  maps_lost int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_name text not null,
  game_id text not null,
  is_substitute boolean not null default false
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  round int not null default 1,
  bracket_slot int not null default 0,
  team1_id uuid references teams(id),
  team2_id uuid references teams(id),
  map text,
  scheduled_time timestamptz,
  stream_url text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'awaiting_scores', 'disputed', 'finished')),
  submission_team1 jsonb,
  submission_team2 jsonb,
  final_score1 int,
  final_score2 int,
  winner_id uuid references teams(id),
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_status on matches(status);
create index if not exists idx_matches_round_slot on matches(round, bracket_slot);
create index if not exists idx_players_team on players(team_id);
create index if not exists idx_teams_status on teams(status);
create index if not exists idx_audit_created on audit_logs(created_at desc);

-- Lock everything down for the public anon key (server uses service role, which bypasses RLS).
alter table users enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table announcements enable row level security;
alter table audit_logs enable row level security;

-- Seed an admin account (password: "codfest-admin" hashed with bcrypt, change immediately):
-- insert into users (name, email, password_hash, role)
-- values ('Admin', 'admin@codfest.gg', '$2a$10$Q0GZ0Xg1sQ8yFzWZ0dO0y.9v0hVtLrJ3n0aTzXhU0FhY6C1J8mW6y', 'admin');
-- Prefer generating your own hash: node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
