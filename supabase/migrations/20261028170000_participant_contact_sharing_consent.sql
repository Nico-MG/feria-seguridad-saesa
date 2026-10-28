alter table public.participants
  add column if not exists contact_sharing_consent boolean not null default false;
