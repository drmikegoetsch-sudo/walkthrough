-- Storage policies for the two public buckets.
-- Run after buckets `floor-plans` and `inspection-photos` exist.
-- Public read is already handled by marking the buckets public in the dashboard.
-- Authenticated users can write to either bucket.

drop policy if exists "Authenticated can upload floor plans" on storage.objects;
create policy "Authenticated can upload floor plans"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'floor-plans');

drop policy if exists "Authenticated can update their floor plans" on storage.objects;
create policy "Authenticated can update their floor plans"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'floor-plans');

drop policy if exists "Authenticated can delete their floor plans" on storage.objects;
create policy "Authenticated can delete their floor plans"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'floor-plans');

drop policy if exists "Authenticated can upload inspection photos" on storage.objects;
create policy "Authenticated can upload inspection photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'inspection-photos');

drop policy if exists "Authenticated can update inspection photos" on storage.objects;
create policy "Authenticated can update inspection photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'inspection-photos');

drop policy if exists "Authenticated can delete inspection photos" on storage.objects;
create policy "Authenticated can delete inspection photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'inspection-photos');
