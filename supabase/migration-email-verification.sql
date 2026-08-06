-- Run once in the Supabase SQL editor for existing CODFEST databases.
alter table users add column if not exists email_verified boolean not null default true;
alter table users add column if not exists email_verify_token text;
alter table users add column if not exists email_verify_expires timestamptz;

-- Existing accounts stay usable; new registrations set email_verified = false.
update users set email_verified = true where email_verified is distinct from true;
