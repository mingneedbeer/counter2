import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

const appUrl = process.env.APP_URL || "http://localhost:4321";
const parsed = new URL(appUrl);

export const rpName = "Auth App";
export const rpID = process.env.RP_ID || parsed.hostname;
export const origin = process.env.ORIGIN || appUrl;
export const challenges = new Map<string, { challenge: string; userId?: number }>();

export type PasskeyUser = {
  id: string;
  email: string;
};
