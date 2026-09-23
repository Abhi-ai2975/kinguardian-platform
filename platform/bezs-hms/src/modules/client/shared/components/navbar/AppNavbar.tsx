"use client";

import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CommandSearch } from "./CommandSearch";
import { AppLauncher } from "./AppLauncher";
import { NavUser } from "../NavUser";
import LocaleSwitcher from "../LocaleSwitcher";
import { ThemeSwitcher } from "@/theme/ThemeSwitcher";
import BreadCrumb from "@/modules/client/shared/components/BreadCrumb";
import { useRouteConfig } from "@/modules/client/shared/hooks/useRouteConfig";

type TUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
};

const AppNavbar = ({ user, apps }: { user: TUser; apps: unknown[] }) => {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { navbarBreadcrumbs } = useRouteConfig();

  useEffect(() => {
    const handleScroll = () => {
      const h = headerRef.current?.offsetHeight || 68;
      setScrolled(window.scrollY > h);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 left-0 z-50 w-full bg-background transition-shadow duration-300",
        scrolled && "shadow-sm",
      )}
    >
      <nav className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger
            className="cursor-pointer max-md:scale-125"
            variant="outline"
          />
          <Separator orientation="vertical" className="h-6!" />
          <CommandSearch apps={apps} user={user} />
          {navbarBreadcrumbs && (
            <>
              <Separator orientation="vertical" className="h-6!" />
              <BreadCrumb className="[&_ol]:gap-1.5 [&_a]:text-sm [&_.text-primary]:text-sm" />
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <ThemeSwitcher />
          <Bell className="h-5 w-5 text-zinc-500 dark:text-zinc-300 cursor-pointer" />
          <AppLauncher apps={apps} />
          <NavUser user={user} />
        </div>
      </nav>
    </header>
  );
};

export default AppNavbar;
