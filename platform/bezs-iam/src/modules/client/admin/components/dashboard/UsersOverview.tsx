import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";

interface UsersOverviewProps {
  users: TUserSchema[];
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  superadmin: "destructive",
  admin: "default",
  guest: "secondary",
};

export function UsersOverview({ users }: UsersOverviewProps) {
  const recent = users.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Users</CardTitle>
        <CardDescription>Latest registered accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recent.map((user) => {
          const role = user.role ?? "guest";
          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <div key={user.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-none">
                  {user.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <Badge
                variant={ROLE_VARIANT[role] ?? "outline"}
                className="flex-shrink-0 text-[10px]"
              >
                {role}
              </Badge>
            </div>
          );
        })}
        {users.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No users yet</p>
        )}
      </CardContent>
    </Card>
  );
}
