import type { APIRoute } from "astro";
import { compareSync } from "bcryptjs";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "../../../../src/lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const data = await request.formData();
  const email = data.get("email") as string;
  const password = data.get("password") as string;

  if (!email || !password) {
    return new Response("Missing email or password", { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user || !compareSync(password, user.passwordHash)) {
    return new Response("Invalid email or password", { status: 401 });
  }

  const token = signToken({ userId: user.id, email: user.email });
  cookies.set("token", token, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return redirect("/dashboard");
};
