import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Terms of Service — Watcher24",
  description: "The terms governing your use of the Watcher24 platform.",
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

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 space-y-12">

      {/* Header */}
      <div className="space-y-4">
        <Badge variant="secondary">Legal</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        <p className="text-muted-foreground leading-relaxed">
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of
          Watcher24 and related services operated by Watcher24 (&quot;we&quot;, &quot;us&quot;).
          By creating an account or using the service you agree to these Terms.
        </p>
      </div>

      <Section title="1. Acceptance">
        <p>
          By accessing or using Watcher24 you confirm that you are at least 18
          years old, that you have read and understood these Terms, and that you
          agree to be bound by them. If you are using Watcher24 on behalf of an
          organisation, you represent that you have authority to bind that
          organisation to these Terms.
        </p>
      </Section>

      <Section title="2. Service description">
        <p>
          Watcher24 is a cloud-based observability platform that collects,
          stores, and displays telemetry data (logs, metrics, traces, and audit
          events) submitted by your applications via our ingest API and SDKs. We
          provide a web console, real-time streaming, and analytical query
          capabilities subject to your subscription plan.
        </p>
      </Section>

      <Section title="3. Account terms">
        <p>
          You are responsible for maintaining the security of your account
          credentials and API keys. You must notify us immediately at{" "}
          <a
            href="mailto:security@watcher24.dev"
            className="text-primary underline underline-offset-4"
          >
            security@watcher24.dev
          </a>{" "}
          if you suspect unauthorised access. We are not liable for losses caused
          by compromised credentials.
        </p>
        <p>
          Each account is for one person or organisation. You may not share login
          credentials. Use the team member invite feature to add collaborators.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Use Watcher24 for unlawful purposes or to store illegal content.</li>
          <li>
            Attempt to circumvent plan limits, rate limits, or access controls.
          </li>
          <li>
            Reverse-engineer, decompile, or attempt to extract the source code of
            the service.
          </li>
          <li>
            Submit events containing unencrypted personally identifiable information
            such as passwords, payment card numbers, or government IDs.
          </li>
          <li>
            Intentionally flood the ingest API to degrade service for other
            customers.
          </li>
        </ul>
      </Section>

      <Section title="5. Subscription and payment">
        <p>
          Free tier features are provided at no charge and may be modified or
          discontinued with reasonable notice. Paid plans (Pro, Enterprise) are
          billed in advance on a monthly or annual basis via Stripe.
        </p>
        <p>
          All fees are non-refundable except where required by law. If you
          downgrade mid-cycle, the change takes effect at the next billing period.
          If you upgrade, you are charged on a pro-rated basis immediately.
        </p>
        <p>
          We reserve the right to change pricing with 30 days&apos; notice. Continued
          use of the service after the notice period constitutes acceptance of the
          new pricing.
        </p>
      </Section>

      <Section title="6. Data ownership">
        <p>
          You own all telemetry data you submit to Watcher24. You grant us a
          limited licence to store, process, and display that data solely to
          provide the service to you. We will not use your data for any other
          purpose without your explicit consent.
        </p>
      </Section>

      <Section title="7. Uptime and availability">
        <p>
          We aim for 99.9% monthly uptime for paid plans. Scheduled maintenance
          will be announced at least 24 hours in advance. We are not liable for
          downtime caused by factors outside our reasonable control (force
          majeure, third-party outages, DDoS attacks).
        </p>
      </Section>

      <Section title="8. Termination">
        <p>
          You may close your account at any time from the console. We may suspend
          or terminate accounts that violate these Terms, with or without notice
          depending on the severity of the violation.
        </p>
        <p>
          On termination, your telemetry data will be deleted within 30 days.
          Export your data before closing your account if you need to retain it.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Watcher24 is provided &quot;as is&quot;
          without warranty of any kind. In no event shall we be liable for
          indirect, incidental, special, consequential, or punitive damages,
          including loss of profits, data, or business opportunities, even if
          advised of the possibility of such damages.
        </p>
        <p>
          Our total aggregate liability to you for any claims arising under these
          Terms shall not exceed the amount you paid us in the 12 months
          immediately preceding the claim.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These Terms are governed by the laws of the jurisdiction in which
          Watcher24 is incorporated, without regard to conflict of law principles.
          Any disputes shall be resolved exclusively in the courts of that
          jurisdiction.
        </p>
      </Section>

      <Section title="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. We will notify you of
          material changes by email or via a notice in the console at least 14
          days before they take effect. Your continued use of the service after
          that date constitutes acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions about these Terms? Email us at{" "}
          <a
            href="mailto:legal@watcher24.dev"
            className="text-primary underline underline-offset-4"
          >
            legal@watcher24.dev
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
