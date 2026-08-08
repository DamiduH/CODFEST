-- Migration: add email and phone columns to players table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

alter table players
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '';
