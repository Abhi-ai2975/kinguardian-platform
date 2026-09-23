import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Privacy Policy — Watcher24",
  description: "How Watcher24 collects, uses, and protects your data.",
};

const LAST_UPDATED = "1 June 2025";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 space-y-12">

      {/* Header */}
      <div className="space-y-4">
        <Badge variant="secondary">Legal</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        <p className="text-muted-foreground leading-relaxed">
          This Privacy Policy explains how Watcher24 (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects,
          uses, and safeguards your information when you use our observability
          platform and related services.
        </p>
      </div>

      <Section title="1. Information we collect">
        <p>
          <span className="font-medium text-foreground">Account data</span> — When
          you register, we collect your name, email address, and a hashed password.
          If you sign in via Google or GitHub, we receive the profile data those
          providers share with us.
        </p>
        <p>
          <span className="font-medium text-foreground">Organisation data</span> —
          Organisation name, slug, and member details you enter while configuring
          your workspace.
        </p>
        <p>
          <span className="font-medium text-foreground">Telemetry events</span> —
          Log entries, metrics, traces, and audit events submitted by your
          applications via the ingest API. This data is stored on your behalf and
          scoped to your organisation.
        </p>
        <p>
          <span className="font-medium text-foreground">Billing data</span> —
          Subscription status and plan information managed by Stripe. We do not
          store raw card numbers; all payment processing is handled by Stripe.
        </p>
        <p>
          <span className="font-medium text-foreground">Usage metadata</span> —
          IP addresses, SDK versions, and runtime tags attached to ingested events
          to aid debugging and regional routing.
        </p>
      </Section>

      <Section title="2. How we use your information">
        <p>We use collected data to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Provide, operate, and improve the Watcher24 platform.</li>
          <li>Authenticate your identity and secure your account.</li>
          <li>Enforce subscription plan limits and process billing.</li>
          <li>Send transactional emails (verification, password reset, invoices).</li>
          <li>Monitor platform health and detect abuse.</li>
          <li>Comply with legal obligations.</li>
        </ul>
        <p>
          We do not sell your data or your customers&apos; telemetry data to third
          parties. We do not use telemetry event content for advertising.
        </p>
      </Section>

      <Section title="3. Data retention">
        <p>
          Telemetry events are retained according to your subscription plan:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <span className="font-medium text-foreground">Free</span> — 7 days
          </li>
          <li>
            <span className="font-medium text-foreground">Pro</span> — 90 days
          </li>
          <li>
            <span className="font-medium text-foreground">Enterprise</span> — 1 year
            (configurable)
          </li>
        </ul>
        <p>
          Account data is retained for as long as your account remains active.
          Upon account deletion, personal data is removed within 30 days, except
          where retention is required by law.
        </p>
      </Section>

      <Section title="4. Data sharing">
        <p>
          We share data only with the following categories of sub-processors:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <span className="font-medium text-foreground">Stripe</span> — payment
            processing and subscription management.
          </li>
          <li>
            <span className="font-medium text-foreground">Cloud infrastructure
            providers</span> — hosting, storage, and compute (servers located in
            the EU/US).
          </li>
          <li>
            <span className="font-medium text-foreground">Email delivery
            providers</span> — transactional emails only.
          </li>
        </ul>
        <p>
          We may disclose information if required by law, regulation, or valid
          legal process.
        </p>
      </Section>

      <Section title="5. Cookies and tracking">
        <p>
          We use strictly necessary session cookies to keep you signed in. We do
          not use third-party advertising cookies or cross-site tracking pixels.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>
          Depending on your location you may have rights to access, correct,
          delete, or export your personal data. To exercise any of these rights,
          email us at{" "}
          <a
            href="mailto:privacy@watcher24.dev"
            className="text-primary underline underline-offset-4"
          >
            privacy@watcher24.dev
          </a>
          . We will respond within 30 days.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          We apply industry-standard measures including TLS in transit, encrypted
          storage, scoped API keys, and role-based access controls. For a detailed
          overview see our{" "}
          <a href="/security" className="text-primary underline underline-offset-4">
            Security page
          </a>
          .
        </p>
      </Section>

      <Section title="8. Changes to this policy">
        <p>
          We may update this policy from time to time. We will notify you of
          material changes by email or via a notice in the console at least 14
          days before they take effect.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Questions about this policy? Contact us at{" "}
          <a
            href="mailto:privacy@watcher24.dev"
            className="text-primary underline underline-offset-4"
          >
            privacy@watcher24.dev
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
