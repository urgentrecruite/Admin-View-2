alter table public.profiles
add column if not exists word_count integer not null default 0;

create table if not exists public.deleted_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  linkedin text,
  role text,
  location text,
  experience text,
  source text not null default 'cv' check (source in ('cv', 'intent')),
  summary text,
  word_count integer not null default 0,
  contact_details text,
  notes text,
  deletion_reason text not null default 'Deleted from admin',
  deleted_at timestamptz not null default now(),
  delete_after timestamptz not null default (now() + interval '90 days')
);

create table if not exists public.request_profiles (
  request_id uuid not null references public.shortlist_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  pushed_at timestamptz not null default now(),
  primary key (request_id, profile_id)
);

alter table public.deleted_profiles enable row level security;
alter table public.request_profiles enable row level security;

drop policy if exists "Public can submit deleted profiles" on public.deleted_profiles;
create policy "Public can submit deleted profiles"
on public.deleted_profiles
for insert
to anon
with check (true);

drop policy if exists "Authenticated users can manage deleted profiles" on public.deleted_profiles;
create policy "Authenticated users can manage deleted profiles"
on public.deleted_profiles
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage request profiles" on public.request_profiles;
create policy "Authenticated users can manage request profiles"
on public.request_profiles
for all
to authenticated
using (true)
with check (true);

create or replace function public.purge_expired_deleted_profiles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.deleted_profiles
  where delete_after <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.get_public_shortlist(public_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with ranked_profiles as (
    select
      s.id as shortlist_id,
      s.token,
      s.organization,
      s.title,
      s.annual_gross_pay,
      s.fee_rate,
      p.id as profile_id,
      p.role,
      p.location,
      p.experience,
      p.skills,
      p.summary,
      row_number() over (partition by s.id order by sp.created_at, p.created_at) as profile_number
    from public.shortlists s
    left join public.shortlist_profiles sp on sp.shortlist_id = s.id
    left join public.profiles p on p.id = sp.profile_id
    where s.token = public_token
  )
  select coalesce(
    jsonb_build_object(
      'token', token,
      'organization', organization,
      'title', title,
      'annualGrossPay', annual_gross_pay,
      'feeRate', fee_rate,
      'profiles', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', profile_id,
            'name', concat('Profile ', profile_number),
            'role', coalesce(role, 'Candidate profile'),
            'location', coalesce(location, 'Location not provided'),
            'experience', coalesce(experience, 'Experience not provided'),
            'skills', coalesce(to_jsonb(skills), '[]'::jsonb),
            'summary', coalesce(summary, 'Relevant experience summary is being prepared.'),
            'experienceDetails', coalesce(summary, 'Experience details will be expanded after recruiter review.'),
            'certifications', 'To be confirmed during recruiter review.',
            'projects', 'To be confirmed during recruiter review.',
            'notes', 'Contact details are hidden until payment is confirmed.'
          )
        ) filter (where profile_id is not null),
        '[]'::jsonb
      )
    ),
    '{}'::jsonb
  )
  from ranked_profiles
  group by shortlist_id, token, organization, title, annual_gross_pay, fee_rate;
$$;

grant execute on function public.get_public_shortlist(text) to anon;
grant execute on function public.get_public_shortlist(text) to authenticated;
grant execute on function public.purge_expired_deleted_profiles() to authenticated;
