-- Fase 4: columnas necesarias para la integración con Hotmart.

-- Columna para almacenar el transaction ID de Hotmart y evitar duplicados
-- cuando Hotmart envía PURCHASE_APPROVED + PURCHASE_COMPLETE para la misma compra.
alter table public.users add column if not exists hotmart_id text;

-- Ampliar el CHECK constraint de plan para incluir 'recarga'.
alter table public.users drop constraint if exists users_plan_check;
alter table public.users add constraint users_plan_check
  check (plan in ('ninguno', 'basico', 'pro', 'recarga'));
