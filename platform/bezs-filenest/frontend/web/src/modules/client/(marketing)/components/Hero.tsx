/**
 * Hero — landing page hero section.
 *
 * Headline, sub-headline, and dual CTA buttons. Authenticated users see
 * "Go to Console" instead of the signup CTA.
 *
 * @module
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, HardDrive } from "lucide-react";

interface HeroProps {
  isAuthenticated: boolean;
}

export function Hero({ isAuthenticated }: HeroProps) {
  return (
    <section className="flex flex-col items-center text-center px-4 pt-32 pb-20">
      <Badge variant="secondary" className="mb-6 gap-1.5">
        <HardDrive className="h-3 w-3" />
        Enterprise File Infrastructure
      </Badge>

      <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
        The file layer every{" "}
        <span className="text-primary">product needs</span>
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
        FileNest sits between your application and cloud storage — providing upload, processing,
        search, compliance, and webhook delivery as a managed API.{" "}
        <span className="text-foreground font-medium">Like Stripe for files.</span>
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        {isAuthenticated ? (
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              Go to Console <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg" className="gap-2">
              <Link href="/signup">
                Start building <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </>
        )}
      </div>

      {/* Code snippet teaser */}
      <div className="mt-16 w-full max-w-2xl rounded-xl border bg-muted/50 p-4 text-left font-mono text-sm shadow-sm">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          <span className="ml-2 text-xs text-muted-foreground">upload.ts</span>
        </div>
        <pre className="overflow-x-auto text-xs leading-relaxed">
          <code>
{`import { FileNest } from "@filenest/node";

const fn = new FileNest({ apiKey: process.env.FILENEST_API_KEY });

const file = await fn.files.upload({
  filename: "contract.pdf",
  data: buffer,
  mimeType: "application/pdf",
  metadata: { clientId: "acme-corp", type: "contract" },
});

console.log(file.id); // fn_file_01JXZ...`}
          </code>
        </pre>
      </div>
    </section>
  );
}
