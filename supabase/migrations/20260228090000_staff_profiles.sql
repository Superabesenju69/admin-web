-- Staff profiles: links to Supabase auth.users, stores role & PIN for POS login
create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('super_admin', 'owner', 'admin')),
  pin text,            -- 4-digit PIN (plain text for MVP; hash in production)
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger staff_profiles_updated_at
  before update on public.staff_profiles
  for each row execute procedure public.set_updated_at();

-- Disable RLS for MVP
alter table public.staff_profiles disable row level security;

-- Allow realtime (optional, for live user status updates)
alter publication supabase_realtime add table public.staff_profiles;
