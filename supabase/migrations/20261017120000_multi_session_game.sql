alter table public.game_settings
  add column if not exists images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(images) = 'array');

update public.game_settings
set images = jsonb_build_array(
  jsonb_build_object(
    'id', 'legacy-' || event_id::text,
    'image_path', image_path,
    'image_width', image_width,
    'image_height', image_height,
    'findings', findings
  )
)
where jsonb_array_length(images) = 0;

create table if not exists public.game_sessions (
  event_id bigint primary key references public.events(id) on delete cascade,
  active_session text check (
    active_session is null or active_session in ('morning', 'afternoon')
  ),
  updated_at timestamptz not null default now()
);

alter table public.game_sessions enable row level security;
revoke all on public.game_sessions from anon, authenticated;

alter table public.game_attempts
  add column if not exists session_name text not null default 'morning'
    check (session_name in ('morning', 'afternoon')),
  add column if not exists images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(images) = 'array'),
  add column if not exists current_image_index integer not null default 0
    check (current_image_index >= 0),
  add column if not exists total_found integer not null default 0
    check (total_found >= 0);

update public.game_attempts
set images = jsonb_build_array(
  jsonb_build_object(
    'image_path', image_path,
    'image_width', image_width,
    'image_height', image_height,
    'findings', findings,
    'found_ids', found_ids
  )
)
where jsonb_array_length(images) = 0;

alter table public.game_attempts
  drop constraint if exists game_attempts_event_id_participant_id_key;

alter table public.game_attempts
  drop constraint if exists game_attempts_one_per_participant;

alter table public.game_attempts
  add constraint game_attempts_one_per_participant_session
    unique (event_id, participant_id, session_name);

drop function if exists public.submit_game_click(
  uuid,
  uuid,
  double precision,
  double precision
);

create function public.submit_game_click(
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
  v_images jsonb;
  v_current_image jsonb;
  v_finding jsonb;
  v_hit_id text;
  v_found_ids jsonb;
  v_found_count integer;
  v_image_index integer;
  v_total integer;
  v_total_findings integer := 0;
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

  v_images := v_attempt.images;
  v_image_index := v_attempt.current_image_index;
  v_current_image := v_images -> v_image_index;
  v_found_ids := coalesce(v_current_image -> 'found_ids', '[]'::jsonb);
  v_mistakes := v_attempt.mistakes;
  v_total := jsonb_array_length(v_current_image -> 'findings');
  select coalesce(sum(jsonb_array_length(value -> 'findings')), 0)::integer
  into v_total_findings
  from jsonb_array_elements(v_images);
  v_hit_id := null;

  for v_finding in
    select value
    from jsonb_array_elements(v_current_image -> 'findings')
  loop
    if not (v_found_ids @> jsonb_build_array(v_finding ->> 'id'))
      and sqrt(
        power(p_x - (v_finding ->> 'x')::double precision, 2)
        + power(
          (p_y - (v_finding ->> 'y')::double precision)
            * (v_current_image ->> 'image_height')::double precision
            / (v_current_image ->> 'image_width')::double precision,
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
  v_current_image := jsonb_set(v_current_image, '{found_ids}', v_found_ids);
  v_images := jsonb_set(
    v_images,
    array[v_image_index::text],
    v_current_image
  );

  if v_found_count = v_total then
    if v_image_index + 1 < jsonb_array_length(v_images) then
      v_image_index := v_image_index + 1;
      v_current_image := v_images -> v_image_index;
      update public.game_attempts
      set
        images = v_images,
        current_image_index = v_image_index,
        total_found = total_found + v_total,
        mistakes = v_mistakes
      where id = p_attempt_id;

      return jsonb_build_object(
        'status', 'playing',
        'hit', v_hit_id is not null,
        'image_changed', true,
        'image_index', v_image_index,
        'image_count', jsonb_array_length(v_images),
        'image_path', v_current_image ->> 'image_path',
        'image_width', (v_current_image ->> 'image_width')::integer,
        'image_height', (v_current_image ->> 'image_height')::integer,
        'found_count', v_attempt.total_found + v_total,
        'total', v_total_findings,
        'mistakes', v_mistakes
      );
    end if;

    v_score := greatest(
      0,
      v_total_findings * 100 - greatest(0, v_mistakes - 3) * 10
    );
    v_elapsed_ms := greatest(
      0,
      round(extract(epoch from (v_now - v_attempt.started_at)) * 1000)::integer
    );

    update public.game_attempts
    set
      images = v_images,
      current_image_index = v_image_index,
      total_found = total_found + v_total,
      mistakes = v_mistakes,
      score = v_score,
      elapsed_ms = v_elapsed_ms,
      finished_at = v_now
    where id = p_attempt_id;

    return jsonb_build_object(
      'status', 'completed',
      'hit', v_hit_id is not null,
      'image_changed', false,
      'image_index', v_image_index,
      'image_count', jsonb_array_length(v_images),
      'found_count', v_attempt.total_found + v_total,
      'total', v_total_findings,
      'mistakes', v_mistakes,
      'score', v_score,
      'elapsed_ms', v_elapsed_ms,
      'images', v_images
    );
  end if;

  update public.game_attempts
  set
    images = v_images,
    mistakes = v_mistakes
  where id = p_attempt_id;

  return jsonb_build_object(
    'status', 'playing',
    'hit', v_hit_id is not null,
    'image_changed', false,
    'image_index', v_image_index,
    'image_count', jsonb_array_length(v_images),
    'found_count', v_attempt.total_found + v_found_count,
    'total', v_total_findings,
    'mistakes', v_mistakes
  );
end;
$$;

revoke all on function public.submit_game_click(uuid, uuid, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.submit_game_click(uuid, uuid, double precision, double precision)
  to service_role;
