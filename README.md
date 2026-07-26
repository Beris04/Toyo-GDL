# Configuración de Supabase para la app de Visitas (build v3.4)

Esta guía es para que actives, en tu proyecto de Supabase, los dos cambios más
importantes que se hicieron al código: **login real por vendedor** (ya no hay
una contraseña compartida escrita en el archivo) y **vendedores administrables
desde una tabla** (ya no hay que editar el HTML para dar de alta/baja gente).

No necesitas tocar código para nada de esto: todo se hace desde el panel de
Supabase (supabase.com/dashboard → tu proyecto).

---

## 1) Crear las tablas y sus reglas de seguridad (RLS)

Ve a **SQL Editor** en Supabase, pega esto y ejecútalo. Ajusta el nombre
`visits` si tu tabla de visitas ya existente se llama distinto.

```sql
-- ============================================================
-- Tabla de vendedores (reemplaza la lista fija que antes vivía
-- en el JavaScript). Aquí das de alta/baja gente sin tocar código.
-- ============================================================
create table if not exists public.vendors (
  id bigint generated always as identity primary key,
  city text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

create policy "vendors_select_authenticated"
on public.vendors for select
to authenticated
using (true);

-- La app necesita mostrar la lista de nombres en la pantalla de login ANTES
-- de que la persona inicie sesión, así que esta tabla también debe poder
-- leerse sin sesión (nombres y ciudad, nada sensible: ya viajaban así en el
-- código anterior, con la diferencia de que antes iban fijos en el HTML).
create policy "vendors_select_anon"
on public.vendors for select
to anon
using (true);

-- No hace falta política de INSERT/UPDATE aquí: solo tú (desde el
-- Table Editor de Supabase, con tu propia sesión de administrador
-- del proyecto) darás de alta vendedores. La app nunca escribe en
-- esta tabla, solo la lee.


-- ============================================================
-- Tabla de perfiles: conecta cada cuenta de acceso (Supabase Auth)
-- con su rol, ciudad y nombre de vendedor.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','seller')),
  city text,
  vendor text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());


-- ============================================================
-- Reglas de la tabla de visitas: cada vendedor solo ve/inserta
-- SUS visitas; el admin ve y filtra todo.
-- ============================================================
alter table public.visits enable row level security;

create policy "visits_select_own_or_admin"
on public.visits for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or p.vendor = visits.vendor)
  )
);

create policy "visits_insert_own_or_admin"
on public.visits for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or p.vendor = visits.vendor)
  )
);


-- ============================================================
-- Reglas de la tabla de anuncios (comunicados). Todos los
-- autenticados pueden leer; solo el admin publica/borra.
-- ============================================================
alter table public.announcements enable row level security;

create policy "announcements_select_authenticated"
on public.announcements for select
to authenticated
using (true);

create policy "announcements_write_admin_only"
on public.announcements for all
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
```

> ⚠️ Antes de correrlo, revisa si `visits` y `announcements` ya tenían otras
> políticas RLS creadas por ti o por ChatGPT. Si es así, bórralas primero
> (Supabase → Authentication → Policies) para que no queden políticas viejas
> conflictuando con las nuevas.

---

## 2) Dar de alta a cada vendedor como usuario real

La app sigue mostrando **el nombre del vendedor** en el login, como antes —
eso no cambió. Lo que cambió por dentro es que, al elegir su nombre, la app
ahora calcula un **correo interno** para verificar la contraseña de esa
persona en Supabase (nadie lo ve ni lo escribe, es solo un identificador de
cuenta). Se genera siempre igual, a partir del nombre:

```
"Javier Espinosa Olivares"  →  javier.espinosa.olivares@toyofoods.local
```

(minúsculas, sin acentos, espacios convertidos en puntos, dominio fijo
`@toyofoods.local`).

Para que el login funcione, cada cuenta que crees en **Authentication → Users
→ Add user** debe usar exactamente ese correo. Aquí está la tabla ya generada
para tu lista actual de vendedores, lista para copiar y pegar uno por uno (o
usa "Auto Confirm User" al crearlos para que no pidan confirmación por
correo — de todas formas son correos internos, no buzones reales):

