/**
 * Settings root — redirects to /settings/appearance.
 * @module
 */
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function SettingsPage() {
  const locale = await getLocale();
  redirect({ href: "/settings/appearance", locale });
}
