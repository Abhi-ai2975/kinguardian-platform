import { PublicNavbar } from "@/modules/client/shared/navbar/PublicNavbar";
import {
  getServerSession,
  type TServerSession,
} from "@/modules/server/auth-provider/auth-server";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await getServerSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar session={session} />

      <div className="flex flex-1">
        {/* ── Left branding panel (desktop only) ── */}
        <div className="relative hidden lg:flex lg:w-[480px] flex-shrink-0 flex-col justify-between overflow-hidden bg-muted border-r border-border p-12">
          {/* Subtle dot-grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: [
                "linear-gradient(var(--foreground) 1px, transparent 1px)",
                "linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              ].join(", "),
              backgroundSize: "36px 36px",
            }}
          />

          {/* Middle — tagline */}
          <div className="relative z-10 space-y-4">
            <h2 className="text-[2rem] font-bold leading-tight tracking-tight text-foreground">
              Identity infrastructure for modern healthcare
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Secure authentication for apps, services, and devices.
            </p>
          </div>

          {/* Bottom — copyright */}
          <p className="relative z-10 text-xs text-muted-foreground">
            © {new Date().getFullYear()} AlphaesAI. All rights reserved.
          </p>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
