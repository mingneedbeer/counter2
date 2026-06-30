import type { APIRoute } from "astro";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../../../src/lib/admin";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const auth = requireAdmin(cookies);
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { "Content-Type": "application/json" } });
  }
  const all = await db.select({ id: users.id, email: users.email, verified: users.verified, isAdmin: users.isAdmin, createdAt: users.createdAt }).from(users).orderBy(users.createdAt);
  return new Response(JSON.stringify(all), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const auth = requireAdmin(cookies);
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { "Content-Type": "application/json" } });
  }
  const body = await request.json();
  const { id, email, verified, isAdmin } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing user id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const updates: Record<string, any> = {};
  if (email !== undefined) updates.email = email;
  if (verified !== undefined) updates.verified = verified;
  if (isAdmin !== undefined) updates.isAdmin = isAdmin;
  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: "No fields to update" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  await db.update(users).set(updates).where(eq(users.id, id));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};
