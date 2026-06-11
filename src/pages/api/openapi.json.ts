import type { APIRoute } from "astro";
import { verifyToken } from "../../../src/lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Auth App API",
      version: "1.0.1",
      description: "Authentication API with email/password and passkey (WebAuthn) support.",
    },
    servers: [
      {
        url: "http://localhost:4321",
        description: "Local development",
      },
    ],
    paths: {
      "/api/auth/register": {
        post: {
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/x-www-form-urlencoded": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                    password: { type: "string", minLength: 3, example: "secret123" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Registration successful", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            "400": { description: "Missing or invalid fields" },
            "409": { description: "Email already registered" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          summary: "Login with email and password",
          requestBody: {
            required: true,
            content: {
              "application/x-www-form-urlencoded": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Login successful, JWT cookie set" },
            "401": { description: "Invalid email or password" },
          },
        },
      },
      "/api/auth/logout": {
        get: {
          summary: "Logout and clear session cookie",
          responses: {
            "302": { description: "Redirect to /" },
          },
        },
      },
      "/api/auth/passkey/register-begin": {
        post: {
          summary: "Begin passkey registration",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "Returns registration options with requestId" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/passkey/register-complete": {
        post: {
          summary: "Complete passkey registration",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["requestId"],
                  properties: {
                    requestId: { type: "string", description: "requestId from register-begin" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Passkey registered" },
            "400": { description: "Invalid challenge" },
            "401": { description: "Unauthorized or verification failed" },
          },
        },
      },
      "/api/auth/passkey/login-begin": {
        post: {
          summary: "Begin passkey authentication",
          responses: {
            "200": { description: "Returns authentication options with requestId" },
          },
        },
      },
      "/api/auth/passkey/login-complete": {
        post: {
          summary: "Complete passkey authentication",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["requestId"],
                  properties: {
                    requestId: { type: "string", description: "requestId from login-begin" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Authentication successful, JWT cookie set" },
            "400": { description: "Invalid challenge" },
            "401": { description: "Verification failed" },
            "404": { description: "Credential or user not found" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
        },
      },
    },
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};
