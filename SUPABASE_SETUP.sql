-- ============================================================
-- TOYO FOODS · APP VISITAS V3.2
-- Configuración NO destructiva para Supabase
-- Ejecutar en: Supabase > SQL Editor > New query > Run
-- Role recomendado: postgres
-- ============================================================

-- 1) TABLA PRINCIPAL DE VISITAS
create table if not exists public.visits (
  id text primary key,
  created_at timestamptz default now(),
  day date,
  city text,
  vendor text,
  client text,
  type text,
  notes text,
  start_ts timestamptz,
  end_ts timestamptz,
  duration_sec integer,
  start_lat double precision,
  start_lng double precision,
  end_lat double precision,
  end_lng double precision
);

-- Si la tabla ya existía, asegura las columnas que usa el index.html.
alter table public.visits
  add column if not exists created_at timestamptz default now(),
  add column if not exists day date,
  add column if not exists city text,
  add column if not exists vendor text,
  add column if not exists client text,
  add column if not exists type text,
  add column if not exists notes text,
  add column if not exists start_ts timestamptz,
  add column if not exists end_ts timestamptz,
  add column if not exists duration_sec integer,
  add column if not exists start_lat double precision,
  add column if not exists start_lng double precision,
  add column if not exists end_lat double precision,
  add column if not exists end_lng double precision;

-- Convierte id a text si la tabla vieja lo tenía como bigint/integer.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='visits'
      and column_name='id'
      and data_type <> 'text'
  ) then
    alter table public.visits alter column id drop default;
    alter table public.visits alter column id type text using id::text;
  end if;
end $$;

-- Índices para filtros de Admin / historial.
create index if not exists visits_day_idx on public.visits(day);
create index if not exists visits_city_idx on public.visits(city);
create index if not exists visits_vendor_idx on public.visits(vendor);
create index if not exists visits_start_ts_idx on public.visits(start_ts);

-- 2) TABLA DE COMUNICADOS (queda preparada para mensajes futuros).
create table if not exists public.announcements (
  id text primary key,
  created_at timestamptz default now(),
  day date default current_date,
  active boolean default true,
  city text default 'ALL',
  vendor text default 'ALL',
  title text,
  body text
);

alter table public.announcements
  add column if not exists created_at timestamptz default now(),
  add column if not exists day date default current_date,
  add column if not exists active boolean default true,
  add column if not exists city text default 'ALL',
  add column if not exists vendor text default 'ALL',
  add column if not exists title text,
  add column if not exists body text;

create index if not exists announcements_created_at_idx on public.announcements(created_at desc);
create index if not exists announcements_day_idx on public.announcements(day);

-- 3) MODO SIMPLE PARA GITHUB PAGES + PUBLISHABLE KEY
-- La app actual no usa Supabase Auth para las llamadas REST.
-- Por eso se deja RLS apagado y se dan permisos a anon/authenticated.
alter table public.visits disable row level security;
alter table public.announcements disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.visits to anon, authenticated;
grant select, insert, update, delete on table public.announcements to anon, authenticated;

-- 4) VERIFICACIÓN RÁPIDA
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='visits'
order by ordinal_position;
