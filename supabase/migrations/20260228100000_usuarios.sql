-- Custom usuarios table (replaces Supabase Auth for staff management)
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,        -- plain text for MVP
  nombre text not null,
  apellido text not null,
  telefono text,
  pin text,                      -- 4-digit PIN for POS tablet login
  role text not null default 'admin' check (role in ('super_admin', 'owner', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Disable RLS for MVP
alter table public.usuarios disable row level security;

-- Seed: super admin account
insert into public.usuarios (username, password, nombre, apellido, role, pin)
values ('superadmin', '1234', 'Super', 'Admin', 'super_admin', '0000')
on conflict (username) do nothing;
