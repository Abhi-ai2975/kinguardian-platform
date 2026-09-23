/**
 * CompliancePage — deep-dive on FileNest compliance capabilities.
 *
 * Covers WORM, legal hold, retention, GDPR, HIPAA, and audit logging.
 *
 * @module
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ShieldCheck, FileSearch, Clock, FileText, Activity } from "lucide-react";

const SECTIONS = [
  {
    icon: Lock,
    title: "WORM Immutability",
    body: "Write-once read-many (WORM) commits a file permanently. Once committed, the file cannot be modified, overwritten, or deleted — even by administrators. Meets SEC Rule 17a-4, FINRA, and CFTC immutability requirements. Committed via API with an explicit reason and audit entry.",
  },
  {
    icon: ShieldCheck,
    title: "Legal Hold",
    body: "Place any file under legal hold with a reason string. Files on hold are exempt from all retention and deletion policies — including project-level purges. Holds are indefinite by default and can only be lifted via explicit API call with a recorded justification.",
  },
  {
    icon: Clock,
    title: "Retention Policies",
    body: "Set per-project retention periods in days, months, or years. Files expire automatically on the retention date — either soft-deleted (restorable for 30 days) or hard-purged. GDPR right-to-erasure requests honour legal holds and WORM status before acting.",
  },
  {
    icon: FileSearch,
    title: "PHI & PII Detection",
    body: "A configurable processing pipeline stage scans file content for PHI (HIPAA-defined protected health information) and PII patterns before the file becomes available. Detected files can be quarantined, redacted, or flagged for review — all via project configuration.",
  },
  {
    icon: FileText,
    title: "Audit Logging",
    body: "Every mutation — upload, download, delete, legal-hold change, WORM commit, metadata update — writes a tamper-evident audit entry in the same database transaction. Logs include actor, organisation, project, IP address, user-agent, and a diff of changed fields. Exportable as NDJSON or CSV.",
  },
  {
    icon: Activity,
    title: "HIPAA Controls",
    body: "Enable HIPAA controls per project: mandatory audit logging, encrypted-at-rest enforcement, PHI detection, 7-year audit retention, and access logs. No code changes — all behaviour is driven by the project configuration stored in FileNest's database.",
  },
] as const;

export function CompliancePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="text-center mb-14">
        <Badge className="mb-4">Compliance</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Governance without the complexity
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          FileNest's compliance layer is configuration-driven. Turn on WORM, legal hold, HIPAA
          controls, or GDPR deletion workflows per project — no infrastructure code required.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {SECTIONS.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
