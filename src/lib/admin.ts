import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/generated/prisma/client";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "MODERATOR"];

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(ROUTES.login);
  }

  if (!session.user.role || !ADMIN_ROLES.includes(session.user.role)) {
    redirect(ROUTES.account);
  }

  return session;
}

export function isAdminRole(role?: UserRole | null) {
  if (!role) {
    return false;
  }

  return ADMIN_ROLES.includes(role);
}
