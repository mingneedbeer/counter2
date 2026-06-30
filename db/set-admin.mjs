import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_VERCEL_TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_DATABASE_VERCEL_TURSO_AUTH_TOKEN;

const email = process.argv[2];
if (!email) {
  console.error("Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node db/set-admin.mjs <email>");
  console.error("Or locally: node db/set-admin.mjs <email>");
  process.exit(1);
}

async function main() {
  if (url && authToken) {
    const client = createClient({ url, authToken });
    const result = await client.execute({ sql: "UPDATE users SET isAdmin = 1 WHERE email = ?", args: [email] });
    if (result.rowsAffected > 0) {
      console.log(`Promoted ${email} to admin (Turso)`);
    } else {
      console.log(`User ${email} not found`);
    }
  } else {
    const Database = (await import("better-sqlite3")).default;
    const sqlite = new Database("sqlite.db");
    const stmt = sqlite.prepare("UPDATE users SET isAdmin = 1 WHERE email = ?");
    const info = stmt.run(email);
    if (info.changes > 0) {
      console.log(`Promoted ${email} to admin (local SQLite)`);
    } else {
      console.log(`User ${email} not found`);
    }
  }
}

main().catch(console.error);
