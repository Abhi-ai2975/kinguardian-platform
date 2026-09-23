import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth-provider/auth-server";
import { getUserPreferenceAction } from "@/modules/server/presentation/actions/settings/preference.action";
import { UserPreferenceForm } from "@/modules/client/settings/preference/UserPreferenceForm";

async function PreferencePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session?.user) {
    redirect({ href: "/auth/sign-in", locale });
  }

  const [preference, error] = await getUserPreferenceAction();

  return <UserPreferenceForm preference={preference ?? null} error={error ?? null} />;
}

export default PreferencePage;
