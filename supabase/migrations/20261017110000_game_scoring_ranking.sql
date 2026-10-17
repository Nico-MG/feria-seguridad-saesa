alter table public.game_settings
  add column if not exists image_width integer not null default 1600
    check (image_width > 0),
  add column if not exists image_height integer not null default 900
    check (image_height > 0);

revoke all on public.game_settings from anon, authenticated;
drop policy if exists "Public can read active event game" on public.game_settings;

create table if not exists public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id bigint not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  image_path text not null,
  findings jsonb not null check (jsonb_typeof(findings) = 'array'),
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  found_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(found_ids) = 'array'),
  mistakes integer not null default 0 check (mistakes >= 0),
  score integer check (score is null or score >= 0),
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint game_attempts_one_per_participant
    unique (event_id, participant_id),
  constraint game_attempts_completion_fields
    check (
      (finished_at is null and score is null and elapsed_ms is null)
      or
      (finished_at is not null and score is not null and elapsed_ms is not null)
    )
);

alter table public.game_attempts enable row level security;
revoke all on public.game_attempts from anon, authenticated;

create or replace function public.submit_game_click(
  p_attempt_id uuid,
  p_participant_id uuid,
  p_x double precision,
  p_y double precision
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.game_attempts%rowtype;
  v_finding jsonb;
  v_hit_id text;
  v_found_ids jsonb;
  v_found_count integer;
  v_total integer;
  v_mistakes integer;
  v_score integer;
  v_elapsed_ms integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_x < 0 or p_x > 1 or p_y < 0 or p_y > 1 then
    raise exception 'Click coordinates must be between 0 and 1';
  end if;

  select *
  into v_attempt
  from public.game_attempts
  where id = p_attempt_id
    and participant_id = p_participant_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_attempt.finished_at is not null then
    return jsonb_build_object('status', 'already_finished');
  end if;

  v_found_ids := v_attempt.found_ids;
  v_mistakes := v_attempt.mistakes;
  v_total := jsonb_array_length(v_attempt.findings);
  v_hit_id := null;

  for v_finding in
    select value
    from jsonb_array_elements(v_attempt.findings)
  loop
    if not (v_found_ids @> jsonb_build_array(v_finding ->> 'id'))
      and sqrt(
        power(p_x - (v_finding ->> 'x')::double precision, 2)
        + power(
          (p_y - (v_finding ->> 'y')::double precision)
            * v_attempt.image_height::double precision
            / v_attempt.image_width::double precision,
          2
        )
      ) <= (v_finding ->> 'radius')::double precision
    then
      v_hit_id := v_finding ->> 'id';
      v_found_ids := v_found_ids || jsonb_build_array(v_hit_id);
      exit;
    end if;
  end loop;

  if v_hit_id is null then
    v_mistakes := v_mistakes + 1;
  end if;

  v_found_count := jsonb_array_length(v_found_ids);

  if v_found_count = v_total then
    v_score := greatest(
      0,
      v_total * 100 - greatest(0, v_mistakes - 3) * 10
    );
    v_elapsed_ms := greatest(
      0,
      round(extract(epoch from (v_now - v_attempt.started_at)) * 1000)::integer
    );

    update public.game_attempts
    set
      found_ids = v_found_ids,
      mistakes = v_mistakes,
      score = v_score,
      elapsed_ms = v_elapsed_ms,
      finished_at = v_now
    where id = p_attempt_id;

    return jsonb_build_object(
      'status', 'completed',
      'hit', v_hit_id is not null,
      'found_count', v_found_count,
      'total', v_total,
      'mistakes', v_mistakes,
      'score', v_score,
      'elapsed_ms', v_elapsed_ms,
      'findings', v_attempt.findings
    );
  end if;

  update public.game_attempts
  set
    found_ids = v_found_ids,
    mistakes = v_mistakes
  where id = p_attempt_id;

  return jsonb_build_object(
    'status', 'playing',
    'hit', v_hit_id is not null,
    'found_count', v_found_count,
    'total', v_total,
    'mistakes', v_mistakes
  );
end;
$$;

revoke all on function public.submit_game_click(uuid, uuid, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.submit_game_click(uuid, uuid, double precision, double precision)
  to service_role;
