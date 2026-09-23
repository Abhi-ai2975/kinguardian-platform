/**
 * Header — top application bar for the FileNest Console.
 *
 * Receives user and orgId from the server-rendered (app) layout so
 * no client-side session fetch is needed on every render. Renders the
 * sidebar trigger, org switcher, theme toggle, and user menu.
 *
 * @module
 */
"use client";

import { useRouter } from "next/navigation";
import { OrgSwitcher } from "./OrgSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { LangSwitcher } from "./LangSwitcher";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { authClient } from "@/modules/client/auth/auth-client";
import { toast } from "sonner";

interface HeaderProps {
  user: { name?: string | null; email: string };
  orgId: string;
}

export function Header({ user, orgId }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const { data, error } = await authClient.signOut();
    if (!data?.success || !data) {
      toast.error("Something went wrong!", { description: error?.message });
      return;
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    // Hard redirect clears the full Next.js router cache
    window.location.href = "/";
  }

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-8 w-8" />
        {orgId && <OrgSwitcher activeOrgId={orgId} />}
      </div>

      <div className="flex items-center gap-1">
        <LangSwitcher />
        <ThemeSwitcher />

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
              <a href="/settings/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
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
