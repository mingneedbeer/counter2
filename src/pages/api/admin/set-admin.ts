import type { APIRoute } from "astro";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export const POST: APIRoute = async ({ request }) => {
  if (!ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "ADMIN_SECRET not configured on server" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { email, secret } = body;

  if (!email || !secret) {
    return new Response(JSON.stringify({ error: "Missing email or secret" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  if (secret !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "Invalid secret" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  const result = await db.update(users).set({ isAdmin: 1 }).where(eq(users.email, email));
  if ((result as any).rowsAffected > 0 || (result as any).changes > 0) {
    return new Response(JSON.stringify({ ok: true, message: `Promoted ${email} to admin` }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ error: `User ${email} not found` }), {
    status: 404, headers: { "Content-Type": "application/json" },
  });
};
