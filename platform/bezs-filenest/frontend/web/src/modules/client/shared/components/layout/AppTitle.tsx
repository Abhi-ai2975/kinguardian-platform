/**
 * AppTitle — sidebar header branding for the FileNest Console.
 *
 * Renders the FileNest logo mark and product name. Clicking navigates to
 * /dashboard and closes the mobile sheet. Non-interactive when collapsed
 * (icon only visible via the sidebar's icon-collapse mode).
 *
 * @module
 */
"use client";

import { Link } from "@/i18n/navigation";
import { HardDrive } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppTitle() {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="hover:bg-transparent active:bg-transparent"
          asChild
        >
          <Link href="/dashboard" onClick={() => setOpenMobile(false)}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardDrive className="size-4" />
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-bold">FileNest</span>
              <span className="truncate text-xs text-muted-foreground">
                File Infrastructure
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
