export const prerender = false;

export const GET = async () => {
  const url = process.env.TURSO_DATABASE_VERCEL_TURSO_DATABASE_URL;
  return new Response(JSON.stringify({
    dbUrl: url || "not set",
    dbUrlPrefix: url ? url.substring(0, 20) + "..." : "none",
    dbUrlLength: url ? url.length : 0,
    authTokenSet: !!process.env.TURSO_DATABASE_VERCEL_TURSO_AUTH_TOKEN,
    nodeEnv: process.env.NODE_ENV,
  }), {
    headers: { "Content-Type": "application/json" },
  });
};