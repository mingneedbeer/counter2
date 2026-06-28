import * as schema from "./schema";

let _db: any;

// Prefer persistent database env vars, fall back to Vercel-Turso integration vars
const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_VERCEL_TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_DATABASE_VERCEL_TURSO_AUTH_TOKEN;

if (url && authToken) {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const client = createClient({
    url,
    authToken,
  });
  _db = drizzle(client, { schema });
} else {
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const sqlite = new Database("sqlite.db");
  sqlite.pragma("journal_mode = WAL");
  _db = drizzle(sqlite, { schema });
}

export const db = _db;
