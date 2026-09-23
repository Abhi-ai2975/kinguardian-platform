import { redirect } from "@/i18n/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getLocale } from "next-intl/server";
import ProfileSettings from "@/modules/client/settings/ProfileSettings";

export default async function ProfileSettingsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  return <ProfileSettings user={session.user} />;
}
