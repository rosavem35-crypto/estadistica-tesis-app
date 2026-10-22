-- Esquema inicial de estadistica-tesis-app (Fase 2 del plan).
-- Proyecto de Supabase propio, separado del de marco-teorico-app.

create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  plan text not null default 'ninguno' check (plan in ('ninguno', 'basico', 'pro')),
  creditos_usados integer not null default 0,
  creditos_limite integer not null default 0,
  active_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

-- La Fase 3 agrega REVOKE UPDATE + GRANT UPDATE(name) + add_credits_used()
-- (ver supabase/migrations/002_hardening.sql). Antes de eso no hay sesiones
-- reales, así que no se otorga UPDATE directo a 'authenticated' todavía.

create table public.analisis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tipo_analisis text not null,
  nombre_archivo_original text,
  archivo_original_path text,
  parametros jsonb not null default '{}'::jsonb,
  perfil_columnas jsonb,
  resultado_resumen text,
  reporte_md_path text,
  reporte_docx_path text,
  reporte_xlsx_path text,
  figuras_paths text[] not null default array[]::text[],
  container_id text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'procesando', 'completado', 'error')),
  error_detalle text,
  created_at timestamptz not null default now()
);

create index analisis_user_id_idx on public.analisis(user_id);

alter table public.analisis enable row level security;

create policy "analisis_select_own" on public.analisis
  for select using (auth.uid() = user_id);

-- Los inserts/updates de 'analisis' durante la Fase 2 (sin auth) y la
-- ejecución del motor siempre pasan por el cliente admin (service role),
-- que ignora RLS — por eso no hay política de INSERT/UPDATE para
-- 'authenticated' todavía; se agrega en la Fase 3 si hace falta edición
-- directa desde el cliente (hoy no la necesita: todo pasa por API routes).

-- Buckets de Storage.
insert into storage.buckets (id, name, public)
values
  ('datos-subidos', 'datos-subidos', false),
  ('reportes-generados', 'reportes-generados', false)
on conflict (id) do nothing;

-- El archivo de datos original se borra apenas termina el análisis (ver
-- app/api/analisis/[id]/ejecutar/route.ts) — no depende de una política de
-- expiración, pero documentamos la intención de "corta vida" aquí.
create policy "datos_subidos_solo_admin" on storage.objects
  for all using (bucket_id = 'datos-subidos' and auth.role() = 'service_role');

create policy "reportes_select_own" on storage.objects
  for select using (
    bucket_id = 'reportes-generados'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "reportes_admin_write" on storage.objects
  for insert with check (bucket_id = 'reportes-generados' and auth.role() = 'service_role');
