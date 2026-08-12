-- Migration: site_settings table
-- Stores global toggle flags that admins can flip from the HQ Command panel.

create table if not exists site_settings (
  key   text primary key,
  value text not null
);

-- Seed the live-score visibility flag (default: visible).
insert into site_settings (key, value)
values ('live_score_visible', 'true')
on conflict (key) do nothing;

-- Lock down via RLS (server uses service role which bypasses RLS).
alter table site_settings enable row level security;
