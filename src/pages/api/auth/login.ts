import type { APIRoute } from "astro";
import { compareSync } from "bcryptjs";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "../../../../src/lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const data = await request.formData();
  const email = data.get("email") as string;
  const password = data.get("password") as string;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Missing email or password" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user || !compareSync(password, user.passwordHash)) {
    return new Response(JSON.stringify({ error: "Invalid email or password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = signToken({ userId: user.id, email: user.email, verified: user.verified });
  cookies.set("token", token, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
