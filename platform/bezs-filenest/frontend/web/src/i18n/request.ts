/**
 * i18n/request — next-intl server request configuration.
 *
 * Resolves the locale from the [locale] route segment and loads the
 * corresponding message catalogue. Falls back to the default locale if the
 * segment is missing or unrecognised.
 *
 * @module
 */
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
