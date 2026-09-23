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
import { authClient } from "@/modules/client/auth/betterauth/auth-client";
import { LogOut, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

type TUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
};

export function NavUser({ user }: { user: TUser }) {
  const { name, email, image, username } = user;

  async function handleLogout() {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage src={image ?? undefined} />
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="min-w-56"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2.5">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={image ?? undefined} />
              <AvatarFallback className="text-sm font-semibold">
                {name.charAt(0).toUpperCase()}
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
