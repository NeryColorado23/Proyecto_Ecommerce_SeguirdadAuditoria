-- Ejecutar en el dashboard de Supabase: SQL Editor -> New query -> pegar -> Run.
-- Requiere haber corrido antes supabase/schema.sql (tabla profiles/roles).
-- Crea las tablas de datos para Listings, Search Terms y PPC, más el
-- historial de cargas de Excel (import_batches).

-- Actualiza updated_at automáticamente en cada UPDATE.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Listings: datos esenciales de una publicación de Amazon.
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  asin text not null unique,
  title text,
  bullet_1 text,
  bullet_2 text,
  bullet_3 text,
  bullet_4 text,
  bullet_5 text,
  description text,
  images text[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Search Terms: término de búsqueda + volumen, asociado a un ASIN.
-- ---------------------------------------------------------------------------
create table public.search_terms (
  id uuid primary key default gen_random_uuid(),
  asin text not null,
  search_term text not null,
  search_volume integer,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (asin, search_term)
);

create trigger search_terms_set_updated_at
  before update on public.search_terms
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- PPC: métricas por campaña / ad group / targeting / fecha de reporte.
-- ---------------------------------------------------------------------------
create table public.ppc_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  ad_group_name text not null,
  targeting text not null,
  match_type text not null,
  report_date date not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  spend numeric(12, 2) not null default 0,
  sales numeric(12, 2) not null default 0,
  orders integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (campaign_name, ad_group_name, targeting, match_type, report_date)
);

create trigger ppc_reports_set_updated_at
  before update on public.ppc_reports
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Control de cargas de Excel (historial de importaciones).
-- ---------------------------------------------------------------------------
create type public.import_module as enum ('listings', 'search_terms', 'ppc');
create type public.import_status as enum ('completed', 'completed_with_errors', 'failed');

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  module public.import_module not null,
  file_name text not null,
  uploaded_by uuid references auth.users (id) on delete set null,
  row_count integer not null default 0,
  success_count integer not null default 0,
  error_count integer not null default 0,
  status public.import_status not null,
  errors jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS + privilegios. Lectura para cualquier usuario autenticado; toda
-- escritura (CRUD e importación) se hace desde el backend con la service
-- role key, que ignora RLS pero igual necesita el GRANT de tabla.
-- ---------------------------------------------------------------------------
alter table public.listings enable row level security;
alter table public.search_terms enable row level security;
alter table public.ppc_reports enable row level security;
alter table public.import_batches enable row level security;

create policy "listings_select_authenticated" on public.listings
  for select using (auth.role() = 'authenticated');
create policy "search_terms_select_authenticated" on public.search_terms
  for select using (auth.role() = 'authenticated');
create policy "ppc_reports_select_authenticated" on public.ppc_reports
  for select using (auth.role() = 'authenticated');
create policy "import_batches_select_authenticated" on public.import_batches
  for select using (auth.role() = 'authenticated');

grant select, insert, update, delete on public.listings to service_role;
grant select, insert, update, delete on public.search_terms to service_role;
grant select, insert, update, delete on public.ppc_reports to service_role;
grant select, insert, update, delete on public.import_batches to service_role;

grant select on public.listings to authenticated;
grant select on public.search_terms to authenticated;
grant select on public.ppc_reports to authenticated;
grant select on public.import_batches to authenticated;
