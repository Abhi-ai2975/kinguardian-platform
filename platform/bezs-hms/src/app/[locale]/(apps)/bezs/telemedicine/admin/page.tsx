/**
 * Telemedicine admin landing page.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin
 *
 * Redirects immediately to the Organizations sub-page, which is the primary
 * admin section. Additional admin sections (practitioners, departments, etc.)
 * can be added as sibling routes and linked from a sidebar/nav later.
 */

import { redirect } from "next/navigation";

/**
 * Redirects /telemedicine/admin → /telemedicine/admin/organizations.
 */
export default function TelemedicineAdminPage() {
  redirect("admin/organizations");
}
