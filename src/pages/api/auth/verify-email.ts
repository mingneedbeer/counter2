import type { APIRoute } from "astro";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.verificationToken, token));

  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (user.verified) {
    return redirect("/login?verified=already");
  }

  await db
    .update(users)
    .set({ verified: 1, verificationToken: null })
    .where(eq(users.id, user.id));

  return redirect("/login?verified=1");
};
