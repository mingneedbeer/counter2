import type { APIRoute } from "astro";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { challenges, rpID } from "../../../../../src/lib/passkey";
import { verifyToken } from "../../../../../src/lib/auth";
import { db } from "../../../../../db";
import { credentials } from "../../../../../db/schema";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return new Response("Unauthorized", { status: 401 });

  const body = (await request.json()) as RegistrationResponseJSON & { requestId: string };

  const stored = challenges.get(body.requestId);
  if (!stored) {
    return new Response("Invalid challenge", { status: 400 });
  }
  challenges.delete(body.requestId);

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: stored.challenge,
      expectedOrigin: request.headers.get("origin") || rpID,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return new Response("Verification failed", { status: 401 });
    }

    const { credential } = verification.registrationInfo;

    await db.insert(credentials).values({
      userId: payload.userId,
      credentialId: credential.id,
      publicKey: JSON.stringify(Array.from(credential.publicKey)),
      counter: credential.counter,
      transports: JSON.stringify(body.response.transports || []),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("register-complete error:", error);
    return new Response(`Verification error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
};
