// mdx-components.tsx — custom React components passed to next-mdx-remote.
// These override default HTML elements so prose gets consistent styling
// and code blocks get the copy button injected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { Callout } from "./Callout";
import { GatewayUrl } from "./GatewayUrl";
import { PackageTabs } from "./PackageTabs";

function Code({ children, className, ...props }: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className={
        className ??
        "rounded bg-muted px-1.5 py-0.5 text-[0.875em] font-mono text-foreground"
      }
      {...props}
    >
      {children}
    </code>
  );
}

function Pre({
  children,
  ...props
}: ComponentPropsWithoutRef<"pre"> & { "data-language"?: string }) {
  const raw = extractText(children);
  return (
    <div className="relative my-6 overflow-hidden rounded-lg border border-border">
      {props["data-language"] && (
        <div className="flex items-center border-b border-border bg-muted/50 px-4 py-2">
          <span className="text-xs text-muted-foreground font-mono">
            {props["data-language"]}
          </span>
        </div>
      )}
      <CopyButton text={raw} />
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed" {...props}>
        {children}
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object") {
    const el = node as { props?: { children?: React.ReactNode } };
    if (el.props?.children !== undefined) return extractText(el.props.children);
  }
  return "";
}

type AnchorProps = ComponentPropsWithoutRef<"a"> & { href?: string };

// Record<string, any> is the correct type for next-mdx-remote component maps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mdxComponents: Record<string, any> = {
  h1: (p: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="mt-2 scroll-m-20 text-3xl font-bold tracking-tight" {...p} />
  ),
  h2: (p: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-10 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight first:mt-0"
      {...p}
    />
  ),
  h3: (p: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className="mt-8 scroll-m-20 text-lg font-semibold tracking-tight"
      {...p}
    />
  ),
  h4: (p: ComponentPropsWithoutRef<"h4">) => (
    <h4
      className="mt-6 scroll-m-20 text-base font-semibold tracking-tight"
      {...p}
    />
  ),
  p: (p: ComponentPropsWithoutRef<"p">) => (
    <p className="leading-7 [&:not(:first-child)]:mt-4" {...p} />
  ),
  ul: (p: ComponentPropsWithoutRef<"ul">) => (
    <ul className="my-4 ml-6 list-disc space-y-1.5" {...p} />
  ),
  ol: (p: ComponentPropsWithoutRef<"ol">) => (
    <ol className="my-4 ml-6 list-decimal space-y-1.5" {...p} />
  ),
  li: (p: ComponentPropsWithoutRef<"li">) => (
    <li className="text-sm leading-relaxed" {...p} />
  ),
  blockquote: (p: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="mt-6 border-l-4 border-primary/40 pl-4 italic text-muted-foreground"
      {...p}
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: (p: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  thead: (p: ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-muted/50" {...p} />
  ),
  th: (p: ComponentPropsWithoutRef<"th">) => (
    <th className="border border-border px-4 py-2 text-left font-semibold" {...p} />
  ),
  td: (p: ComponentPropsWithoutRef<"td">) => (
    <td className="border border-border px-4 py-2 align-top" {...p} />
  ),
  a: ({ href, ...p }: AnchorProps) => {
    if (href?.startsWith("/")) {
      return (
        <Link
          href={href}
          className="text-primary underline-offset-4 hover:underline"
          {...p}
        />
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-4 hover:underline"
        {...p}
      />
    );
  },
  code: Code,
  pre: Pre,
  // Custom components available in MDX files
  Callout,
  GatewayUrl,
  PackageTabs,
};
