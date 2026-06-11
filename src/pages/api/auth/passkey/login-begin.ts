import type { APIRoute } from "astro";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { challenges, rpID, origin } from "../../../../../src/lib/passkey";

export const prerender = false;

export const POST: APIRoute = async () => {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: [],
  });

  const requestId = crypto.randomUUID();
  challenges.set(requestId, { challenge: options.challenge });

  return new Response(JSON.stringify({ requestId, ...options }), {
    headers: { "Content-Type": "application/json" },
  });
};
