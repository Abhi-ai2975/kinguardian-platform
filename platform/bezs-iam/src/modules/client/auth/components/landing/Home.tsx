"use client";

import type { TServerSession } from "@/modules/server/auth-provider/auth-server";
import { PublicNavbar } from "@/modules/client/shared/navbar/PublicNavbar";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Users,
  Key,
  Lock,
  Code2,
  Building2,
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
  FileText,
  Shield,
  Terminal,
  Network,
  Layers,
  UserCheck,
  Activity,
  GitBranch,
  ChevronRight,
  RefreshCw,
  Database,
  Server,
} from "lucide-react";

// ── Mock Dashboard Preview ──────────────────────────────────────────────────

const MOCK_USERS = [
  { name: "Alice Chen", email: "alice@corp.com", role: "superadmin" },
  { name: "Bob Smith", email: "bob@corp.com", role: "admin" },
  { name: "Carol White", email: "carol@corp.com", role: "guest" },
];

const MOCK_SIDEBAR = [
  { icon: LayoutDashboard, label: "Overview", active: false },
  { icon: Users, label: "Users", active: true },
  { icon: Building2, label: "Orgs", active: false },
  { icon: Shield, label: "Roles", active: false },
  { icon: Key, label: "API Keys", active: false },
];

function DashboardPreview() {
  return (
    <Card className="w-full overflow-hidden border shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-4 py-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">
          IAM Admin · Users
        </span>
      </div>
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-32 shrink-0 border-r bg-muted/30 py-3 sm:block">
          {MOCK_SIDEBAR.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2 px-3 py-2 text-[11px] ${
                active
                  ? "bg-background font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </div>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Members
            </span>
            <Badge variant="secondary" className="text-[10px]">
              3 users
            </Badge>
          </div>
          <div className="space-y-2">
            {MOCK_USERS.map((u) => (
              <div
                key={u.email}
                className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {u.name[0]}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium leading-none text-foreground">
                      {u.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={u.role === "superadmin" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {u.role}
                </Badge>
              </div>
            ))}
          </div>
          {/* Permissions mini-row */}
          <div className="mt-4 rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Active Permissions
            </p>
            <div className="flex flex-wrap gap-1">
              {["patients:read", "reports:create", "users:manage"].map((p) => (
                <span
                  key={p}
                  className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Hero Section ────────────────────────────────────────────────────────────

function HeroSection({ session }: { session: TServerSession }) {
  return (
    <section className="relative overflow-hidden border-b bg-background">
      {/* Dot-grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: [
            "linear-gradient(var(--foreground) 1px, transparent 1px)",
            "linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Text */}
          <div className="space-y-8">
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Identity &amp; Access Management
            </Badge>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
                Secure Authentication &amp;{" "}
                <span className="text-primary">Authorization</span> for Modern
                Applications
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                A flexible IAM platform designed for internal systems — with
                multi-tenant support, fine-grained RBAC, and OAuth&nbsp;2.1
                built in.
              </p>
            </div>

            {session ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Signed in as{" "}
                  <span className="font-medium text-foreground">
                    {session.user.name}
                  </span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/auth/sign-in">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auth/sign-up">Create Account</Link>
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {[
                "OAuth 2.1 / OIDC",
                "Multi-Tenant",
                "Fine-Grained RBAC",
                "JWT + Refresh Tokens",
              ].map((f) => (
                <span key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-3xl bg-linear-to-tr from-primary/5 via-transparent to-muted/20 blur-2xl"
            />
            <div className="relative">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features Section ────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Building2,
    title: "Multi-Tenant Architecture",
    description:
      "Manage multiple organizations and teams with isolated namespaces, memberships, and permission scopes.",
  },
  {
    icon: Shield,
    title: "Fine-Grained RBAC",
    description:
      "Define roles with granular permission sets. DENY always overrides ALLOW for predictable access control.",
  },
  {
    icon: Globe,
    title: "OAuth 2.1 & OIDC",
    description:
      "Act as a full OAuth 2.1 authorization server. Issue access, refresh, and ID tokens for connected apps.",
  },
  {
    icon: Code2,
    title: "Developer-Friendly APIs",
    description:
      "Type-safe server actions, a clean client SDK, and an auto-generated OpenAPI spec for seamless integration.",
  },
  {
    icon: Key,
    title: "Token Management",
    description:
      "JWT with configurable expiry, refresh token rotation, API keys, and token revocation built in.",
  },
  {
    icon: Activity,
    title: "Session & Audit",
    description:
      "Database-backed sessions with cookie caching, two-factor authentication, and audit trail hooks.",
  },
];

function FeaturesSection() {
  return (
    <section className="bg-muted/20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            Platform Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need in one platform
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Purpose-built for internal systems that require reliable, scalable
            identity management.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="group border bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ────────────────────────────────────────────────────────────

const STEPS = [
  {
    step: "01",
    icon: UserCheck,
    title: "Authenticate Users",
    description:
      "Support email/password, social OAuth (GitHub, Google), magic links, and two-factor OTP authentication.",
    items: ["Email & Password", "OAuth Providers", "Magic Links", "2FA / OTP"],
  },
  {
    step: "02",
    icon: Layers,
    title: "Assign Roles & Permissions",
    description:
      "Create roles with fine-grained permissions scoped to organizations and teams. Supports role inheritance.",
    items: [
      "Custom role definitions",
      "Permission inheritance",
      "Team-level scoping",
      "Dynamic access control",
    ],
  },
  {
    step: "03",
    icon: Lock,
    title: "Enforce Access Control",
    description:
      "Validate permissions on every request. The resolver computes effective permissions with DENY precedence.",
    items: [
      "Per-request validation",
      "DENY overrides ALLOW",
      "Cached permission sets",
      "API key enforcement",
    ],
  },
];

function HowItWorksSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            How It Works
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple flow, powerful control
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Three phases that take a user from identity to authorized action.
          </p>
        </div>

        <div className="relative grid gap-6 lg:grid-cols-3">
          {STEPS.map(({ step, icon: Icon, title, description, items }, i) => (
            <div key={step} className="relative">
              <Card className="h-full border bg-card">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-3xl font-bold text-muted-foreground/25">
                      {step}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              {/* Arrow connector (desktop) */}
              {i < STEPS.length - 1 && (
                <div className="absolute -right-3 top-9 z-10 hidden lg:flex">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Developer Experience ─────────────────────────────────────────────────────

const CODE_EXAMPLE = `import { authClient } from "@/modules/client/auth/auth-client";

// Authenticate
const { data: session } = await authClient.signIn.email({
  email: "user@example.com",
  password: "••••••••",
});

// Resolve effective permissions
const result = await resolvePermissionsAction({
  userId: session.user.id,
  organizationId: "org_01HV...",
});
// {
//   allow: ["patients:read", "reports:create"],
//   deny:  ["patients:delete"],
//   final: ["patients:read", "reports:create"]
// }

// Enforce in a server action or API route
await requirePermission("patients:read", organizationId);`;

const DX_ITEMS = [
  {
    icon: Terminal,
    text: "ZSA server actions with full TypeScript type safety",
  },
  {
    icon: GitBranch,
    text: "Clean Architecture — use cases, controllers, services",
  },
  {
    icon: Zap,
    text: "Permission caching with 60 s TTL and automatic invalidation",
  },
  {
    icon: FileText,
    text: "Auto-generated OpenAPI spec via Better Auth plugin",
  },
];

function DeveloperSection() {
  return (
    <section className="bg-muted/20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          {/* Left */}
          <div className="space-y-6">
            <Badge variant="secondary">Developer Experience</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Integrate in minutes, not days
            </h2>
            <p className="text-muted-foreground">
              Type-safe server actions, a clean client SDK, and a permission
              resolver that gives you the full picture — allowed, denied, and
              effective permissions in one call.
            </p>
            <ul className="space-y-3">
              {DX_ITEMS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Code block */}
          <Card className="overflow-hidden border">
            <div className="flex items-center gap-1.5 border-b bg-muted/60 px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                auth-usage.ts
              </span>
            </div>
            <CardContent className="p-0">
              <pre className="overflow-x-auto bg-muted/20 p-5 text-[12px] leading-relaxed">
                <code className="font-mono text-foreground">
                  {CODE_EXAMPLE}
                </code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// ── Use Cases ────────────────────────────────────────────────────────────────

const USE_CASES = [
  {
    icon: LayoutDashboard,
    title: "Internal Admin Dashboards",
    description:
      "Gate every admin route and server action behind role checks. Superadmin, admin, and guest roles configured out of the box.",
  },
  {
    icon: Building2,
    title: "Enterprise Applications",
    description:
      "Manage hundreds of users across isolated tenants with per-org roles, teams, and permission inheritance.",
  },
  {
    icon: Network,
    title: "Multi-Tenant Systems",
    description:
      "Each organization gets its own role hierarchy and permission set. Members are scoped to their tenant namespace.",
  },
  {
    icon: Server,
    title: "Platform-Level Access Control",
    description:
      "Issue OAuth 2.1 tokens for service-to-service communication. Enforce scopes and audiences consistently.",
  },
];

function UseCasesSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            Use Cases
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for real-world systems
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            From small internal tools to large enterprise platforms.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {USE_CASES.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="flex gap-4 border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Security & Reliability ───────────────────────────────────────────────────

const SECURITY_ITEMS = [
  {
    icon: RefreshCw,
    title: "Token Rotation",
    desc: "Automatic refresh token rotation with configurable TTL and instant revocation support.",
  },
  {
    icon: Shield,
    title: "Role Enforcement",
    desc: "Server-side permission checks on every protected action and route via ZSA procedures.",
  },
  {
    icon: Database,
    title: "Persistent Sessions",
    desc: "Database-backed sessions with 60 s cookie caching for performance without sacrificing accuracy.",
  },
  {
    icon: Lock,
    title: "Audit Support",
    desc: "Track authentication events and permission changes with database hooks and middleware.",
  },
  {
    icon: Zap,
    title: "Scalable Architecture",
    desc: "Clean Architecture with DI container. Swap infrastructure adapters without touching business logic.",
  },
  {
    icon: Users,
    title: "Multi-Factor Auth",
    desc: "Email OTP 2FA and magic link authentication available for sensitive admin operations.",
  },
];

function SecuritySection() {
  return (
    <section className="border-y bg-muted/20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            Security &amp; Reliability
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Secure by design
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Every layer of the platform is designed with security and
            predictability in mind.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-background">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ──────────────────────────────────────────────────────────────

function CtaSection({ session }: { session: TServerSession }) {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Card className="overflow-hidden border text-center shadow-xl">
          {/* Subtle top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardContent className="px-8 py-12">
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start integrating IAM into your applications
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Your authentication and authorization infrastructure, ready to
              use.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {session ? (
                <Button asChild size="lg">
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    Access Platform
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/auth/sign-in">
                      Access Platform
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/auth/sign-up">Create Account</Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

const FOOTER_LINKS = [
  { label: "Documentation", href: "/api/auth/reference" },
  { label: "Admin", href: "/admin" },
  { label: "Sign In", href: "/auth/sign-in" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];

function FooterSection() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              AlphaesAI IAM
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AlphaesAI
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Home({ session }: { session: TServerSession }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar session={session} />
      <main className="flex-1">
        <HeroSection session={session} />
        <FeaturesSection />
        <HowItWorksSection />
        <DeveloperSection />
        <UseCasesSection />
        <SecuritySection />
        <CtaSection session={session} />
      </main>
      <FooterSection />
    </div>
  );
}

export default Home;
