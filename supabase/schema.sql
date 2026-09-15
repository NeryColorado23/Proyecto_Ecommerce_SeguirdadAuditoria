-- Ejecutar en el dashboard de Supabase: SQL Editor -> New query -> pegar -> Run.
-- Crea el sistema de roles (admin/user) sobre Supabase Auth.

create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- security definer: evita la recursión de RLS al comprobar si alguien es admin
-- desde una policy de la propia tabla profiles.
create function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

-- No hay policies de insert/update/delete para "authenticated": los cambios
-- de rol y la administración de otros perfiles se hacen desde el backend
-- (NestJS) usando la service role key, que ignora RLS.

-- Crea el perfil automáticamente cuando alguien se registra.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Mantiene sincronizado el email del perfil si el usuario lo cambia.
create function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_update();

-- Privilegios a nivel de tabla (independientes de RLS). PostgREST los exige
-- incluso para service_role, que solo se salta las policies de RLS, no los
-- GRANT. Sin esto, las consultas devuelven "permission denied for table".
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select on public.profiles to authenticated;

-- Backfill: el trigger on_auth_user_created solo aplica a usuarios que se
-- registren DESPUÉS de crear el trigger. Si ya tenías cuentas creadas antes
-- de correr este script, no tendrán fila en profiles hasta correr esto:
-- insert into public.profiles (id, email)
-- select id, email from auth.users
-- on conflict (id) do nothing;

-- Bootstrap: después de registrar (o rellenar) tu primera cuenta, conviértela
-- en admin corriendo esto una vez (cambia el correo):
-- update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
