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
            'summary', coalesce(experience_details, cv_text_excerpt, 'Professional profile summary is being prepared by the recruitment team.'),
            'experienceDetails', coalesce(experience_details, cv_text_excerpt, 'Experience details will be expanded after recruiter review.'),
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
