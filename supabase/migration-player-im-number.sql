-- Migration: add im_number column to players table
-- Run this in Supabase Dashboard → SQL Editor → New query

alter table players
  add column if not exists im_number text not null default '';
