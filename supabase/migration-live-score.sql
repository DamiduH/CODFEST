-- Migration: add live_score1 / live_score2 to the matches table.
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

alter table matches
  add column if not exists live_score1 int,
  add column if not exists live_score2 int;
