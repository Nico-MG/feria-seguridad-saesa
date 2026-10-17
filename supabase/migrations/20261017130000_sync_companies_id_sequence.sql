do $$
declare
  v_sequence text;
  v_max_id bigint;
begin
  v_sequence := pg_get_serial_sequence('public.companies', 'id');
  if v_sequence is null then
    raise exception 'No se encontró una secuencia asociada a public.companies.id';
  end if;

  select coalesce(max(id), 0)::bigint
  into v_max_id
  from public.companies;

  perform setval(v_sequence::regclass, greatest(v_max_id, 1), v_max_id > 0);
end;
$$;
