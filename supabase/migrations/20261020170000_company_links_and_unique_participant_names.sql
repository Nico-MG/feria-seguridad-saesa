alter table public.companies
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text;

alter table public.participants
  alter column email drop not null,
  alter column phone drop not null;

create unique index if not exists participants_name_unique_idx
  on public.participants (lower(btrim(name)));
