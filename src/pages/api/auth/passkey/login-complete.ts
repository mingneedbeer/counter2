import type { APIRoute } from "astro";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { challenges, rpID } from "../../../../../src/lib/passkey";
import { signToken } from "../../../../../src/lib/auth";
import { db } from "../../../../../db";
import { credentials, users } from "../../../../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = (await request.json()) as AuthenticationResponseJSON & { requestId: string };

  const stored = challenges.get(body.requestId);
  if (!stored) {
    return new Response("Invalid challenge", { status: 400 });
  }
  challenges.delete(body.requestId);

  const [cred] = await db
    .select()
    .from(credentials)
    .where(eq(credentials.credentialId, body.id));

  if (!cred) {
    return new Response("Credential not found", { status: 404 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, cred.userId));

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: stored.challenge,
      expectedOrigin: request.headers.get("origin") || rpID,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: cred.credentialId,
        publicKey: new Uint8Array(JSON.parse(cred.publicKey)),
        counter: cred.counter,
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      },
    });

    if (!verification.verified) {
      return new Response("Verification failed", { status: 401 });
    }

    await db
      .update(credentials)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(credentials.id, cred.id));

    const token = signToken({ userId: user.id, email: user.email });
    cookies.set("token", token, {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response("Verification error", { status: 500 });
  }
};
