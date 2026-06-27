import { createClient } from "@libsql/client";

export const prerender = false;

export const GET = async () => {
  const url = process.env.TURSO_DATABASE_VERCEL_TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_DATABASE_VERCEL_TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return new Response(JSON.stringify({ error: "env vars not set" }), { status: 500 });
  }

  const db = createClient({ url, authToken });

  try {
    await db.batch([
      "CREATE TABLE IF NOT EXISTS `users` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `email` text NOT NULL, `passwordHash` text NOT NULL, `createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL, `verified` integer DEFAULT 0 NOT NULL, `verificationToken` text)",
      "CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`)",
      "CREATE TABLE IF NOT EXISTS `credentials` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `userId` integer NOT NULL, `credentialId` text NOT NULL, `publicKey` text NOT NULL, `counter` integer DEFAULT 0 NOT NULL, `transports` text, `createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action)",
      "CREATE UNIQUE INDEX IF NOT EXISTS `credentials_credentialId_unique` ON `credentials` (`credentialId`)",
    ]);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};