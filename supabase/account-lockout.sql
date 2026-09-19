-- Ejecutar en el dashboard de Supabase: SQL Editor -> New query -> pegar -> Run.
-- Requiere haber corrido antes supabase/audit.sql.
-- Soporte para el bloqueo de cuenta por intentos fallidos de login: un
-- índice parcial para que consultar "últimos N intentos fallidos de este
-- correo" sea rápido incluso con la bitácora creciendo sin límite.

create index if not exists audit_log_login_failed_idx
  on public.audit_log (entity_id, created_at desc)
  where action = 'login_failed';
