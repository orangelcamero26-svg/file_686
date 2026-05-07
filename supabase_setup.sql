-- SQL para configurar las tablas en Supabase
-- Copia y pega esto en el Editor SQL de tu proyecto Supabase

-- 1. Tabla de Usuarios
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password text not null,
  role text not null check (role in ('OPERATOR', 'SUPERVISOR', 'ADMIN')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Seguridad de Nivel de Fila)
alter table public.users enable row level security;

-- Política simple: acceso total para desarrollo (puedes restringirlo después)
create policy "Acceso Público" on public.users for all using (true);

-- 2. Tabla de Cierres de Caja
create table if not exists public.cierres (
  id uuid primary key default gen_random_uuid(),
  fechaTurno date not null,
  turno integer,
  startTime text,
  endTime text,
  userId uuid references public.users(id),
  userName text,
  islaId text,
  islaName text,
  lecturas jsonb default '[]'::jsonb,
  ventaTeorica numeric default 0,
  efectivoDeclarado numeric default 0,
  tarjetasDeclarado numeric default 0,
  valesDeclarado numeric default 0,
  totalDeclarado numeric default 0,
  descuadre numeric default 0,
  status text default 'Pendiente',
  supervisorId uuid references public.users(id),
  notes text,
  attachments jsonb default '[]'::jsonb,
  workerPhoto text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.cierres enable row level security;
create policy "Acceso Público" on public.cierres for all using (true);

-- 3. Tabla de Auditorías
create table if not exists public.auditorias (
  id uuid primary key default gen_random_uuid(),
  cierreId uuid references public.cierres(id),
  supervisorId uuid references public.users(id),
  observaciones text,
  ajusteAplicado numeric default 0,
  fechaAuditoria timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.auditorias enable row level security;
create policy "Acceso Público" on public.auditorias for all using (true);

-- 4. Usuario Admin inicial (Opcional - Cambia el password inmediatamente)
insert into public.users (name, email, password, role)
values ('Administrador', 'admin@shell.com', 'admin123', 'ADMIN')
on conflict (email) do nothing;
