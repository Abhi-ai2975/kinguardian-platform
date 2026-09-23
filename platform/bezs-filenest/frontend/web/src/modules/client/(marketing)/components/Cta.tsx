/**
 * Cta — bottom call-to-action section on the landing page.
 * @module
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CtaProps {
  isAuthenticated: boolean;
}

export function Cta({ isAuthenticated }: CtaProps) {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to ship file infrastructure?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Create an organisation, generate an API key, and make your first upload in under 5 minutes.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <Button asChild size="lg" className="gap-2">
              <Link href="/dashboard">
                Open Console <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
