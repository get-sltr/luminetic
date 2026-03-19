import { getUser } from "./db";

export type UserRole = "user" | "admin" | "founder";

export function isFounderOrAdmin(role: string | undefined): boolean {
  return role === "founder" || role === "admin";
}

export async function requireAdmin(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;
  return isFounderOrAdmin(user.role);
}
