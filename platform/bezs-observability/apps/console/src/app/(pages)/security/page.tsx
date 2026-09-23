import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Lock,
  Key,
  Database,
  Server,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Security — Watcher24",
  description: "How Watcher24 protects your data and infrastructure.",
};

const PRACTICES = [
  {
    icon: Lock,
    title: "Encryption in transit",
    description:
      "All communication between SDKs, the gateway, and the console is encrypted with TLS 1.2+. We enforce HSTS on all endpoints.",
  },
  {
    icon: Database,
    title: "Encryption at rest",
    description:
      "Data stored in PostgreSQL and ClickHouse is encrypted at rest using AES-256. OAuth tokens and session secrets are additionally encrypted at the application layer.",
  },
  {
    icon: Key,
    title: "API key security",
    description:
      "API keys are hashed with a secure one-way algorithm before storage. Only the hash is persisted — we never store the raw key after generation. Keys can be revoked instantly from the console.",
  },
  {
    icon: Shield,
    title: "Tenant isolation",
    description:
      "Every event is partitioned by organisation ID in ClickHouse. Query paths enforce row-level filters at the application layer — one tenant cannot access another's data.",
  },
  {
    icon: RefreshCw,
    title: "Plan limit enforcement",
    description:
      "Monthly event quotas are enforced server-side in the Go gateway. Clients have no way to influence or bypass the limit — it is resolved from the database on every authenticated request.",
  },
  {
    icon: Server,
    title: "Infrastructure hardening",
    description:
      "Services run in isolated containers. Internal services (Redis, ClickHouse, PostgreSQL) are not exposed to the public internet. Network access follows the principle of least privilege.",
  },
  {
    icon: Eye,
    title: "Audit logging",
    description:
      "All authentication events, permission changes, and administrative actions are captured in an immutable append-only audit log. Audit events cannot be modified or deleted.",
  },
  {
    icon: AlertTriangle,
    title: "Rate limiting",
    description:
      "The ingest gateway and auth endpoints are rate-limited per key and per IP to prevent abuse. Failed authentication attempts are subject to exponential back-off.",
  },
];

const COMPLIANCE = [
  "TLS 1.2+ enforced on all endpoints",
  "AES-256 encryption at rest",
  "Secrets never stored in plaintext",
  "Immutable audit trail",
  "Role-based access control (RBAC)",
  "Session invalidation on password reset",
  "Scoped API keys with instant revocation",
  "Multi-factor authentication (2FA) available",
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 space-y-16">

      {/* Header */}
      <div className="space-y-5">
        <Badge variant="secondary">Security</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Security at Watcher24
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Watcher24 is designed with security as a first-class concern. This page
          documents the controls, practices, and architecture decisions we use to
          protect your data and your customers&apos; data.
        </p>
      </div>

      {/* Security practices */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Security practices</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PRACTICES.map(({ icon: Icon, title, description }) => (
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

      {/* Compliance checklist */}
      <section className="space-y-5">
        <h2 className="text-2xl font-bold tracking-tight">Security checklist</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {COMPLIANCE.map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Responsible disclosure */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Responsible disclosure
        </h2>
        <p className="text-muted-foreground leading-relaxed text-sm">
          If you discover a security vulnerability in Watcher24, please report it
          to us privately before disclosing it publicly. We will acknowledge your
          report within 48 hours, keep you informed of our progress, and publicly
          credit you (if you wish) once the issue is resolved.
        </p>
        <p className="text-muted-foreground text-sm">
          Please do not use automated scanners against our production environment
          or attempt to access data that does not belong to your account.
        </p>
        <div className="rounded-lg border bg-muted/30 p-5 space-y-2">
          <p className="text-sm font-semibold">Report a vulnerability</p>
          <p className="text-sm text-muted-foreground">
            Email:{" "}
            <a
              href="mailto:security@watcher24.dev"
              className="text-primary underline underline-offset-4"
            >
              security@watcher24.dev
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            Please include a description of the issue, steps to reproduce, and the
            potential impact. We aim to resolve critical issues within 7 days.
          </p>
        </div>
      </section>

      {/* Questions */}
      <section className="rounded-xl border bg-muted/30 p-8 text-center space-y-3">
        <h2 className="text-xl font-bold">Security questions?</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          For enterprise security reviews, compliance questionnaires, or any other
          security-related questions, reach out directly.
        </p>
        <p className="text-sm font-medium">
          <a
            href="mailto:security@watcher24.dev"
            className="underline underline-offset-4 hover:text-primary transition-colors"
          >
            security@watcher24.dev
          </a>
        </p>
      </section>
    </div>
  );
}
