# Amazon PPC Manager

Monorepo con frontend (Angular), backend (NestJS) y Supabase como base de datos/auth.
Módulos planeados: Login, PPC Dashboard, Search Terms, Keywords, Listing Builder.

## Estructura

- `frontend/` — Angular 22 (standalone components + signals), cliente Supabase directo para auth.
- `backend/` — NestJS 12, expone API propia para los módulos de Amazon Ads (protegida con guard de Supabase).

## 1. Crear el proyecto de Supabase

1. Ve a https://supabase.com/dashboard y crea un nuevo proyecto (elige región y una contraseña de base de datos segura).
2. Cuando esté listo, entra a **Project Settings → API** y copia:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `supabaseAnonKey` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend, **nunca** la expongas en el frontend)
3. En **Authentication → Providers**, confirma que "Email" esté habilitado (activado por defecto).
4. Opcional: en **Authentication → URL Configuration**, agrega la URL del frontend (ver abajo) como Site URL para desarrollo.
5. Opcional (botón "Continuar con Google" del login): en **Authentication → Providers → Google**, configura un OAuth Client ID/Secret de Google Cloud. Mientras no lo configures, ese botón devolverá error al hacer clic — el resto del login funciona igual.

> Nota: si tu proyecto de Supabase usa las keys nuevas (`sb_publishable_...` / `sb_secret_...`), úsalas igual en los lugares donde se pide `anon key` / `service_role key` — son el mismo concepto, solo cambió el prefijo.

## 2. Configurar el frontend

Edita `frontend/src/environments/environment.ts` y `environment.development.ts` con tu `supabaseUrl` y `supabaseAnonKey`.

```bash
cd frontend
npm start
```

Por defecto Angular usa el puerto 4200; si ya tienes algo corriendo ahí, usa `npm start -- --port 4300` (ajusta también `FRONTEND_URL` en el backend).

## 3. Configurar el backend

```bash
cd backend
cp .env.example .env
```

Completa `.env` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (o `sb_secret_...`).

```bash
npm run start:dev
```

Por defecto corre en el puerto definido en `PORT` (`.env.example` trae `3300` para evitar choques con el 3000, muy usado por otros proyectos). Endpoint de prueba protegido: `GET /auth/me` con header `Authorization: Bearer <access_token>` (el `access_token` lo obtienes de la sesión de Supabase en el frontend).

## Notas de arquitectura

- El login/registro/forgot-password se hace directo contra Supabase Auth desde Angular (`SupabaseService`), sin pasar por el backend.
- El backend valida tokens de Supabase (`SupabaseAuthGuard`) para proteger los endpoints propios que se agregarán con los módulos de PPC/Search Terms/Keywords/Listing Builder.
- El estilo visual de las pantallas de auth vive en `frontend/src/app/shared/ui/auth-layout/` (layout split-screen reutilizable) y en las clases `.auth-*` de `frontend/src/styles.scss`.
