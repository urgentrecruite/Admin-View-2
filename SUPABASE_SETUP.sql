create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  linkedin text,
  role text,
  location text,
  experience text,
  expected_salary text,
  skills text[] not null default '{}',
  source text not null default 'cv' check (source in ('cv', 'intent')),
  summary text,
  contact_details text,
  notes text,
  cv_file_name text,
  cv_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shortlist_requests (
  id uuid primary key default gen_random_uuid(),
  organization text not null,
  contact_name text,
  work_email text,
  company_linkedin text,
  industry text,
  job_title text not null,
  years_required text,
  annual_gross_pay numeric,
  job_description text,
  job_specification text,
  generated_brief text,
  job_document_name text,
  job_document_path text,
  viewed boolean not null default false,
  intake_complete boolean not null default false,
  link_shared_count integer not null default 0,
  client_response text,
  payment_status text not null default 'unpaid',
  workflow_state text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.shortlists (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  request_id uuid references public.shortlist_requests(id) on delete set null,
  organization text not null,
  title text not null,
  annual_gross_pay numeric,
  fee_rate numeric not null default 0.005,
  payment_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shortlist_profiles (
  shortlist_id uuid not null references public.shortlists(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  selected_by_client boolean not null default false,
  selected_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (shortlist_id, profile_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_shortlist_requests_updated_at on public.shortlist_requests;
create trigger set_shortlist_requests_updated_at
before update on public.shortlist_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_shortlists_updated_at on public.shortlists;
create trigger set_shortlists_updated_at
before update on public.shortlists
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-cvs',
  'candidate-cvs',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-documents',
  'job-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.shortlist_requests enable row level security;
alter table public.contact_requests enable row level security;
alter table public.shortlists enable row level security;
alter table public.shortlist_profiles enable row level security;

drop policy if exists "Public can submit profiles" on public.profiles;
create policy "Public can submit profiles"
on public.profiles
for insert
to anon
with check (true);

drop policy if exists "Authenticated users can manage profiles" on public.profiles;
create policy "Authenticated users can manage profiles"
on public.profiles
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can submit shortlist requests" on public.shortlist_requests;
create policy "Public can submit shortlist requests"
on public.shortlist_requests
for insert
to anon
with check (true);

drop policy if exists "Authenticated users can manage shortlist requests" on public.shortlist_requests;
create policy "Authenticated users can manage shortlist requests"
on public.shortlist_requests
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can submit contact requests" on public.contact_requests;
create policy "Public can submit contact requests"
on public.contact_requests
for insert
to anon
with check (true);

drop policy if exists "Authenticated users can manage contact requests" on public.contact_requests;
create policy "Authenticated users can manage contact requests"
on public.contact_requests
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage shortlists" on public.shortlists;
create policy "Authenticated users can manage shortlists"
on public.shortlists
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage shortlist profiles" on public.shortlist_profiles;
create policy "Authenticated users can manage shortlist profiles"
on public.shortlist_profiles
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can upload candidate CVs" on storage.objects;
create policy "Public can upload candidate CVs"
on storage.objects
for insert
to anon
with check (bucket_id = 'candidate-cvs');

drop policy if exists "Public can upload job documents" on storage.objects;
create policy "Public can upload job documents"
on storage.objects
for insert
to anon
with check (bucket_id = 'job-documents');

drop policy if exists "Authenticated users can manage candidate CVs" on storage.objects;
create policy "Authenticated users can manage candidate CVs"
on storage.objects
for all
to authenticated
using (bucket_id = 'candidate-cvs')
with check (bucket_id = 'candidate-cvs');

drop policy if exists "Authenticated users can manage job documents" on storage.objects;
create policy "Authenticated users can manage job documents"
on storage.objects
for all
to authenticated
using (bucket_id = 'job-documents')
with check (bucket_id = 'job-documents');

create or replace function public.get_public_shortlist(public_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_build_object(
      'token', s.token,
      'organization', s.organization,
      'title', s.title,
      'annualGrossPay', s.annual_gross_pay,
      'feeRate', s.fee_rate,
      'profiles', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'name', p.full_name,
            'role', coalesce(p.role, 'Candidate profile'),
            'location', coalesce(p.location, 'Location not provided'),
            'experience', coalesce(p.experience, 'Experience not provided'),
            'skills', coalesce(to_jsonb(p.skills), '[]'::jsonb),
            'summary', coalesce(p.summary, 'Relevant experience summary is being prepared.'),
            'notes', 'Contact details are hidden until payment is confirmed.'
          )
        ) filter (where p.id is not null),
        '[]'::jsonb
      )
    ),
    '{}'::jsonb
  )
  from public.shortlists s
  left join public.shortlist_profiles sp on sp.shortlist_id = s.id
  left join public.profiles p on p.id = sp.profile_id
  where s.token = public_token
  group by s.id;
$$;

grant execute on function public.get_public_shortlist(text) to anon;
grant execute on function public.get_public_shortlist(text) to authenticated;
