import * as schema from "./schema";

let _db: any;

if (process.env.TURSO_DATABASE_URL) {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
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
