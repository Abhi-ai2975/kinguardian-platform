/**
 * i18n/routing — next-intl routing configuration.
 *
 * FileNest Console ships with English only in Phase 1. The [locale] segment
 * is kept in the route tree so additional locales can be added without
 * restructuring the app directory.
 *
 * @module
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
});
