import { verifyToken } from "./auth";

export function requireAdmin(cookies: { get: (name: string) => { value?: string } | undefined }) {
  const token = cookies.get("token")?.value;
  if (!token) return { error: "Not authenticated", status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: "Invalid token", status: 401 };
  if (!payload.isAdmin) return { error: "Admin access required", status: 403 };
  return { payload };
}
