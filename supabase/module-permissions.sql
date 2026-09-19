-- Ejecutar en el dashboard de Supabase: SQL Editor -> New query -> pegar -> Run.
-- Requiere haber corrido antes supabase/schema.sql (tabla profiles/roles).
-- Permisos granulares por módulo: un usuario con rol "user" empieza sin
-- acceso a ningún módulo hasta que un admin se lo asigna explícitamente,
-- con nivel "viewer" (solo lectura) o "editor" (control total del módulo).
-- El rol "admin" siempre tiene acceso completo y no pasa por esta tabla.

create type public.app_module as enum ('ppc', 'search_terms', 'keywords', 'listings');
create type public.module_access_level as enum ('viewer', 'editor');

create table public.module_permissions (
  user_id uuid not null references auth.users (id) on delete cascade,
  module public.app_module not null,
  access_level public.module_access_level not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, module)
);

alter table public.module_permissions enable row level security;

-- Cada usuario puede leer sus propios permisos (para saber qué mostrar en su
-- menú); un admin puede leer los de cualquiera. Solo el backend (service_role)
-- escribe, desde la pantalla de administración.
create policy "module_permissions_select_own_or_admin" on public.module_permissions
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

grant select on public.module_permissions to authenticated;
grant select, insert, update, delete on public.module_permissions to service_role;
