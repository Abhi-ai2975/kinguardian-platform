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
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
// import { signOut } from "@/modules/client/auth/server-actions/auth-actions";
// import { ThemeSwitcher } from "@/theme/theme-switcher";
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Globe,
  LogOut,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useSession } from "../auth/auth-client";
import { NavUserSkeleton } from "./NavUserSkeleton";
import { signoutAction } from "@/modules/server/presentation/actions/auth";

export function NavUser({ isSidebar = false }: { isSidebar?: boolean }) {
  const { data, isPending, isRefetching } = useSession();
  const router = useRouter();
  const { state } = useSidebar();

  const { execute } = useServerAction(signoutAction, {
    onError(ctx) {
      toast("Error!", {
        description: ctx.err.message,
      });
    },
  });

  async function handleLogout() {
    await execute({});
  }

  if (isPending || isRefetching) {
    return <NavUserSkeleton isSidebar={isSidebar} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isSidebar ? (
          <SidebarMenuButton
            size="lg"
            className={cn(
              state === "expanded" &&
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
              "cursor-pointer",
            )}
          >
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage
                  src={data?.user.image || "https://github.com/shadcn.png"}
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">
                  {data?.user.name}
                </span>
                <span className="truncate text-xs">{data?.user.email}</span>
              </div>
            </div>
            <ChevronsUpDown className="ms-auto size-4" />
          </SidebarMenuButton>
        ) : (
          <Avatar className="cursor-pointer">
            <AvatarImage
              src={data?.user.image || "https://github.com/shadcn.png"}
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" sideOffset={10} asChild>
        <div>
          <DropdownMenuLabel className="flex items-center gap-2">
            <Avatar>
              <AvatarImage
                src={data?.user.image || "https://github.com/shadcn.png"}
              />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <p>
                {data?.user.name}{" "}
                {data?.user.username ? `@(${data?.user.username})` : ""}
              </p>
              <p>{data?.user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer"
            // onClick={() => router.push("/bezs/settings")}
          >
            <Link
              href="/bezs/dashboard/settings/account"
              className="flex items-center gap-2 cursor-pointer w-full"
            >
              <Settings2 className="!h-[1.2rem] !w-[1.2rem] dark:text-white block" />
              <p>Settings</p>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Fourth element */}
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={handleLogout}
            onMouseEnter={() => router.prefetch("/")}
          >
            <LogOut className="!h-[1.2rem] !w-[1.2rem] dark:text-white" />
            <p>Logout</p>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
