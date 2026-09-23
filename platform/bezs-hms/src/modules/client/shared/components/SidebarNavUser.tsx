"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/modules/client/auth/betterauth/auth-client";
import { ThemeSwitcher } from "@/theme/ThemeSwitcher";
import { ChevronsUpDown, LogOut, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
};

export function SidebarNavUser({ user }: { user: TUser }) {
  const { name, email, image, username } = user;
  const { state } = useSidebar();

  async function handleLogout() {
    const { data, error } = await authClient.signOut();
    if (!data?.success || !data) {
      toast.error("Something went wrong!", { description: error?.message });
      return;
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/";
  }

  const initials = (name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className={cn(
            "cursor-pointer",
            state === "expanded" &&
              "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
          )}
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={image ?? undefined} />
            <AvatarFallback className="rounded-lg text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-start text-sm leading-tight">
            <span className="truncate font-semibold">{name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {email}
            </span>
          </div>
          <ChevronsUpDown className="ms-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={8}
        className="min-w-56"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2.5">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={image ?? undefined} />
              <AvatarFallback className="text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {name}
                {username ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    @{username}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* <DropdownMenuItem className="p-0 cursor-pointer" onSelect={(e) => e.preventDefault()}>
          <ThemeSwitcher className="w-full justify-start px-2 rounded-sm" />
        </DropdownMenuItem> */}

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            href="/bezs/settings"
            className="flex items-center gap-2 w-full"
          >
            <Settings2 className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
