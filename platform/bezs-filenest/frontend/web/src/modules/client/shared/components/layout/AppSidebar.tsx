/**
 * AppSidebar — collapsible left navigation for the FileNest Console.
 *
 * Uses static menu data from menu-datas.ts — no API fetch on render.
 * Superadmin users get an additional Admin group appended.
 * State persists via the sidebar_state cookie managed by SidebarProvider.
 *
 * @module
 */
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AppTitle } from "./AppTitle";
import { NavGroup } from "./NavGroup";
import { SidebarNavUser } from "./SidebarNavUser";
import { mainNavGroups, adminNavGroups } from "./menu-datas";

type TUser = {
  name?: string | null;
  email: string;
  image?: string | null;
};

interface AppSidebarProps {
  user: TUser;
  userRole?: string | null;
}

export function AppSidebar({ user, userRole }: AppSidebarProps) {
  const navGroups = [
    ...mainNavGroups,
    ...(userRole === "superadmin" ? adminNavGroups : []),
  ];

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarNavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
