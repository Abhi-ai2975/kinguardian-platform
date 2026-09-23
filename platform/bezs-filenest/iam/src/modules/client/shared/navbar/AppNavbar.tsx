"use client";

import { Bell } from "lucide-react";

import { NavUser } from "../NavUser";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/theme/ThemeSwitcher";
import LocaleSwitcher from "../LocaleSwitcher";
import { AppBreadcrumb } from "./AppBreadcrumb";

const AppNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const headerHeight = headerRef.current?.offsetHeight || 68;
      if (window.scrollY > headerHeight) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
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
          <Separator orientation="vertical" className="!h-6" />
          <AppBreadcrumb />
        </div>

        <div className="flex items-center gap-6">
          <div>
            <LocaleSwitcher />
          </div>
          <Bell className="h-5 w-5 block text-zinc-500 dark:text-zinc-300 cursor-pointer" />
          <ThemeSwitcher />
          <NavUser />
        </div>
      </nav>
    </header>
  );
};

export default AppNavbar;
