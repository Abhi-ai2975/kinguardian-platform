// Root page — marketing landing page for Watcher24.
// Server component so we can read the session and pass isAuthenticated
// to the client nav without an extra client-side fetch.
import Link from "next/link";
import {
  Activity,
  Shield,
  Zap,
  GitBranch,
  BarChart2,
  ArrowRight,
  Terminal,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HomeNav } from "@/components/marketing/HomeNav";
import { PricingSection } from "@/components/marketing/PricingSection";
import { getServerSession } from "@/lib/auth-server";

export default async function HomePage() {
  const session = await getServerSession();
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeNav isAuthenticated={isAuthenticated} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[500px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Zap className="h-3 w-3" />
            Now in open beta
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Full-stack observability
            <br />
            <span className="text-primary">without the complexity</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
            Watcher24 ingests logs, metrics, traces, and audit events from any SDK.
            Replay events, drill into user sessions, and stay ahead of incidents —
            all from one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <Button asChild size="lg">
                <Link href="/overview">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/login">
                    Start for free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/docs">Read the docs</Link>
                </Button>
              </>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required · Free tier forever · 5-minute setup
          </p>
        </div>

        {/* Code terminal mockup */}
        <div className="relative mx-auto mt-16 max-w-2xl rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-200 dark:border-white/10">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-xs text-zinc-400 dark:text-white/40 font-mono">terminal</span>
          </div>
          <pre className="p-5 text-sm font-mono leading-7 overflow-x-auto">
            <code>
              <span className="text-zinc-400 dark:text-white/40"># Install the SDK</span>
              {"\n"}
              <span className="text-green-600 dark:text-green-400">$</span>
              <span className="text-zinc-800 dark:text-white"> npm install @watcher/node</span>
              {"\n\n"}
              <span className="text-zinc-400 dark:text-white/40"># Send your first event</span>
              {"\n"}
              <span className="text-blue-600 dark:text-blue-400">import</span>
              <span className="text-zinc-800 dark:text-white"> {"{"} createNodeClient {"}"} </span>
              <span className="text-blue-600 dark:text-blue-400">from</span>
              <span className="text-amber-600 dark:text-yellow-300"> &apos;@watcher/node&apos;</span>
              {"\n\n"}
              <span className="text-blue-600 dark:text-blue-400">const</span>
              <span className="text-zinc-800 dark:text-white"> w = </span>
              <span className="text-amber-600 dark:text-yellow-300">createNodeClient</span>
              <span className="text-zinc-800 dark:text-white">{"({ apiKey: process.env.W24_API_KEY })"}</span>
              {"\n\n"}
              <span className="text-zinc-800 dark:text-white">w.</span>
              <span className="text-amber-600 dark:text-yellow-300">audit</span>
              <span className="text-zinc-800 dark:text-white">{"({ "}</span>
              <span className="text-green-600 dark:text-green-300">&apos;user.login&apos;</span>
              <span className="text-zinc-800 dark:text-white">{", { userId } })"}</span>
              {"\n"}
              <span className="text-zinc-400 dark:text-white/40">{"// → event ingested in < 50ms"}</span>
            </code>
          </pre>
        </div>
      </section>

      {/* ── Social proof / logos ─────────────────────────────────── */}
      <section className="py-10 border-y bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
            Trusted by engineering teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-50 grayscale">
            {["Acme Corp", "Startup Labs", "BuildCo", "DevHouse", "Launchpad"].map(
              (name) => (
                <span key={name} className="text-sm font-semibold">
                  {name}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything your team needs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From raw log ingestion to structured audit trails, Watcher24 covers
              the full observability surface of your stack.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-6 hover:border-primary/40 transition-colors"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 bg-muted/30">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How it works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Up and running in minutes
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three steps from sign-up to your first dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+2.5rem)] right-0 h-px bg-border" />
                )}
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background text-primary font-bold text-lg">
                  {i + 1}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <PricingSection isAuthenticated={isAuthenticated} />

      {/* ── CTA banner ───────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to ship with confidence?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            Join hundreds of teams using Watcher24 to debug faster, stay
            compliant, and sleep better at night.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href={isAuthenticated ? "/overview" : "/login"}>
                {isAuthenticated ? "Go to Dashboard" : "Create free account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/docs/quickstart">See quickstart guide</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-sm">Watcher24</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Observability and audit logging for modern applications.
              </p>
            </div>

            {FOOTER_LINKS.map((col) => (
              <div key={col.heading}>
                <h4 className="text-sm font-semibold mb-3">{col.heading}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Watcher24. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">v0.1.0 · MVP</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Static data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Activity,
    title: "Real-time logs",
    description:
      "Stream structured logs from any service. Full-text search, severity filters, and live tail.",
  },
  {
    icon: BarChart2,
    title: "Metrics & dashboards",
    description:
      "Track counters, gauges, and histograms. Build custom dashboards with drag-and-drop widgets.",
  },
  {
    icon: GitBranch,
    title: "Distributed tracing",
    description:
      "Visualise request flows across microservices. Identify bottlenecks with flame graphs.",
  },
  {
    icon: Shield,
    title: "Audit trail",
    description:
      "Immutable audit log for every action. Built-in compliance exports for SOC 2 and GDPR.",
  },
  {
    icon: Lock,
    title: "Multi-tenant IAM",
    description:
      "Organisations, roles, and API keys out of the box. SSO via OAuth2 and SAML.",
  },
  {
    icon: Globe,
    title: "SDKs for every stack",
    description:
      "Official clients for JavaScript, Python, Go, and Rust. OpenTelemetry-compatible.",
  },
];

const STEPS = [
  {
    title: "Create an account",
    description:
      "Sign up, create your organisation, and grab an API key — takes under two minutes.",
  },
  {
    title: "Install the SDK",
    description:
      "Add one package to your app and initialise with your key. Works with any framework.",
  },
  {
    title: "See events live",
    description:
      "Events appear on your dashboard in real time. Set up alerts for what matters.",
  },
];


const FOOTER_LINKS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "/docs/changelog" },
      { label: "Roadmap", href: "/docs" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "API reference", href: "/docs/api/ingestion" },
      { label: "SDKs", href: "/docs/sdks/javascript" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security", href: "/security" },
    ],
  },
];
