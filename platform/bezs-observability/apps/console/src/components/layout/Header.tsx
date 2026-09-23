// Header — top bar showing the org name, a live indicator, and the user menu.
// Receives the user and orgId from the server-side DashboardLayout to avoid
// a client-side session fetch on every render.
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth";
import { OrgSwitcher } from "@/components/layout/OrgSwitcher";
import { AppSwitcher } from "@/components/layout/AppSwitcher";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LogOut, User } from "lucide-react";

interface HeaderProps {
  user: { name?: string | null; email: string };
  orgId: string;
  activeAppId: string | null;
}

// Header renders the top application bar with user info and controls.
export function Header({ user, orgId, activeAppId }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    // Clear OAuth access_token cookie (PKCE flow) and better-auth session (proxy flow).
    await Promise.all([
      fetch("/api/auth/signout", { method: "POST" }),
      authClient.signOut(),
    ]);
    router.push("/");
  }

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-8 w-8" />
        {orgId && <OrgSwitcher activeOrgId={orgId} />}
        <AppSwitcher activeAppId={activeAppId} />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{user.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings">
                <User className="mr-2 h-4 w-4" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
