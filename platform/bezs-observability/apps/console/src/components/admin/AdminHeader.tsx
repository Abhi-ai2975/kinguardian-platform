// AdminHeader — sticky top bar for the admin section.
// Shows a "Superadmin" badge and the authenticated user's name.
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Props {
  userName: string;
  userEmail: string;
}

export function AdminHeader({ userName, userEmail }: Props) {
  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background/80 backdrop-blur-sm flex items-center gap-4 px-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        <span className="font-semibold text-sm">Admin</span>
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          SUPERADMIN
        </Badge>
      </div>
      <div className="flex-1" />
      <ThemeToggle />
      <div className="text-xs text-muted-foreground text-right">
        <p className="font-medium text-foreground">{userName}</p>
        <p>{userEmail}</p>
      </div>
    </header>
  );
}
