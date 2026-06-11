# AGENTS.md

This is a compact guide for future sessions in the `counter2` repository.

## Project Overview
- **Framework**: Astro (with React integration)
- **Database**: SQLite using Drizzle ORM + `@libsql/client`
- **Styling**: Tailwind CSS + DaisyUI
- **Runtime**: Bun
- **Auth**: JWT (jsonwebtoken) + bcryptjs + WebAuthn passkeys (@simplewebauthn)

## Development Commands
- **Start Development Server**: `bun run dev`
- **Generate Drizzle Migrations**: `bunx drizzle-kit generate`
- **Apply Drizzle Migrations**: `bunx drizzle-kit migrate`
- **Build for Production**: `bun run build`

## Important Gotchas
- **`bun:sqlite` NOT available in `astro dev`**: Astro dev runs on Node.js Vite SSR. Use `@libsql/client` for cross-platform SQLite. Do NOT use `bun:sqlite` or `drizzle-orm/bun-sqlite`.
- **Server routes need `prerender = false`**: API routes (`src/pages/api/`) and any page reading cookies/headers (like `dashboard.astro`) must have `export const prerender = false;`.
- **Password hashing**: Use `bcryptjs` (pure JS), NOT `Bun.password.hash()` (Bun-only).
- **Database Schema**: `db/schema.ts` is the Drizzle schema. `db/index.ts` is the connection with `@libsql/client`.
- **Configuration**: `drizzle.config.ts` is the source of truth for database migrations. Uses `dialect: 'sqlite'` with `dbCredentials.url` pointing to `sqlite.db`.
- **Astro/React**: Components are in `src/components`. Pages are in `src/pages`.

## Important Gotchas
- **`bun:sqlite` NOT available in `astro dev`**: Astro dev runs on Node.js Vite SSR. Use `@libsql/client` for cross-platform SQLite. Do NOT use `bun:sqlite` or `drizzle-orm/bun-sqlite`.
- **Server routes need `prerender = false`**: API routes (`src/pages/api/`) and any page reading cookies/headers (like `dashboard.astro`) must have `export const prerender = false;`.
- **Password hashing**: Use `bcryptjs` (pure JS), NOT `Bun.password.hash()` (Bun-only).
- **Database Schema**: `db/schema.ts` is the Drizzle schema. `db/index.ts` is the connection with `@libsql/client`.
- **Configuration**: `drizzle.config.ts` is the source of truth for database migrations. Uses `dialect: 'sqlite'` with `dbCredentials.url` pointing to `sqlite.db`.
- **Astro/React**: Components are in `src/components`. Pages are in `src/pages`.

## Auth Pattern
- Login sets a JWT cookie (`token`) with `httpOnly`, `SameSite=Lax`, 7-day expiry.
- Dashboard reads the cookie via `Astro.cookies.get("token")` and verifies with `verifyToken()`.
- `src/lib/auth.ts` handles JWT sign/verify with a dev secret by default.
- Passkey login uses WebAuthn via `@simplewebauthn` (browser + server).
- Passkey credentials are stored in the `credentials` table linked to user.

## Deployment (Vercel + Turso)
1. **Install Turso CLI**: `curl -sSfL https://get.tur.so/install.sh | bash`
2. **Login**: `turso auth login`
3. **Create DB**: `turso db create counter2`
4. **Get URL**: `turso db show counter2 --url`
5. **Get Token**: `turso db tokens create counter2`
6. **Run migrations locally first**: `bunx drizzle-kit migrate`
7. **Push schema to Turso**: `bunx drizzle-kit push` (or use `bunx drizzle-kit migrate`)
8. **Set Vercel env vars**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_URL`, `JWT_SECRET`
