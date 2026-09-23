"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { NavGroup } from "./NavGroup";
import { AppTitle } from "./AppTitle";
import { SidebarNavUser } from "../SidebarNavUser";
import { type NavGroup as NavGroupProps } from "./types";
import { settingsSidebarData } from "./menu-datas";

type TUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
  activeOrganizationId: string | null | undefined;
};

interface NavNode {
  id: string;
  label: string;
  slug: string;
  icon: string | null;
  href: string | null;
  type: string;
  isVisible: boolean;
  permissionKeys: string[];
  children: NavNode[];
}

interface ContextApp {
  id: string;
  name: string;
  slug: string;
  menus: NavNode[];
}

interface ContextResponse {
  apps: ContextApp[];
  permissions: string[];
}

function buildNavGroups(app: ContextApp): NavGroupProps[] {
  return app.menus
    .filter((node) => node.type === "GROUP" && node.isVisible)
    .map((group) => ({
      title: group.label,
      items: group.children
        .filter((child) => child.isVisible)
        .map((child) => {
          const visibleSubs = child.children.filter((sub) => sub.isVisible);
          if (child.type === "GROUP" || visibleSubs.length > 0) {
            return {
              title: child.label,
              icon: child.icon ?? undefined,
              items: (child.type === "GROUP" ? child.children : visibleSubs)
                .filter((sub) => sub.isVisible)
                .map((sub) => ({
                  title: sub.label,
                  url: sub.href ?? "#",
                  icon: sub.icon ?? undefined,
                })),
            };
          }
          return {
            title: child.label,
            url: child.href ?? "#",
            icon: child.icon ?? undefined,
          };
        }),
    }));
}

const SKELETON_COUNTS = [3, 2, 2, 1];

function NavSkeleton() {
  return (
    <>
      {SKELETON_COUNTS.map((count, gi) => (
        <SidebarGroup key={gi}>
          <SidebarGroupLabel>
            <Skeleton className="h-3 w-full bg-muted-foreground/25" />
          </SidebarGroupLabel>
          <SidebarMenu>
            {Array.from({ length: count }).map((_, ii) => (
              <SidebarMenuItem key={ii}>
                <SidebarMenuButton>
                  <Skeleton className="h-4 w-4 shrink-0 rounded bg-muted-foreground/25" />
                  <Skeleton className="h-4 flex-1 bg-muted-foreground/25" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}

export function MenuBar(user: TUser) {
  const [allApps, setAllApps] = useState<ContextApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const currentSlug = segments[1] ?? "";
  const isSettings = currentSlug === "settings";

  const currentApp = allApps.find((a) => a.slug === currentSlug);
  const navGroups: NavGroupProps[] = isSettings
    ? (settingsSidebarData.navGroups as NavGroupProps[])
    : currentApp
      ? buildNavGroups(currentApp)
      : [];

  const fetchContext = useCallback((orgId?: string | null) => {
    const base = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
    const url = orgId
      ? `${base}/api/me/context?organizationId=${orgId}`
      : `${base}/api/me/context`;

    return fetch(url, { credentials: "include" })
      .then((res) => res.json() as Promise<ContextResponse>)
      .then((data) => setAllApps(data.apps ?? []))
      .catch(() => setAllApps([]));
  }, []);

  useEffect(() => {
    fetchContext(user.activeOrganizationId).finally(() => setIsLoading(false));
  }, [fetchContext, user.activeOrganizationId]);

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {!isSettings && isLoading ? (
          <NavSkeleton />
        ) : (
          navGroups.map((props) => <NavGroup key={props.title} {...props} />)
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarNavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
