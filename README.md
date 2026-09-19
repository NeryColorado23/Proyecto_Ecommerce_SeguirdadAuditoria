# Amazon PPC Manager

Monorepo con frontend (Angular), backend (NestJS) y Supabase como base de datos/auth.
Módulos: Login (+ 2FA), Dashboard, PPC, Search Terms, Listings, Listing Builder, Keywords,
Administración (roles + auditoría).

## Estructura

- `frontend/` — Angular 22 (standalone components + signals) + Tailwind CSS + DaisyUI, cliente Supabase directo para auth/MFA.
- `backend/` — NestJS 12, expone API propia para los módulos de datos (PPC/Search Terms/Listings/Admin/Audit), protegida con guard de Supabase.
- `supabase/` — esquema SQL a correr en el SQL Editor del dashboard: `schema.sql` (roles) → `modules.sql` (PPC/Search Terms/Listings) → `audit.sql` (bitácora) → `mfa-recovery.sql` (códigos de recuperación) → `keywords.sql` (Keywords) → `account-lockout.sql` (índice para bloqueo de cuenta) → `module-permissions.sql` (permisos granulares por módulo). Correr en ese orden.
- `render.yaml` — Blueprint de despliegue del backend en Render (ver sección "Despliegue" al final).

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
- El backend valida tokens de Supabase (`SupabaseAuthGuard`) para proteger los endpoints propios de PPC/Search Terms/Listings/Admin/Audit.
- El estilo visual de las pantallas de auth vive en `frontend/src/app/shared/ui/auth-layout/` (layout split-screen reutilizable) y en las clases `.auth-*` de `frontend/src/styles.scss`. Los módulos de datos usan Tailwind + DaisyUI directamente.
- Carga masiva de datos: cada módulo (Listings/Search Terms/PPC) tiene plantilla Excel descargable, importación con `upsert` por clave natural, y queda registrada en `import_batches` (control de lo subido).

## Seguridad implementada

- **Roles (RBAC)**: tabla `profiles` con `admin`/`user`, RLS en Supabase, guards en frontend (`admin.guard.ts`) y backend (`RolesGuard` + `@Roles()`). Un admin no puede cambiar su propio rol.
- **Permisos granulares por módulo**: un usuario con rol `user` empieza **sin acceso a ningún módulo** (PPC, Search Terms, Keywords, Listings) hasta que un admin se lo asigna desde `/admin`, con nivel "Vista" (solo lectura, sin importar/crear/editar) o "Editor" (control total del módulo, incluida la carga masiva de Excel). Un admin siempre tiene acceso completo a todo y no pasa por esta matriz. Se aplica en tres capas: guard de ruta en Angular (`module-access.guard.ts`), guard de la API en NestJS (`ModuleAccessGuard` + `@RequireModule()`), y ocultamiento de botones/menús en la UI para quienes solo tienen "Vista". Listing Builder requiere nivel "Editor" sobre Listings (crear/editar es, por definición, una acción de edición).
- **MFA/2FA (TOTP)**: vía `supabase.auth.mfa` nativo. Cualquier usuario puede activarlo desde "Seguridad (2FA)" en el sidebar; es **obligatorio** para el rol `admin` (`mfaEnforcementGuard` fuerza `/mfa-setup` si no lo tiene activo).
- **Bitácora de auditoría inmutable** (`audit_log`): registra login y cambios de rol con usuario, IP y timestamp. Solo lectura para admins (visible en `/admin`), sin permiso de update/delete desde la API.
- **Bloqueo de cuenta por fuerza bruta**: tras 5 intentos fallidos de login para el mismo correo en 15 minutos, el backend bloquea nuevos intentos (`POST /audit/login-lock-status`, consultado por el frontend antes de llamar a Supabase Auth) hasta 15 minutos después del último intento fallido. Es por cuenta, no por IP, así que no depende de qué red uses. Limitación conocida: como el login real va directo contra Supabase Auth (no por el backend), alguien que llame a la API de Supabase directamente, sin pasar por el frontend, evita este control — mitigarlo del todo requeriría mover el login a través del backend o activar CAPTCHA (hCaptcha/Turnstile) en Supabase.
- **Rate limiting**: `@nestjs/throttler` (100 req/min por IP) en toda la API del backend.
- **Cabeceras de seguridad HTTP**: `helmet` en el backend (X-Content-Type-Options, X-Frame-Options, etc.).
- **Anti-inyección de fórmulas en Excel/CSV**: cualquier valor cargado que empiece con `=`, `+`, `-`, `@`, tab o CR se neutraliza (se antepone `'`) antes de guardarse, para prevenir CSV/Formula Injection si esos datos se vuelven a exportar y abrir en Excel.
- **Cadena de suministro**: `npm run security:audit` (falla si hay vulnerabilidades altas/críticas) y `npm run sbom` (genera `sbom.json` en formato CycloneDX) en `frontend/` y `backend/`. Automatizado en cada push/PR vía `.github/workflows/security.yml`.

### Pendiente por costo, no por diseño

