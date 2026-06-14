alter table public.profiles
add column if not exists parse_status text not null default 'pending',
add column if not exists parsed_at timestamptz,
add column if not exists parser_error text,
add column if not exists ats_score integer not null default 0,
add column if not exists experience_details text,
add column if not exists certifications text,
add column if not exists projects text,
add column if not exists education text,
add column if not exists achievements text,
add column if not exists client_brief text,
add column if not exists cv_text_excerpt text;

do $$
begin
  alter table public.profiles
  add constraint profiles_parse_status_check
  check (parse_status in ('pending', 'processing', 'parsed', 'rejected', 'failed'));
exception
  when duplicate_object then null;
end $$;

alter table public.deleted_profiles
add column if not exists cv_file_name text,
add column if not exists cv_file_path text,
add column if not exists parse_status text not null default 'rejected',
add column if not exists parser_error text,
add column if not exists ats_score integer not null default 0,
add column if not exists experience_details text,
add column if not exists certifications text,
add column if not exists projects text,
add column if not exists education text,
add column if not exists achievements text,
add column if not exists client_brief text,
add column if not exists cv_text_excerpt text;

do $$
begin
  alter table public.deleted_profiles
  add constraint deleted_profiles_parse_status_check
  check (parse_status in ('pending', 'processing', 'parsed', 'rejected', 'failed'));
exception
  when duplicate_object then null;
end $$;

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
      p.client_brief,
      p.cv_text_excerpt,
      p.experience_details,
      p.certifications,
      p.projects,
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
            'safeForClient', true,
            'name', concat('Profile ', profile_number),
            'role', coalesce(role, 'Candidate profile'),
            'location', coalesce(location, 'Location not provided'),
            'experience', coalesce(experience, 'Experience not provided'),
            'skills', coalesce(to_jsonb(skills), '[]'::jsonb),
            'clientBrief', coalesce(nullif(client_brief, ''), 'Candidate profile brief is awaiting CV parsing by the recruitment team.'),
            'summary', coalesce(nullif(client_brief, ''), 'Candidate profile brief is awaiting CV parsing by the recruitment team.'),
            'experienceDetails', coalesce(experience_details, cv_text_excerpt, 'CV parsing is required before detailed work experience can be shown.'),
            'certifications', coalesce(certifications, 'To be confirmed during recruiter review.'),
            'projects', coalesce(projects, 'To be confirmed during recruiter review.'),
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
