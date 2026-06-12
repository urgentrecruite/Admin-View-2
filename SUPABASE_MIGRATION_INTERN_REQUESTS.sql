-- Run this after the original setup SQL.
-- It upgrades public client links so paid shortlists stay anonymous,
-- while free intern shortlists can show full non-contact intern profiles.

alter table public.profiles
add column if not exists cv_file_name text,
add column if not exists cv_file_path text,
add column if not exists parse_status text not null default 'pending',
add column if not exists parser_error text,
add column if not exists ats_score integer not null default 0,
add column if not exists experience_details text,
add column if not exists certifications text,
add column if not exists projects text,
add column if not exists education text,
add column if not exists achievements text,
add column if not exists cv_text_excerpt text;

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
      s.payment_complete,
      case
        when r.payment_status = 'free_intern' or s.fee_rate = 0 then 'intern'
        else 'standard'
      end as access_mode,
      r.work_email as client_email,
      p.id as profile_id,
      p.role,
      p.location,
      p.experience,
      p.skills,
      p.summary,
      p.cv_text_excerpt,
      p.experience_details,
      p.certifications,
      p.projects,
      p.education,
      p.achievements,
      row_number() over (partition by s.id order by sp.created_at, p.created_at) as profile_number
    from public.shortlists s
    left join public.shortlist_requests r on r.id = s.request_id
    left join public.shortlist_profiles sp on sp.shortlist_id = s.id
    left join public.profiles p on p.id = sp.profile_id
    where s.token = public_token
  )
  select coalesce(
    jsonb_build_object(
      'token', token,
      'accessMode', access_mode,
      'clientEmail', coalesce(client_email, ''),
      'organization', organization,
      'title', title,
      'annualGrossPay', annual_gross_pay,
      'feeRate', case when access_mode = 'intern' then 0 else fee_rate end,
      'paymentComplete', case when access_mode = 'intern' then true else payment_complete end,
      'profiles', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', profile_id,
            'safeForClient', true,
            'accessMode', access_mode,
            'fullProfileAvailable', access_mode = 'intern',
            'name', case
              when access_mode = 'intern' then concat('Intern Profile ', profile_number)
              else concat('Profile ', profile_number)
            end,
            'role', coalesce(role, 'Candidate profile'),
            'location', coalesce(location, 'Location not provided'),
            'experience', coalesce(experience, 'Experience not provided'),
            'skills', coalesce(to_jsonb(skills), '[]'::jsonb),
            'summary', case
              when access_mode = 'intern' then coalesce(experience_details, cv_text_excerpt, 'CV parsing is required before a complete redacted profile brief can be shown.')
              else coalesce(experience_details, cv_text_excerpt, 'CV parsing is required before a complete redacted profile brief can be shown.')
            end,
            'experienceDetails', case
              when access_mode = 'intern' then coalesce(experience_details, cv_text_excerpt, 'CV parsing is required before detailed work experience can be shown.')
              else coalesce(experience_details, cv_text_excerpt, 'CV parsing is required before detailed work experience can be shown.')
            end,
            'certifications', coalesce(certifications, 'To be confirmed during recruiter review.'),
            'projects', coalesce(projects, 'To be confirmed during recruiter review.'),
            'education', coalesce(education, ''),
            'achievements', coalesce(achievements, ''),
            'contact', 'Contact details are handled by Urgent Recruite.',
            'cvFileName', '',
            'cvFilePath', '',
            'notes', case
              when access_mode = 'intern' then 'Full intern profile shared for organization review. Direct candidate contact details are handled by Urgent Recruite.'
              else 'Contact details are hidden until payment is confirmed.'
            end
          )
        ) filter (where profile_id is not null),
        '[]'::jsonb
      )
    ),
    '{}'::jsonb
  )
  from ranked_profiles
  group by shortlist_id, token, access_mode, client_email, organization, title, annual_gross_pay, fee_rate, payment_complete;
$$;

grant execute on function public.get_public_shortlist(text) to anon;
grant execute on function public.get_public_shortlist(text) to authenticated;
