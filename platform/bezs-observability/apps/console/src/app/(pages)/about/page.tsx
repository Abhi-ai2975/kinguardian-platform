import { Badge } from "@/components/ui/badge";
import { Activity, Shield, Zap, Globe, Users, Code2 } from "lucide-react";

export const metadata = {
  title: "About — Watcher24",
  description: "Learn about Watcher24 and our mission to make observability accessible for every engineering team.",
};

const VALUES = [
  {
    icon: Zap,
    title: "Simplicity first",
    description:
      "Three lines of code to start. No sprawling YAML configs, no week-long onboarding. If it isn't easy to set up, it won't get used.",
  },
  {
    icon: Activity,
    title: "Real-time by default",
    description:
      "Events appear on your dashboard the moment they are ingested. Observability that lags by minutes isn't observability — it's archaeology.",
  },
  {
    icon: Shield,
    title: "Security without compromise",
    description:
      "Tenant isolation, plan-limit enforcement at the gateway, API key scoping, and immutable audit logs. Security is built into every layer, not bolted on.",
  },
  {
    icon: Globe,
    title: "Every stack, every language",
    description:
      "Official SDKs for JavaScript, Python, Go, and Rust. OpenTelemetry-compatible so you keep your existing instrumentation.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description:
      "Multi-tenant from day one. Organisations, roles, and API keys so every team member has exactly the access they need — no more, no less.",
  },
  {
    icon: Code2,
    title: "Developer experience matters",
    description:
      "Typed SDKs, structured payloads, and an OpenAPI-compatible gateway. We eat our own dog food — Watcher24 is monitored by Watcher24.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 space-y-20">

      {/* Hero */}
      <section className="text-center space-y-5">
        <Badge variant="secondary">About Watcher24</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Observability for every engineering team
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Watcher24 is a multi-tenant observability platform that ingests logs,
          metrics, traces, and audit events from any SDK in seconds. We believe
          every team — not just the ones with dedicated SRE staffing — deserves
          production visibility without the complexity.
        </p>
      </section>

      {/* Mission */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Our mission</h2>
        <p className="text-muted-foreground leading-relaxed">
          Production incidents cost teams hours they don&apos;t have. Root-cause
          analysis shouldn&apos;t require digging through a dozen disconnected tools
          across three browser tabs. We built Watcher24 to give engineering teams a
          single place where logs, traces, metrics, and audit events come together —
          searchable, filterable, and streaming live.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          We started from scratch with a clean architecture: a Go ingestion gateway
          that handles high throughput at low latency, ClickHouse for analytical
          queries over billions of events, Redis Streams for real-time fan-out, and
          a Next.js console that shows you what&apos;s happening right now. No legacy
          cruft, no hidden complexity.
        </p>
      </section>

      {/* Values */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">What we stand for</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">The stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            ["Ingestion",    "Go · Fiber · Redis Streams"],
            ["Storage",      "ClickHouse · PostgreSQL"],
            ["Processing",   "Python workers"],
            ["Real-time",    "Go · WebSocket fan-out"],
            ["Console",      "Next.js 15 · Tailwind"],
            ["Auth",         "Better Auth · OAuth 2.1"],
          ].map(([layer, tech]) => (
            <div key={layer} className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {layer}
              </p>
              <p className="font-medium text-foreground">{tech}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-xl border bg-muted/30 p-8 text-center space-y-3">
        <h2 className="text-xl font-bold">Get in touch</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Have a question, a feature request, or a security concern? We&apos;d love to
          hear from you.
        </p>
        <p className="text-sm font-medium">
          <a
            href="mailto:hello@watcher24.dev"
            className="underline underline-offset-4 hover:text-primary transition-colors"
          >
            hello@watcher24.dev
          </a>
        </p>
      </section>
    </div>
  );
}
