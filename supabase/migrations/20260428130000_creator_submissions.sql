create table if not exists public.creator_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  profile_id uuid null references public.profiles(id) on delete set null,
  device_id text null,
  video_url text not null,
  contact_type text not null,
  contact_value text not null,
  status text not null default 'pending',
  admin_note text null,
  is_winner boolean not null default false,
  prize_amount numeric(10,2) null,
  reviewed_at timestamptz null,
  paid_at timestamptz null,
  constraint creator_submissions_contact_type_check
    check (contact_type in ('email', 'instagram', 'tiktok', 'other')),
  constraint creator_submissions_status_check
    check (status in ('pending', 'selected', 'not_selected', 'paid', 'rejected')),
  constraint creator_submissions_video_url_length_check
    check (char_length(video_url) <= 500),
  constraint creator_submissions_contact_value_length_check
    check (char_length(contact_value) <= 120)
);

create index if not exists creator_submissions_profile_id_created_at_idx
  on public.creator_submissions (profile_id, created_at desc);

create index if not exists creator_submissions_device_id_created_at_idx
  on public.creator_submissions (device_id, created_at desc);

create or replace function public.set_creator_submissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_creator_submissions_updated_at on public.creator_submissions;
create trigger set_creator_submissions_updated_at
before update on public.creator_submissions
for each row
execute function public.set_creator_submissions_updated_at();

alter table public.creator_submissions enable row level security;

drop policy if exists "creator_submissions_anon_insert" on public.creator_submissions;
create policy "creator_submissions_anon_insert"
on public.creator_submissions
for insert
to anon
with check (
  char_length(video_url) between 1 and 500
  and char_length(contact_value) between 1 and 120
  and contact_type in ('email', 'instagram', 'tiktok', 'other')
  and status = 'pending'
);

-- Public select is intentionally disabled. Creator submission statuses are for admin use only.
