-- Create private storage buckets for file uploads.
-- file_size_limit is in bytes.
-- allowed_mime_types is enforced by Supabase Storage before any server-side code runs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'  -- some browsers send this for PDF/DOC
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'screenshots',
  'screenshots',
  false,
  5242880, -- 5 MB (before compression)
  array[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS policies: authenticated users (admins) can manage both buckets.
-- Service-role operations bypass these policies, so they are only needed
-- for the client-side signed-URL flow.

-- Resumes
create policy "auth_resumes_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resumes');

create policy "auth_resumes_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resumes');

create policy "auth_resumes_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resumes');

-- Screenshots
create policy "auth_screenshots_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'screenshots');

create policy "auth_screenshots_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'screenshots');

create policy "auth_screenshots_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'screenshots');
