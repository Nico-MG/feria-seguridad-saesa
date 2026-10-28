grant select on table public.contest_entries to authenticated;

create policy "Participants can read own contest entries"
  on public.contest_entries
  for select
  to authenticated
  using (participant_id = auth.uid());
