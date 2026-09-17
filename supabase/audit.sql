-- Ejecutar en el dashboard de Supabase: SQL Editor -> New query -> pegar -> Run.
-- Requiere haber corrido antes supabase/schema.sql (para public.is_admin).
-- Bitácora de auditoría inmutable: quién hizo qué, cuándo y desde qué IP.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  ip_address text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Solo administradores pueden revisar el log. Nadie (ni el service_role vía
-- policies) puede actualizar o borrar registros desde la API: solo insert/select.
create policy "audit_log_select_admin" on public.audit_log
  for select using (public.is_admin(auth.uid()));

grant select, insert on public.audit_log to service_role;

-- Suma la IP también al historial de cargas de Excel, para que quede
-- consistente con el resto de la bitácora (usuario, timestamp, IP).
alter table public.import_batches add column if not exists ip_address text;
