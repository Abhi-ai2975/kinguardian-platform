/**
 * StorageSection — provider logos and BYOB messaging on the landing page.
 * @module
 */
import { HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PROVIDERS = [
  { name: "Amazon S3",       short: "S3" },
  { name: "Cloudflare R2",   short: "R2" },
  { name: "Azure Blob",      short: "Azure" },
  { name: "Google GCS",      short: "GCS" },
  { name: "MinIO",           short: "MinIO" },
  { name: "Any S3-compat.",  short: "S3-API" },
] as const;

export function StorageSection() {
  return (
    <section className="px-4 py-20 sm:px-6 bg-muted/30">
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="secondary" className="mb-4">Storage Abstraction</Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Bring your own storage
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          FileNest sits in front of any S3-compatible object store. Switch providers by changing
          one environment variable — your application code never changes.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {PROVIDERS.map(({ name, short }) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 shadow-sm"
              title={name}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <HardDrive className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium">{short}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Phase 1 ships with S3/MinIO/RustFS. Azure, GCS, R2, and B2 arrive in Phase 7.
        </p>
      </div>
    </section>
  );
}
