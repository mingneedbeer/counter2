import type { APIRoute } from "astro";
import { hashSync, genSaltSync } from "bcryptjs";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const email = data.get("email") as string;
  const password = data.get("password") as string;

  if (!email || !password) {
    return new Response("Missing email or password", { status: 400 });
  }

  const salt = genSaltSync(10);
  const passwordHash = hashSync(password, salt);

  try {
    await db.insert(users).values({ email, passwordHash });
    return redirect("/login");
  } catch (error) {
    return new Response("Error registering user", { status: 500 });
  }
};
