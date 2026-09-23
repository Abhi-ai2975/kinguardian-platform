/**
 * i18n/navigation — locale-aware navigation primitives from next-intl.
 *
 * Import Link, redirect, usePathname, and useRouter from here instead of
 * next/navigation or next/link — they handle the [locale] prefix automatically.
 *
 * @module
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const {
  Link,
  redirect,
  usePathname,
  useRouter,
  getPathname,
  permanentRedirect,
} = createNavigation(routing);