- **Point-in-Time Recovery (PITR) en Supabase**: da la posibilidad de restaurar la base de datos a cualquier segundo de los últimos días (ISO 27001 A.12.3, respaldo de información). **No se activó**: Supabase solo lo ofrece en el plan Pro de pago; el plan gratuito usado en este proyecto no lo incluye. El plan free sí hace backups diarios automáticos, pero sin PITR (solo restauración a esos puntos diarios, no a un momento exacto). Si el proyecto pasa a plan Pro, activarlo en **Project Settings → Database → Backups**.

## Despliegue

### Backend en Render

El repo incluye `render.yaml` (Blueprint) con la configuración lista: build `npm install --include=dev && npm run build`, arranque `npm run start:prod`, health check en `/`, y detección correcta de la IP real del cliente detrás del proxy de Render (`trust proxy`) — sin esto, la bitácora de auditoría y el rate limiting verían a todos los usuarios como una sola IP.

> **Ojo con `--include=dev` en el Build Command**: como `NODE_ENV=production` queda seteado como variable de entorno, `npm install` a secas se salta las `devDependencies` — y ahí vive `@nestjs/cli`, que provee el comando `nest` usado para compilar. Sin `--include=dev` el build falla con `nest: not found`.

1. Sube el repo a GitHub (o el remoto que estés usando).
2. En [Render Dashboard](https://dashboard.render.com) → **New → Blueprint**, apunta al repo. Render detecta `render.yaml` automáticamente.
3. Cuando te pida las variables de entorno marcadas `sync: false`, completa:
   - `SUPABASE_URL` — el mismo que ya usas.
   - `SUPABASE_SERVICE_ROLE_KEY` — la service role key (o `sb_secret_...`). **Nunca la pongas en el repo.**
   - `FRONTEND_URL` — por ahora puedes poner `http://localhost:4300`; cuando el frontend esté en Vercel, agrega esa URL también, separadas por coma: `https://tu-app.vercel.app,http://localhost:4300`.
4. Deploy. Una vez arriba, prueba `https://tu-servicio.onrender.com/` — debería responder `Hello World!`.
5. Plan free de Render: el servicio "duerme" tras ~15 min sin tráfico y el primer request después tarda unos segundos en despertar. Normal, no es un error.

**No se pierde nada de seguridad al desplegar**: RLS y las políticas viven en Supabase (no dependen de dónde corra el backend), MFA/roles/auditoría/rate-limiting/validación son lógica de la app que viaja con el código, y las claves siguen fuera del repo vía variables de entorno de Render.

### Frontend en Vercel

`environment.ts` (el de producción) ya apunta `apiUrl` a `https://ppc-manager-backend.onrender.com`. `environment.development.ts` sigue apuntando a `localhost:3300` para desarrollo local — Angular intercambia uno por otro según la configuración (`fileReplacements` en `angular.json`), así que no hay que tocar nada para seguir trabajando local.

`frontend/vercel.json` ya trae el build command, el output directory (`dist/frontend/browser`) y el rewrite de SPA (para que refrescar en `/dashboard`, `/admin`, etc. no dé 404).

1. En [vercel.com/new](https://vercel.com/new), importa el mismo repo de GitHub.
2. En **Configure Project**:
   - **Root Directory**: `frontend` ← igual que con Render, es un monorepo.
   - **Framework Preset**: Vercel debería detectar "Angular" solo al ver el Root Directory. Si no, selecciónalo a mano.
   - No hace falta agregar variables de entorno: la URL/llave de Supabase y la URL del backend ya están en `environment.ts` (la anon/publishable key es segura de exponer en el cliente).
3. **Deploy**. Cuando termine, te da una URL tipo `https://tu-proyecto.vercel.app`.
4. Con esa URL, actualiza dos cosas:
   - En **Render** → tu servicio → **Environment** → `FRONTEND_URL` → cámbialo a `https://tu-proyecto.vercel.app,http://localhost:4300` (separado por coma) → guarda (Render redepliega solo).
   - En **Supabase** → **Authentication → URL Configuration** → agrega `https://tu-proyecto.vercel.app` a los **Redirect URLs** (necesario para que funcionen el reset de contraseña y "Continuar con Google").
5. Prueba el login completo en la URL de Vercel: registro, login, 2FA, y algún módulo de datos — debería comportarse igual que en local, ahora contra el backend de Render.

> **Ojo con la URL de Vercel que uses**: cada deploy nuevo genera una URL única con un hash (p. ej. `tu-proyecto-hjffmqftb-tu-usuario.vercel.app`), pero el dominio fijo del proyecto (el que no cambia entre deploys, algo como `tu-proyecto.vercel.app`) es el que debe ir en `FRONTEND_URL` (Render) y en Site URL/Redirect URLs (Supabase). Si pruebas la app en una URL de deploy que no está en ninguna de esas dos listas, vas a ver errores de CORS (a veces disfrazados de "CORS error" genérico en el navegador aunque el problema real sea otro) y fallos de MFA/reset de contraseña.
>
> URL de producción actual de este proyecto: `https://proyecto-ecommerce-seguirdad-audito.vercel.app`.
