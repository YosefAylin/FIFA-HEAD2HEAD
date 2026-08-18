-- ============================================================
-- Avatar storage bucket + open access policies
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public avatar select" on storage.objects;
create policy "Public avatar select" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Public avatar insert" on storage.objects;
create policy "Public avatar insert" on storage.objects
  for insert with check (bucket_id = 'avatars');

drop policy if exists "Public avatar update" on storage.objects;
create policy "Public avatar update" on storage.objects
  for update using (bucket_id = 'avatars');

drop policy if exists "Public avatar delete" on storage.objects;
create policy "Public avatar delete" on storage.objects
  for delete using (bucket_id = 'avatars');
