alter table public.stands
  add column if not exists map_x numeric,
  add column if not exists map_y numeric,
  add column if not exists map_width numeric,
  add column if not exists map_height numeric;

alter table public.stands
  add constraint stands_map_area_valid
  check (
    (
      map_x is null
      and map_y is null
      and map_width is null
      and map_height is null
    )
    or
    (
      map_x is not null
      and map_y is not null
      and map_width is not null
      and map_height is not null
      and
      map_x between 0 and 100
      and map_y between 0 and 100
      and map_width > 0
      and map_height > 0
      and map_x + map_width <= 100
      and map_y + map_height <= 100
    )
  );
