import { redirect } from "@/i18n/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getLocale } from "next-intl/server";

async function TelemedicinePage() {
  const locale = await getLocale();
  const session = await getServerSession();
  const url =
    session?.session.activeRoleRedirectUrl ??
    "/bezs/telemedicine/patient/profile";

  redirect({ href: url, locale: locale });

  return (
    <div>
      <h1>TelemedicinePage</h1>
    </div>
  );
}

export default TelemedicinePage;
