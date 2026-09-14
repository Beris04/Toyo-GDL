-- Solo usar si la tabla announcements no existe todavía.
create table if not exists public.announcements (
  id text primary key,
  created_at timestamptz default now(),
  day text,
  active boolean default true,
  city text,
  vendor text,
  title text,
  body text
);

-- La tabla visits debe conservar la estructura que ya usa App Visitas.
-- Si ya funciona el registro Cloud actual, NO es necesario ejecutar nada.
