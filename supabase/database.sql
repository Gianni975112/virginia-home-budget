-- ============================================================
-- Virginia Home Budget — Schema Supabase
-- ============================================================
-- PRIMA DI ESEGUIRE:
--   Sostituisci le due email demo con le vostre email reali:
--     morroneg_2015@virgilio.it
--     claudia.carbone1@uniba.it
-- ============================================================

create extension if not exists pgcrypto;

-- ── Tabelle ─────────────────────────────────────────────────

create table if not exists public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists public.family_members (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  name       text not null,
  role       text not null check (role in ('adult', 'child')),
  birth_year int,
  created_at timestamptz default now()
);

create table if not exists public.family_users (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  user_id       uuid unique,
  display_name  text not null,
  allowed_email text not null,
  created_at    timestamptz default now()
);

create table if not exists public.expenses (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families(id) on delete cascade,
  payer_user_id     uuid not null,
  expense_date      date not null,
  month_key         text not null,
  category          text not null,
  description       text,
  amount            numeric(12,2) not null check (amount > 0),
  split_mode        text not null check (split_mode in ('equal_adults','gianni_only','claudia_only','custom')),
  custom_gianni_pct numeric(5,2),
  beneficiaries     jsonb not null default '[]'::jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── RLS ─────────────────────────────────────────────────────

alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.family_users   enable row level security;
alter table public.expenses       enable row level security;

-- families
drop policy if exists "families_select" on public.families;
create policy "families_select" on public.families for select
using (
  exists (select 1 from public.family_users fu
          where fu.family_id = families.id and fu.user_id = auth.uid())
);

-- family_members
drop policy if exists "family_members_select" on public.family_members;
create policy "family_members_select" on public.family_members for select
using (
  exists (select 1 from public.family_users fu
          where fu.family_id = family_members.family_id and fu.user_id = auth.uid())
);

-- family_users: lettura (incluso user_id null per attivazione)
drop policy if exists "family_users_select" on public.family_users;
create policy "family_users_select" on public.family_users for select
using (
  user_id is null
  or exists (select 1 from public.family_users fu
             where fu.family_id = family_users.family_id and fu.user_id = auth.uid())
);

-- family_users: update per attivazione account
drop policy if exists "family_users_activate" on public.family_users;
create policy "family_users_activate" on public.family_users for update
using (
  allowed_email = (select email from auth.users where id = auth.uid())
  and user_id is null
)
with check (user_id = auth.uid());

-- expenses
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses for select
using (
  exists (select 1 from public.family_users fu
          where fu.family_id = expenses.family_id and fu.user_id = auth.uid())
);

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses for insert
with check (
  exists (select 1 from public.family_users fu
          where fu.family_id = expenses.family_id and fu.user_id = auth.uid())
);

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses for update
using (
  exists (select 1 from public.family_users fu
          where fu.family_id = expenses.family_id and fu.user_id = auth.uid())
)
with check (
  exists (select 1 from public.family_users fu
          where fu.family_id = expenses.family_id and fu.user_id = auth.uid())
);

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses for delete
using (
  exists (select 1 from public.family_users fu
          where fu.family_id = expenses.family_id and fu.user_id = auth.uid())
);

-- ── Realtime ─────────────────────────────────────────────────

alter publication supabase_realtime add table public.expenses;

-- ── Seed: famiglia, membri, utenti autorizzati ───────────────

with new_family as (
  insert into public.families (name)
  values ('Famiglia Virginia')
  returning id
)
insert into public.family_members (family_id, name, role, birth_year)
select id, 'Gianni',   'adult', null from new_family
union all
select id, 'Claudia',  'adult', null from new_family
union all
select id, 'Virginia', 'child', 2020 from new_family;

insert into public.family_users (family_id, display_name, allowed_email)
select f.id, 'Gianni',  'gianni@example.com'
from public.families f where f.name = 'Famiglia Virginia' limit 1;

insert into public.family_users (family_id, display_name, allowed_email)
select f.id, 'Claudia', 'claudia@example.com'
from public.families f where f.name = 'Famiglia Virginia' limit 1;

-- ============================================================
-- Dopo l'esecuzione:
--   1. Authentication → URL Configuration → Site URL = http://localhost:5173
--   2. Redirect URLs = http://localhost:5173/**
--   3. npm install && npm run dev
--   4. Gianni accede → "Attiva accesso"
--   5. Claudia accede → "Attiva accesso"
-- ============================================================
