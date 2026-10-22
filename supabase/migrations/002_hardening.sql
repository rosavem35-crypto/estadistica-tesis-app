-- Fase 3: autenticación real + créditos anti-manipulación.
-- Mismo patrón que marco-teorico-app (REVOKE UPDATE + GRANT UPDATE(name) +
-- función SECURITY DEFINER para el único incremento permitido desde el cliente).

alter table public.users add column if not exists created_at timestamptz not null default now();

-- Crea la fila en public.users apenas se crea el auth.users (p. ej. al
-- aceptar la invitación de Hotmart). Sin esto, requireUser() no encontraría
-- fila y el usuario quedaría sin acceso aunque haya iniciado sesión.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Los usuarios autenticados pueden ver y editar su propia fila (RLS), pero
-- a nivel de columna solo pueden tocar 'name': plan/créditos/active_until
-- quedan fuera del alcance de GRANT UPDATE, así que ni con RLS abierta se
-- pueden modificar desde el cliente.
revoke update on public.users from anon, authenticated;
grant update (name) on public.users to authenticated;

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create or replace function public.add_credits_used(p_amount integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_amount < 0 then
    raise exception 'Monto inválido';
  end if;
  update public.users set creditos_usados = creditos_usados + p_amount where id = auth.uid();
end;
$$;

revoke all on function public.add_credits_used(integer) from public, anon;
grant execute on function public.add_credits_used(integer) to authenticated;

-- A partir de esta fase, los inserts/updates de 'analisis' pueden hacerse
-- también con el cliente autenticado (antes todo pasaba por el admin).
create policy "analisis_insert_own" on public.analisis
  for insert with check (auth.uid() = user_id);

create policy "analisis_update_own" on public.analisis
  for update using (auth.uid() = user_id);
