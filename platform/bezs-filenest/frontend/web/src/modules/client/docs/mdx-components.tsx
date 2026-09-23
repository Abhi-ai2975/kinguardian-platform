/**
 * mdx-components — Custom MDX element renderers for FileNest docs.
 *
 * Passed to next-mdx-remote's MDXRemote `components` prop. Overrides default
 * HTML renderers to add: copy buttons on code blocks, anchor links on headings,
 * styled tables, and external link handling.
 *
 * @module
 */
import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";
import { CopyButton } from "./components/CopyButton";
import { Callout } from "./components/Callout";
import { PackageTabs } from "./components/PackageTabs";
import { cn } from "@/lib/utils";

function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function AnchoredHeading({
  as: Tag,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"h1"> & { as: "h1" | "h2" | "h3" | "h4" }) {
  const id = props.id ?? slugify(String(children));
  return (
    <Tag id={id} className={cn("group relative scroll-mt-20", className)} {...props}>
      <a
        href={`#${id}`}
        className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground no-underline"
        aria-hidden
      >
        #
      </a>
      {children}
    </Tag>
  );
}

function Pre({
  children,
  ...props
}: ComponentPropsWithoutRef<"pre"> & { "data-language"?: string }) {
  const codeEl =
    typeof children === "object" &&
    children !== null &&
    "props" in (children as object)
      ? (children as React.ReactElement<ComponentPropsWithoutRef<"code">>)
      : null;
  const rawText = codeEl?.props?.children
    ? String(codeEl.props.children)
    : "";

  return (
    <div className="group relative my-4">
      <pre
        {...props}
        className={cn(
          "overflow-x-auto rounded-lg border bg-muted/50 p-4 text-sm",
          props.className,
        )}
      >
        {children}
      </pre>
      {rawText && (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={rawText} />
        </div>
      )}
    </div>
  );
}

// needed for JSX in Pre above
import React from "react";

export function getMDXComponents(): MDXComponents {
  return {
    // headings
    h1: ({ children, ...p }) => (
      <AnchoredHeading
        as="h1"
        className="mt-2 scroll-mt-20 text-3xl font-bold tracking-tight"
        {...p}
      >
        {children}
      </AnchoredHeading>
    ),
    h2: ({ children, ...p }) => (
      <AnchoredHeading
        as="h2"
        className="mt-10 border-b pb-2 text-xl font-semibold tracking-tight"
        {...p}
      >
        {children}
      </AnchoredHeading>
    ),
    h3: ({ children, ...p }) => (
      <AnchoredHeading
        as="h3"
        className="mt-6 text-lg font-semibold tracking-tight"
        {...p}
      >
        {children}
      </AnchoredHeading>
    ),
    h4: ({ children, ...p }) => (
      <AnchoredHeading
        as="h4"
        className="mt-4 text-base font-semibold"
        {...p}
      >
        {children}
      </AnchoredHeading>
    ),

    // prose
    p: ({ children, ...p }) => (
      <p className="leading-7 [&:not(:first-child)]:mt-4" {...p}>
        {children}
      </p>
    ),
    ul: ({ children, ...p }) => (
      <ul className="my-4 ml-6 list-disc space-y-1.5 [&>li]:text-sm" {...p}>
        {children}
      </ul>
    ),
    ol: ({ children, ...p }) => (
      <ol className="my-4 ml-6 list-decimal space-y-1.5 [&>li]:text-sm" {...p}>
        {children}
      </ol>
    ),
    li: ({ children, ...p }) => (
      <li className="leading-relaxed" {...p}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...p }) => (
      <blockquote
        className="mt-4 border-l-2 pl-4 text-sm italic text-muted-foreground"
        {...p}
      >
        {children}
      </blockquote>
    ),
    hr: (p) => <hr className="my-8" {...p} />,

    // code
    code: ({ children, ...p }) => (
      <code
        className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm"
        {...p}
      >
        {children}
      </code>
    ),
    pre: Pre,

    // table
    table: ({ children, ...p }) => (
      <div className="my-6 w-full overflow-x-auto">
        <table className="w-full text-sm" {...p}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...p }) => (
      <thead className="border-b" {...p}>
        {children}
      </thead>
    ),
    tr: ({ children, ...p }) => (
      <tr className="border-b transition-colors hover:bg-muted/40" {...p}>
        {children}
      </tr>
    ),
    th: ({ children, ...p }) => (
      <th
        className="px-3 py-2 text-left font-semibold text-muted-foreground [&:first-child]:pl-0"
        {...p}
      >
        {children}
      </th>
    ),
    td: ({ children, ...p }) => (
      <td className="px-3 py-2 [&:first-child]:pl-0" {...p}>
        {children}
      </td>
    ),

    // links
    a: ({ href = "", children, ...p }) => {
      const isExternal = href.startsWith("http");
      return (
        <a
          href={href}
          className="font-medium underline underline-offset-4 hover:text-foreground"
          {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          {...p}
        >
          {children}
        </a>
      );
    },

    // custom MDX components available in all docs
    Callout,
    PackageTabs,
  };
}
