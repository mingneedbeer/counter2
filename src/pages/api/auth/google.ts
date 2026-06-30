import type { APIRoute } from "astro";
import { OAuth2Client } from "google-auth-library";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "../../../../src/lib/auth";

export const prerender = false;

const clientId = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(clientId);

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { credential } = await request.json();

    if (!credential || !clientId) {
      return new Response(JSON.stringify({ error: "Missing credential or client ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return new Response(JSON.stringify({ error: "Invalid Google token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = payload.email;

    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      const result = await db.insert(users).values({
        email,
        passwordHash: "google_oauth",
        verified: 1,
      }).returning();
      user = result[0];
    }

    const token = signToken({ userId: user.id, email: user.email, verified: user.verified, isAdmin: user.isAdmin });
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
  } catch (error) {
    console.error("Google auth error:", error);
    return new Response(JSON.stringify({ error: "Google authentication failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
};