| Ciudad | Nombre (como aparece en la app) | Correo interno para Supabase Auth |
|---|---|---|
| — | Admin | admin@toyofoods.local |
| CDMX | David Adrian Hernández Guzmán | david.adrian.hernandez.guzman@toyofoods.local |
| CDMX | Javier Espinosa Olivares | javier.espinosa.olivares@toyofoods.local |
| CDMX | Ricardo Gutierrez Bandera | ricardo.gutierrez.bandera@toyofoods.local |
| CDMX | Abraham Rene Valdes Gonzales | abraham.rene.valdes.gonzales@toyofoods.local |
| CDMX | Jesus Antonio Ramirez Rivera | jesus.antonio.ramirez.rivera@toyofoods.local |
| CDMX | Sergio Servin Rivera | sergio.servin.rivera@toyofoods.local |
| CDMX | Eduardo Faustino Hernandez Sanchez | eduardo.faustino.hernandez.sanchez@toyofoods.local |
| CDMX | Khiroyuki Sakurai | khiroyuki.sakurai@toyofoods.local |
| CDMX | Andres Fierro Ibañez | andres.fierro.ibanez@toyofoods.local |
| CDMX | Jonathan Ramirez | jonathan.ramirez@toyofoods.local |
| CDMX | Tohru Kurasawa | tohru.kurasawa@toyofoods.local |
| CDMX | Tanno Nobuko | tanno.nobuko@toyofoods.local |
| MTY | Jessica Palomo | jessica.palomo@toyofoods.local |
| MTY | Luis Heredia | luis.heredia@toyofoods.local |
| MTY | Carla Hernández | carla.hernandez@toyofoods.local |
| MTY | Salomé Barron | salome.barron@toyofoods.local |
| GDL | Aguilar Neri Daniel | aguilar.neri.daniel@toyofoods.local |
| GDL | De la Cruz Ponce Julio Cesar | de.la.cruz.ponce.julio.cesar@toyofoods.local |
| GDL | Garibay Ortiz Sergio Joel | garibay.ortiz.sergio.joel@toyofoods.local |
| GDL | Sierra de Anda Aldo | sierra.de.anda.aldo@toyofoods.local |
| GDL | Perez Mar Alan Roberto | perez.mar.alan.roberto@toyofoods.local |
| GDL | Reynoso Aguilar Maricela | reynoso.aguilar.maricela@toyofoods.local |
| GDL | Sandra Navarro Navarro | sandra.navarro.navarro@toyofoods.local |
| GDL | Aguirre Ojeda Arcenio | aguirre.ojeda.arcenio@toyofoods.local |
| GDL | Velez Castellanos Antonio | velez.castellanos.antonio@toyofoods.local |
| GDL | Yepez Mora Oscar Alberto | yepez.mora.oscar.alberto@toyofoods.local |
| GDL | Sanchez Esmeralda | sanchez.esmeralda@toyofoods.local |
| GDL | Reynaga Valeria | reynaga.valeria@toyofoods.local |
| GDL | González Guzmán Cristian Eduardo | gonzalez.guzman.cristian.eduardo@toyofoods.local |
| AGS | Hernandez Gonzalez Angel Miguel | hernandez.gonzalez.angel.miguel@toyofoods.local |
| PUE | Victor Mendez | victor.mendez@toyofoods.local |
| PUE | Yael Mojica | yael.mojica@toyofoods.local |
| QRO | Roberto Lopez | roberto.lopez@toyofoods.local |

> Si dabas de alta a alguien nuevo directamente en el código antes, ahora en
> vez de eso: 1) agrégalo a la tabla `vendors` (paso 3) con el mismo nombre
> exacto, 2) crea su cuenta en Authentication con el correo que resulte de
> aplicarle la misma regla (todo minúsculas, sin acentos, puntos en vez de
> espacios, `@toyofoods.local`), 3) asígnale contraseña y su fila en
> `profiles`.

Después, por cada usuario que creaste, ve a **Table Editor → profiles** y
agrega una fila:

| id (copia el UUID del usuario) | role | city | vendor |
|---|---|---|---|
| `1111...` | `seller` | `CDMX` | `Javier Espinosa Olivares` |
| `2222...` | `admin` | `ALL` | `ALL` |

El campo `vendor` debe escribirse **exactamente igual** que el nombre que
usaste al calcular el correo y que uses en la tabla `vendors` (paso 3) —
mayúsculas, acentos y espacios tal cual, porque esta columna sí se usa para
mostrar el nombre y relacionar visitas con la persona correcta (solo el
correo se simplifica).

---

## 3) Cargar tu lista actual de vendedores a la tabla

Ve a **Table Editor → vendors → Insert row** y da de alta a cada persona, o
pega esto en el SQL Editor reemplazando con tu lista real:

```sql
insert into public.vendors (city, name) values
  ('CDMX','David Adrian Hernández Guzmán'),
  ('CDMX','Javier Espinosa Olivares'),
  ('MTY','Jessica Palomo'),
  ('GDL','Aguilar Neri Daniel');
  -- ...continúa con el resto de tu lista actual
```

(Tu lista completa era la que ya tenías escrita en el código — la app ya no
la usa desde ahí, así que puedes copiarla de esta guía o de tu respaldo del
archivo anterior.)

---

## 4) Qué cambia para quien usa la app

- Antes: elegían su nombre de una lista y escribían la misma contraseña que
  todos ("Toyo2026") — cualquiera podía verla en el código y entrar como
  cualquier otra persona, incluido Admin.
- Ahora: siguen eligiendo su nombre de la misma lista de siempre, **pero cada
  quien tiene su propia contraseña**, validada por Supabase en su servidor.
  Nadie puede ver ni usar la contraseña de otro, y ya no hay una clave única
  escrita en el archivo.

Si alguien olvida su contraseña, se la puedes restablecer desde
**Authentication → Users** en el panel de Supabase.

---

## 5) Qué NO cambié (y por qué)

No rediseñé visualmente la app. Está funcionando en campo con datos reales de
vendedores, así que prioricé que los cambios fueran seguros y no rompieran lo
que ya usan a diario. Si más adelante quieres un rediseño visual, mejor
hacerlo como un paso aparte, con tiempo para revisarlo antes de que el equipo
lo use.
