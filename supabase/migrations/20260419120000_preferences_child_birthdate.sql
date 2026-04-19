-- Add optional child date of birth; keep child_age for legacy clients and fallback rows.
alter table public.preferences
  add column if not exists child_birthdate date null;

comment on column public.preferences.child_birthdate is 'Child DOB for precise age; child_age remains legacy fallback until fully migrated.';
