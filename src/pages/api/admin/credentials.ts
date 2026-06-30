import type { APIRoute } from "astro";
import { db } from "../../../../db";
import { credentials, users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../../../src/lib/admin";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const auth = requireAdmin(cookies);
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { "Content-Type": "application/json" } });
  }
  const all = await db.select({
    id: credentials.id,
    userId: credentials.userId,
    credentialId: credentials.credentialId,
    counter: credentials.counter,
    transports: credentials.transports,
    createdAt: credentials.createdAt,
    userEmail: users.email,
  }).from(credentials).leftJoin(users, eq(credentials.userId, users.id)).orderBy(credentials.createdAt);
  return new Response(JSON.stringify(all), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = requireAdmin(cookies);
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { "Content-Type": "application/json" } });
  }
  const body = await request.json();
  const { id } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing credential id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  await db.delete(credentials).where(eq(credentials.id, id));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};
