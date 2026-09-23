/**
 * Footer — marketing site footer with brand, links, and copyright.
 * @module
 */
import Link from "next/link";
import { HardDrive } from "lucide-react";

const FOOTER_LINKS = [
  { href: "/features/storage",    label: "Storage" },
  { href: "/features/processing", label: "Processing" },
  { href: "/features/search",     label: "Search" },
  { href: "/features/compliance", label: "Compliance" },
  { href: "/docs",                label: "Docs" },
] as const;

export function Footer() {
  return (
    <footer className="border-t py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardDrive className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-sm">FileNest</span>
        </Link>

        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-foreground transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} FileNest
        </p>
      </div>
    </footer>
  );
}
