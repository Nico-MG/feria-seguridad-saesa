alter table public.companies
  add column if not exists linkedin_url text;

update public.companies
set linkedin_url = youtube_url,
    youtube_url = null
where coalesce(btrim(linkedin_url), '') = ''
  and youtube_url ~* '^https?://([a-z0-9-]+\.)*linkedin\.com(/|:|$)';
