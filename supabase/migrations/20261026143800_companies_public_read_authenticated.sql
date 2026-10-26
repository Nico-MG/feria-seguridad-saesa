grant select on table public.companies to anon, authenticated;

drop policy if exists "Public can read companies" on public.companies;

create policy "Public can read companies"
on public.companies
for select
to anon, authenticated
using (true);
