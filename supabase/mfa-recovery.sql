-- Ejecutar en el dashboard de Supabase: SQL Editor -> New query -> pegar -> Run.
-- Códigos de recuperación de un solo uso para el 2FA (TOTP).
-- Supabase Auth no trae "recovery codes" nativos; se implementan aquí.

create table public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mfa_recovery_codes enable row level security;
-- Sin policies a propósito: nadie accede vía RLS. Solo el backend (service_role,
-- que ignora RLS) genera y consume estos códigos.
grant select, insert, update, delete on public.mfa_recovery_codes to service_role;

-- Permite al backend borrar TODOS los factores MFA de un usuario cuando
-- consume un código de recuperación válido (perdió el dispositivo
-- autenticador), obligándolo a configurar uno nuevo en su próximo acceso.
-- security definer: el dueño de la función (postgres) sí tiene acceso al
-- esquema auth; quien la ejecuta (service_role) no necesita tenerlo directo.
create or replace function public.admin_delete_all_mfa_factors(target_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.mfa_factors where user_id = target_user_id;
$$;

revoke all on function public.admin_delete_all_mfa_factors(uuid) from public;
grant execute on function public.admin_delete_all_mfa_factors(uuid) to service_role;
