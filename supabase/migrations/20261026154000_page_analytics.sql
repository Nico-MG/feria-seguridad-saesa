create table if not exists public.page_analytics (
  event_id bigint not null references public.events(id) on delete cascade,
  visitor_id uuid not null,
  path text not null check (
    path ~ '^/(|programa|concurso|imagen|stands(/[a-z0-9-]+(/qr)?)?)$'
  ),
  visit_date date not null default current_date,
  views integer not null default 1 check (views > 0),
  load_ms_total bigint not null default 0 check (load_ms_total >= 0),
  load_samples integer not null default 0 check (load_samples >= 0),
  last_seen_at timestamptz not null default now(),
  primary key (event_id, visitor_id, path, visit_date)
);

alter table public.page_analytics enable row level security;
revoke all on public.page_analytics from public, anon, authenticated;
create index if not exists page_analytics_event_last_seen_idx
  on public.page_analytics (event_id, last_seen_at);

create or replace function public.record_page_view(
  p_visitor_id uuid,
  p_event_id bigint,
  p_path text,
  p_load_ms integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_path !~ '^/(|programa|concurso|imagen|stands(/[a-z0-9-]+(/qr)?)?)$'
    or length(p_path) > 200
    or (p_load_ms is not null and (p_load_ms < 0 or p_load_ms > 60000))
  then
    raise exception 'Invalid page analytics input';
  end if;

  if not exists (
    select 1
    from public.events
    where id = p_event_id
      and is_active = true
  ) then
    return;
  end if;

  insert into public.page_analytics as existing (
    event_id,
    visitor_id,
    path,
    views,
    load_ms_total,
    load_samples,
    last_seen_at
  )
  values (
    p_event_id,
    p_visitor_id,
    p_path,
    1,
    coalesce(p_load_ms, 0),
    case when p_load_ms is null then 0 else 1 end,
    now()
  )
  on conflict (event_id, visitor_id, path, visit_date)
  do update set
    views = existing.views + 1,
    load_ms_total = existing.load_ms_total + excluded.load_ms_total,
    load_samples = existing.load_samples + excluded.load_samples,
    last_seen_at = now();
end;
$$;

revoke all on function public.record_page_view(uuid, bigint, text, integer)
  from public, anon, authenticated;
grant execute on function public.record_page_view(uuid, bigint, text, integer)
  to service_role;

create or replace function public.get_page_analytics(
  p_event_id bigint,
  p_since timestamptz default null
)
returns table (
  page_views bigint,
  unique_visitors bigint,
  average_load_ms numeric
)
language sql
security definer
set search_path = ''
as $$
  select
    coalesce(sum(views), 0)::bigint,
    count(distinct visitor_id)::bigint,
    round(
      sum(load_ms_total)::numeric / nullif(sum(load_samples), 0)
    )
  from public.page_analytics
  where event_id = p_event_id
    and (p_since is null or last_seen_at >= p_since);
$$;

revoke all on function public.get_page_analytics(bigint, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_page_analytics(bigint, timestamptz)
  to service_role;
