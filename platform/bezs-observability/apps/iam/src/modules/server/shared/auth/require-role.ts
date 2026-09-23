import { redirect } from "@/i18n/navigation";
import { getServerSession } from "../../auth-provider/auth-server";
import { getLocale } from "next-intl/server";

export async function requireRole(roles: string[]) {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session || !session.user) {
    redirect({ href: "/auth/sign-in", locale });
    return null as never;
  }

  const user = session.user as typeof session.user & { role?: string };

  if (!user.role || !roles.includes(user.role)) {
    redirect({ href: "/", locale });
    return null as never;
  }

  return session;
}
