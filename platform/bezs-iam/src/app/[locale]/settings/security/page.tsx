import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth-provider/auth-server";
import { SecuritySettings } from "@/modules/client/settings/security/SecuritySettings";

async function SecurityPage() {
  const [session, locale] = await Promise.all([getServerSession(), getLocale()]);

  if (!session?.user) {
    redirect({ href: "/auth/sign-in", locale });
    return null;
  }

  const user = session.user as typeof session.user & { twoFactorEnabled?: boolean };

  return (
    <SecuritySettings twoFactorEnabled={user.twoFactorEnabled ?? false} />
  );
}

export default SecurityPage;
