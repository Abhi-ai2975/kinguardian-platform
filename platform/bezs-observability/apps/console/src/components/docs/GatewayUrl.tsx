// GatewayUrl — inline component that renders the production gateway URL.
// Registered in mdxComponents so MDX docs can use <GatewayUrl /> in prose
// and table cells without importing. Change the URL in lib/docs-config.ts
// and it updates everywhere automatically.
import { GATEWAY_URL } from "@/lib/docs-config";

export function GatewayUrl() {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-[0.875em] font-mono text-foreground">
      {GATEWAY_URL}
    </code>
  );
}
