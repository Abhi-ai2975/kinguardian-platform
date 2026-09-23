import Link from "next/link";
import { Zap } from "lucide-react";
import { HomeNav } from "@/components/marketing/HomeNav";
import { getServerSession } from "@/lib/auth-server";

export default async function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <HomeNav isAuthenticated={!!session} />

      <main className="flex-1 pt-20">{children}</main>

      <footer className="border-t py-8 px-4 sm:px-6 mt-16">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm">Watcher24</span>
          </Link>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Watcher24
          </p>
        </div>
      </footer>
    </div>
  );
}
