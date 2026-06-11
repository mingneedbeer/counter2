import type { APIRoute } from "astro";
import { hashSync, genSaltSync } from "bcryptjs";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "../../../../src/lib/email";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const email = data.get("email") as string;
  const password = data.get("password") as string;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Missing email or password" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (password.length < 3) {
    return new Response(JSON.stringify({ error: "Password must be at least 3 characters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const salt = genSaltSync(10);
  const passwordHash = hashSync(password, salt);
  const verificationToken = crypto.randomUUID();

  try {
    await db.insert(users).values({ email, passwordHash, verificationToken });
    sendVerificationEmail(email, verificationToken);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message?.includes("UNIQUE constraint")
        ? "Email already registered"
        : "Error registering user";
    return new Response(JSON.stringify({ error: message }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }
};
