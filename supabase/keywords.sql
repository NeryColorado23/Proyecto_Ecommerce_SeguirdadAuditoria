-- Ejecutar en el dashboard de Supabase: SQL Editor -> New query -> pegar -> Run.
-- Requiere haber corrido antes schema.sql y modules.sql.
-- Módulo Keywords: a diferencia de search_terms (tráfico real de clientes),
-- aquí se rastrean los keywords que el equipo decide targetear: si el ASIN
-- está indexado para ese término y en qué posición orgánica rankea.

alter type public.import_module add value if not exists 'keywords';

create table public.keywords (
  id uuid primary key default gen_random_uuid(),
  asin text not null,
  keyword text not null,
  search_volume integer,
  organic_rank integer,
  indexed boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (asin, keyword)
);

create trigger keywords_set_updated_at
  before update on public.keywords
  for each row execute procedure public.set_updated_at();

alter table public.keywords enable row level security;

create policy "keywords_select_authenticated" on public.keywords
  for select using (auth.role() = 'authenticated');

grant select, insert, update, delete on public.keywords to service_role;
grant select on public.keywords to authenticated;
