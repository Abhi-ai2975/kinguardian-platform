/**
 * Admin (resources) layout — shared sidebar for the resource-management screens.
 *
 * Layer: app / layouts
 * Route group: /[locale]/(apps)/telemedicine/admin/(resources)
 *   (the "(resources)" segment is organizational only — it does not appear
 *    in the URL, so /telemedicine/admin/organizations resolves exactly as
 *    before)
 *
 * This layout renders AdminSidebar alongside the page content. It is scoped
 * to this route group — organizations, locations, and future admin resources
 * (HealthcareService, Schedule, Slot, PractitionerRole, Practitioner) — and
 * deliberately does NOT wrap emr-chat, which lives as a sibling directly
 * under admin/ outside this group. emr-chat is a full-screen chat
 * experience; forcing the resource nav alongside it wasted space and made
 * no navigational sense there.
 *
 * The admin role guard itself stays in the parent admin/layout.tsx, which
 * still wraps this group (and emr-chat) — this layout only adds the sidebar.
 */

import { AdminSidebar } from "@/modules/client/telemedicine/admin/components/nav/AdminSidebar";

/** Wraps every resource-management admin page with the shared AdminSidebar. */
const AdminResourcesLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex w-full gap-6">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

export default AdminResourcesLayout;
