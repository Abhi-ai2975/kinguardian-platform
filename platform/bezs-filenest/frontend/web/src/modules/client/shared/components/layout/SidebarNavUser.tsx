/**
 * SidebarNavUser — user avatar + dropdown in the sidebar footer.
 *
 * Shows name, email, and avatar initials. Dropdown provides a link to
 * settings and a sign-out action that calls the console's token-clearing
 * endpoint then redirects to /login.
 *
 * @module
 */
"use client";

import { useRouter } from "@/i18n/navigation";
import { ChevronsUpDown, LogOut, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/modules/client/auth/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type TUser = {
  name?: string | null;
  email: string;
  image?: string | null;
};

export function SidebarNavUser({ user }: { user: TUser }) {
  const router = useRouter();
  const { state } = useSidebar();

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
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
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
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="rounded-lg text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user.name ?? "—"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
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
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user.name ?? "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings2 className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
