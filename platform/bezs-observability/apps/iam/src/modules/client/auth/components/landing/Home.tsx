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
  Activity,
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
  ChevronRight,
  Database,
  Server,
  Radio,
  Package,
  BarChart3,
  Building2,
  GitBranch,
  Lock,
  RefreshCw,
  Users,
  Code2,
} from "lucide-react";

// ── Mock Dashboard Preview ──────────────────────────────────────────────────

const MOCK_EVENTS = [
  { severity: "error", message: "Payment gateway timeout", time: "2s ago", env: "prod" },
  { severity: "warn",  message: "Cache miss rate above 40%", time: "18s ago", env: "prod" },
  { severity: "info",  message: "User signup completed",     time: "1m ago",  env: "prod" },
];

const SEVERITY_COLORS: Record<string, string> = {
  error: "bg-red-500/15 text-red-500",
  warn:  "bg-yellow-500/15 text-yellow-500",
  info:  "bg-blue-500/15 text-blue-500",
};

const MOCK_SIDEBAR = [
  { icon: LayoutDashboard, label: "Overview", active: false },
  { icon: FileText,        label: "Logs",     active: true  },
  { icon: Activity,        label: "Traces",   active: false },
  { icon: BarChart3,       label: "Metrics",  active: false },
  { icon: Shield,          label: "Audit",    active: false },
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
          Watcher24 · Log Explorer
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
              Live Events
            </span>
            <Badge variant="secondary" className="text-[10px]">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Streaming
            </Badge>
          </div>
          <div className="space-y-2">
            {MOCK_EVENTS.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase ${SEVERITY_COLORS[e.severity]}`}
                >
                  {e.severity}
                </span>
                <p className="flex-1 truncate text-[11px] font-medium text-foreground">
                  {e.message}
                </p>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {e.time}
                </span>
              </div>
            ))}
          </div>
          {/* Stats mini-row */}
          <div className="mt-4 rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              This Month
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Events", value: "48.2k" },
                { label: "Errors", value: "124" },
                { label: "P95 Latency", value: "142ms" },
              ].map((s) => (
                <div key={s.label} className="text-[10px]">
                  <span className="font-semibold text-foreground">{s.value}</span>
                  <span className="ml-1 text-muted-foreground">{s.label}</span>
                </div>
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
              <Activity className="h-3 w-3" />
              Observability Platform
            </Badge>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
                Real-Time Observability for{" "}
                <span className="text-primary">Every Application</span>
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                Ingest logs, metrics, traces, and audit events from any SDK in
                seconds. Monitor every service, debug faster, and stay ahead of
                production issues.
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
                "Real-Time Streaming",
                "Multi-Tenant",
                "SDK Ready",
                "Audit Logs",
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
    icon: Radio,
    title: "Real-Time Event Streaming",
    description:
      "WebSocket fan-out delivers events to your dashboard the moment they are ingested — no polling, no delays.",
  },
  {
    icon: Building2,
    title: "Multi-Tenant by Design",
    description:
      "Every organisation gets isolated storage, API keys, and role-based access. One platform, many teams.",
  },
  {
    icon: Package,
    title: "SDK-First Ingestion",
    description:
      "Official SDKs for JavaScript, Python, Go, and Rust. Drop in three lines of code and start capturing events.",
  },
  {
    icon: Network,
    title: "Distributed Tracing",
    description:
      "Propagate trace and span IDs across services. Reconstruct the full request journey from a single view.",
  },
  {
    icon: BarChart3,
    title: "Metrics & Alerting",
    description:
      "Track custom counters and gauges. Set threshold alerts and receive webhook notifications on violations.",
  },
  {
    icon: Shield,
    title: "Audit & Compliance",
    description:
      "Immutable append-only audit log with environment tagging. Built for SOC 2, HIPAA, and internal review.",
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
            Purpose-built for engineering teams that need reliable, scalable
            observability without the complexity.
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
    icon: Code2,
    title: "Instrument Your App",
    description:
      "Install the Watcher24 SDK, configure your API key and application ID, and start emitting events.",
    items: ["JS / Python / Go / Rust SDKs", "Single API key per environment", "Works in any runtime", "Zero config defaults"],
  },
  {
    step: "02",
    icon: Layers,
    title: "Ingest in Real Time",
    description:
      "Events flow through the gateway into Redis streams, then get processed and stored in ClickHouse — all in milliseconds.",
    items: [
      "Sub-100ms ingest latency",
      "Batch and single-event API",
      "Plan-based rate limits",
      "Automatic enrichment",
    ],
  },
  {
    step: "03",
    icon: Activity,
    title: "Observe & Act",
    description:
      "Query your event history, follow live streams, set alerts, and drill into traces — all from one console.",
    items: [
      "Live event explorer",
      "Structured search & filters",
      "Distributed trace viewer",
      "Webhook alerts",
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
            From zero to observability in minutes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Three phases that take an uninstrumented service to full real-time visibility.
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

const CODE_EXAMPLE = `import { createClient } from "@watcher24/sdk";

const w24 = createClient({
  apiKey: process.env.W24_API_KEY,
});

// Capture an error
await w24.log({
  severity: "error",
  message: "Payment gateway timeout",
  payload: { provider: "stripe", retries: 3 },
});

// Trace a request
const span = await w24.trace.start("checkout.process");
await processOrder(orderId);
await span.end({ status: "ok", durationMs: 142 });

// Record a metric
await w24.metric({
  name: "api.response_time",
  value: 142,
  unit: "ms",
});`;

const DX_ITEMS = [
  {
    icon: Terminal,
    text: "Typed SDKs for JS, Python, Go, and Rust — install and start in minutes",
  },
  {
    icon: GitBranch,
    text: "Separate environments (production, staging, dev) per application",
  },
  {
    icon: Zap,
    text: "Batch ingestion API — send up to 500 events in a single request",
  },
  {
    icon: Globe,
    text: "OpenAPI-compatible gateway — integrate with any HTTP client",
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
              Official SDKs for every major language with a familiar, chainable
              API. Single API key, automatic batching, and structured payloads
              — so you spend time building features, not plumbing.
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
                watcher24-usage.ts
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
    icon: Globe,
    title: "Web & Mobile Applications",
    description:
      "Capture frontend errors, user actions, and session events in real time. Reproduce bugs with full context — no guessing.",
  },
  {
    icon: Server,
    title: "Backend Services & APIs",
    description:
      "Track request latency, database query times, error rates, and throughput. Detect regressions before your users do.",
  },
  {
    icon: Shield,
    title: "Audit & Compliance",
    description:
      "Immutable audit trail for every user action. Environment-tagged, retention-controlled, and ready for SOC 2 reviews.",
  },
  {
    icon: Network,
    title: "Microservice Architectures",
    description:
      "Propagate trace context across service boundaries. Reconstruct the full call graph for any distributed request.",
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
            Built for real-world engineering teams
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            From solo projects to large-scale distributed systems.
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
    title: "API Key Rotation",
    desc: "Revoke and regenerate API keys instantly. Scoped per application and environment with no service disruption.",
  },
  {
    icon: Lock,
    title: "Plan Limit Enforcement",
    desc: "Monthly event quotas enforced at the gateway — server-side only. Clients cannot influence or bypass the check.",
  },
  {
    icon: Database,
    title: "Tenant Data Isolation",
    desc: "All events are partitioned by organisation ID in ClickHouse. One tenant cannot access another's data.",
  },
  {
    icon: Shield,
    title: "Immutable Audit Log",
    desc: "Audit events are append-only. No update or delete paths exist in the ingestion pipeline.",
  },
  {
    icon: Zap,
    title: "Fail-Open Reliability",
    desc: "ClickHouse downtime never blocks ingestion. The gateway fails open so events keep flowing.",
  },
  {
    icon: Users,
    title: "Role-Based Console Access",
    desc: "Console access gated by organisation membership. Team members only see the data their org owns.",
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
            Every layer of the platform is built with security and predictability
            in mind — from ingestion to storage to access control.
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
          <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardContent className="px-8 py-12">
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Activity className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start observing your applications today
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Free tier includes 100,000 events per month. No credit card
              required to get started.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {session ? (
                <Button asChild size="lg">
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    Open Console
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/auth/sign-up">
                      Create Free Account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/auth/sign-in">Sign In</Link>
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
              <Activity className="h-3.5 w-3.5 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Watcher24
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
            © {new Date().getFullYear()} Watcher24
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
