"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function NavUserSkeleton({
  isSidebar = false,
}: {
  isSidebar?: boolean;
}) {
  if (isSidebar) {
    return (
      <SidebarMenuButton size="lg" className="cursor-default">
        <div className="flex items-center gap-2 w-full">
          <Avatar>
            <Skeleton className="h-8 w-8 rounded-full" />
          </Avatar>

          <div className="grid flex-1 text-start gap-1">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-3 w-[160px]" />
          </div>
        </div>
      </SidebarMenuButton>
    );
  }

  return (
    <Avatar>
      <Skeleton className="h-8 w-8 rounded-full" />
    </Avatar>
  );
}
