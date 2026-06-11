import type { APIRoute } from "astro";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { challenges, rpID, rpName, origin } from "../../../../../src/lib/passkey";
import { verifyToken } from "../../../../../src/lib/auth";
import { db } from "../../../../../db";
import { credentials } from "../../../../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return new Response("Unauthorized", { status: 401 });

  const existingCreds = await db
    .select()
    .from(credentials)
    .where(eq(credentials.userId, payload.userId));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: payload.email,
    userID: new TextEncoder().encode(String(payload.userId)),
    attestationType: "none",
    excludeCredentials: existingCreds.map((c) => ({
      id: c.credentialId,
      type: "public-key" as const,
    })),
  });

  const requestId = crypto.randomUUID();
  challenges.set(requestId, { challenge: options.challenge, userId: payload.userId });

  return new Response(JSON.stringify({ requestId, ...options }), {
    headers: { "Content-Type": "application/json" },
  });
};
