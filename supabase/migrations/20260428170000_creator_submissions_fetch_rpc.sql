create or replace function public.fetch_creator_submissions_for_device(
  p_device_id text,
  p_profile_id uuid default null
)
returns table (
  id uuid,
  created_at timestamptz,
  video_url text,
  contact_type text,
  contact_value text,
  status text
)
language sql
security definer
set search_path = public
as $$
  select
    cs.id,
    cs.created_at,
    cs.video_url,
    cs.contact_type,
    cs.contact_value,
    cs.status
  from public.creator_submissions cs
  where
    (
      p_device_id is not null
      and length(trim(p_device_id)) >= 8
      and cs.device_id = trim(p_device_id)
    )
    or (
      p_profile_id is not null
      and cs.profile_id = p_profile_id
    )
  order by cs.created_at desc
  limit 50;
$$;

revoke all on function public.fetch_creator_submissions_for_device(text, uuid) from public;
grant execute on function public.fetch_creator_submissions_for_device(text, uuid) to anon;
