import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_VERCEL_TURSO_DATABASE_URL || 'sqlite.db',
    authToken: process.env.TURSO_DATABASE_VERCEL_TURSO_AUTH_TOKEN,
  },
});
