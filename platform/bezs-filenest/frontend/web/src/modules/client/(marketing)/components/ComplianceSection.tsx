/**
 * ComplianceSection — highlights compliance and healthcare capabilities on the landing page.
 * @module
 */
import Link from "next/link";
import { ShieldCheck, Lock, FileSearch, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ITEMS = [
  {
    icon: Lock,
    title: "WORM Immutability",
    description: "Write-once read-many locks prevent deletion or modification — meets SEC 17a-4 and FINRA requirements.",
  },
  {
    icon: ShieldCheck,
    title: "Legal Hold",
    description: "Instantly place files under legal hold with a reason and indefinite or date-bounded retention. Survives project-level deletions.",
  },
  {
    icon: FileSearch,
    title: "PHI & PII Detection",
    description: "Processing pipeline stage scans uploads for protected health information and personally identifiable data before storage.",
  },
  {
    icon: Clock,
    title: "Retention Policies",
    description: "Per-project configurable retention periods. Auto-delete or archive on expiry. GDPR right-to-erasure respects legal holds.",
  },
] as const;

export function ComplianceSection() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="mb-4">Compliance</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Governance built in, not bolted on
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every compliance feature is configuration-driven. Turn on HIPAA controls, WORM storage,
              or GDPR deletion workflows per project — no code changes required.
            </p>
            <Button asChild className="mt-8 gap-2" variant="outline">
              <Link href="/features/compliance">
                Learn more <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ITEMS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
