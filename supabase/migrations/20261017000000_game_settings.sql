create table if not exists public.game_settings (
  event_id bigint primary key references public.events(id) on delete cascade,
  image_path text not null,
  findings jsonb not null default '[]'::jsonb
    check (jsonb_typeof(findings) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.game_settings enable row level security;

revoke all on public.game_settings from anon, authenticated;
grant select on public.game_settings to anon, authenticated;

drop policy if exists "Public can read active event game" on public.game_settings;
create policy "Public can read active event game"
  on public.game_settings
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.events
      where public.events.id = game_settings.event_id
        and public.events.is_active = true
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'feria-game-images',
  'feria-game-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
