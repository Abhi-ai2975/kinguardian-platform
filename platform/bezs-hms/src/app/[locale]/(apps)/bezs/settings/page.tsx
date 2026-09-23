import { Link } from "@/i18n/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Globe,
  KeyRound,
  LayoutGrid,
  MonitorSmartphone,
  Palette,
  Settings,
  Shield,
  UserCircle,
} from "lucide-react";

const settingsGroups = [
  {
    label: "Account",
    items: [
      {
        icon: UserCircle,
        title: "Profile",
        description:
          "Manage your personal information, avatar, and connected accounts.",
        href: "/bezs/settings/profile",
      },
      {
        icon: KeyRound,
        title: "Password & Authentication",
        description:
          "Change your password, email, and configure two-factor authentication.",
        href: "/bezs/settings/security",
      },
      {
        icon: MonitorSmartphone,
        title: "Active Sessions",
        description:
          "View and revoke devices currently signed in to your account.",
        href: "/bezs/settings/sessions",
      },
      {
        icon: Shield,
        title: "Privacy",
        description:
          "Control data visibility, consent, and account activity logs.",
        href: null,
      },
    ],
  },
  {
    label: "Preferences",
    items: [
      {
        icon: Globe,
        title: "Regional Preferences",
        description:
          "Set your country, timezone, date format, currency, and number format.",
        href: null,
      },
      {
        icon: Palette,
        title: "Appearance",
        description: "Choose your theme, accent color, and interface density.",
        href: "/bezs/settings/appearance",
      },
    ],
  },
  {
    label: "Notifications",
    items: [
      {
        icon: Bell,
        title: "Notification Settings",
        description:
          "Control how and when you receive email, push, and SMS alerts.",
        href: null,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        icon: LayoutGrid,
        title: "Integrations",
        description: "Connect third-party apps, manage API keys, and webhooks.",
        href: null,
      },
      {
        icon: CreditCard,
        title: "Billing & Subscription",
        description:
          "View your current plan, manage payment methods, and invoices.",
        href: null,
      },
    ],
  },
];

export default async function BezsSettingsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your account, preferences, and workspace configuration.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {settingsGroups.map((group) => (
            <section key={group.label}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">
                {group.label}
              </h2>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const inner = (
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                          {!item.href && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                              Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight
                        className={`size-4 shrink-0 ${item.href ? "text-muted-foreground" : "text-muted-foreground/30"}`}
                      />
                    </div>
                  );

                  if (item.href) {
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="block hover:bg-muted/50 transition-colors"
                      >
                        {inner}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={item.title}
                      className="opacity-60 cursor-not-allowed"
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
