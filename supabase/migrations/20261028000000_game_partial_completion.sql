create or replace function public.advance_game_image(
  p_attempt_id uuid,
  p_participant_id uuid,
  p_finish boolean
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
  v_found_ids jsonb;
  v_image_index integer;
  v_found_count integer;
  v_total_findings integer;
  v_score integer;
  v_elapsed_ms integer;
  v_now timestamptz := clock_timestamp();
begin
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

  if v_current_image is null then
    raise exception 'The current game image is invalid';
  end if;

  v_found_ids := coalesce(v_current_image -> 'found_ids', '[]'::jsonb);
  v_current_image := jsonb_set(v_current_image, '{found_ids}', v_found_ids);
  v_images := jsonb_set(
    v_images,
    array[v_image_index::text],
    v_current_image
  );

  select coalesce(sum(jsonb_array_length(value -> 'findings')), 0)::integer
  into v_total_findings
  from jsonb_array_elements(v_images);

  if p_finish then
    if v_image_index + 1 < jsonb_array_length(v_images) then
      return jsonb_build_object('status', 'not_last_image');
    end if;

    v_found_count :=
      v_attempt.total_found + jsonb_array_length(v_found_ids);
    v_score := greatest(
      0,
      v_found_count * 100 - greatest(0, v_attempt.mistakes - 3) * 10
    );
    v_elapsed_ms := greatest(
      0,
      round(extract(epoch from (v_now - v_attempt.started_at)) * 1000)::integer
    );

    update public.game_attempts
    set
      images = v_images,
      total_found = v_found_count,
      score = v_score,
      elapsed_ms = v_elapsed_ms,
      finished_at = v_now
    where id = p_attempt_id;

    return jsonb_build_object(
      'status', 'completed',
      'image_index', v_image_index,
      'image_count', jsonb_array_length(v_images),
      'found_count', v_found_count,
      'total', v_total_findings,
      'mistakes', v_attempt.mistakes,
      'score', v_score,
      'elapsed_ms', v_elapsed_ms,
      'images', v_images
    );
  end if;

  if v_image_index + 1 >= jsonb_array_length(v_images) then
    return jsonb_build_object('status', 'last_image');
  end if;

  v_found_count :=
    v_attempt.total_found + jsonb_array_length(v_found_ids);
  v_image_index := v_image_index + 1;
  v_current_image := v_images -> v_image_index;

  update public.game_attempts
  set
    images = v_images,
    current_image_index = v_image_index,
    total_found = v_found_count
  where id = p_attempt_id;

  return jsonb_build_object(
    'status', 'playing',
    'image_changed', true,
    'image_index', v_image_index,
    'image_count', jsonb_array_length(v_images),
    'image_path', v_current_image ->> 'image_path',
    'image_width', (v_current_image ->> 'image_width')::integer,
    'image_height', (v_current_image ->> 'image_height')::integer,
    'found_count', v_found_count,
    'total', v_total_findings,
    'mistakes', v_attempt.mistakes
  );
end;
$$;

revoke all on function public.advance_game_image(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.advance_game_image(uuid, uuid, boolean)
  to service_role;

create or replace function public.close_game_session(p_event_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_closed_attempts integer;
begin
  perform 1
  from public.game_sessions
  where event_id = p_event_id
  for update;

  update public.game_sessions
  set active_session = null, updated_at = v_now
  where event_id = p_event_id;

  update public.game_attempts as attempt
  set
    total_found = attempt.total_found + coalesce(
      jsonb_array_length(
        attempt.images -> attempt.current_image_index -> 'found_ids'
      ),
      0
    ),
    score = greatest(
      0,
      (
        attempt.total_found + coalesce(
          jsonb_array_length(
            attempt.images -> attempt.current_image_index -> 'found_ids'
          ),
          0
        )
      ) * 100 - greatest(0, attempt.mistakes - 3) * 10
    ),
    elapsed_ms = greatest(
      0,
      round(extract(epoch from (v_now - attempt.started_at)) * 1000)::integer
    ),
    finished_at = v_now
  where attempt.event_id = p_event_id
    and attempt.finished_at is null;

  get diagnostics v_closed_attempts = row_count;

  return jsonb_build_object('closed_attempts', v_closed_attempts);
end;
$$;

revoke all on function public.close_game_session(bigint)
  from public, anon, authenticated;
grant execute on function public.close_game_session(bigint)
  to service_role;
