"use client";
// AppSidebar — collapsible left navigation using the shadcn Sidebar primitive.
// When expanded: shows icon + label. When collapsed: shows icon only with
// tooltip. The SidebarTrigger in the Header toggles between the two states.
// State persists via the sidebar_state cookie (managed by SidebarProvider).

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Shield,
  FileText,
  GitBranch,
  BarChart2,
  Settings,
  Zap,
  ShieldAlert,
  LayoutDashboard,
  Bot,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/overview",   label: "Overview",    icon: Activity },
  { href: "/dashboards", label: "Dashboards",  icon: LayoutDashboard },
  { href: "/audit",      label: "Audit",       icon: Shield },
  { href: "/logs",       label: "Logs",        icon: FileText },
  { href: "/traces",     label: "Traces",      icon: GitBranch },
  { href: "/ai",         label: "AI",          icon: Bot },
  { href: "/metrics",    label: "Metrics",     icon: BarChart2 },
  { href: "/settings",   label: "Settings",    icon: Settings },
] as const;

interface AppSidebarProps {
  userRole?: string | null;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      {/* Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="pointer-events-none"
            >
              <div>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="font-semibold truncate">Watcher24</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                    >
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Superadmin link */}
        {userRole === "superadmin" && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Admin"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Link href="/admin/overview">
                      <ShieldAlert />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.1.0 · MVP
        </p>
      </SidebarFooter>

      {/* Clickable collapse rail on the sidebar edge */}
      <SidebarRail />
    </Sidebar>
  );
}
