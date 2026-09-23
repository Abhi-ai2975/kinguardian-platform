"use client";

import React, { useMemo } from "react";
import MarkedReact, { ReactRenderer } from "marked-react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { MarkdownNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

interface MarkdownProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: MarkdownNode;
  weight?: string | number;
}

function sanitizeHref(href: string): string {
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol === "javascript:") return "#";
    return href;
  } catch {
    return href;
  }
}

function buildRenderer(nextKey: () => number): Partial<ReactRenderer> {
  return {
    paragraph(children) {
      return <p key={nextKey()} className="text-sm leading-7 my-1">{children}</p>;
    },
    heading(children, level) {
      const classes: Record<number, string> = {
        1: "text-4xl font-bold mt-4 mb-2",
        2: "text-3xl font-bold mt-4 mb-2",
        3: "text-2xl font-semibold mt-3 mb-2",
        4: "text-xl font-semibold mt-3 mb-1",
        5: "text-lg font-medium mt-2 mb-1",
        6: "text-base font-medium mt-2 mb-1",
      };
      const Tag = `h${level}` as React.ElementType;
      return <Tag key={nextKey()} className={classes[level] ?? ""}>{children}</Tag>;
    },
    strong(children) {
      return <strong key={nextKey()} className="font-semibold">{children}</strong>;
    },
    em(children) {
      return <em key={nextKey()} className="italic">{children}</em>;
    },
    del(children) {
      return <del key={nextKey()} className="line-through">{children}</del>;
    },
    blockquote(children) {
      return (
        <blockquote key={nextKey()} className="border-l-4 border-border pl-4 italic text-muted-foreground my-2">
          {children}
        </blockquote>
      );
    },
    list(children, ordered) {
      return ordered ? (
        <ol key={nextKey()} className="list-decimal ml-8 my-2 text-sm">{children}</ol>
      ) : (
        <ul key={nextKey()} className="list-disc ml-8 my-2 text-sm">{children}</ul>
      );
    },
    listItem(children) {
      return <li key={nextKey()} className="my-1 leading-6">{children}</li>;
    },
    codespan(code) {
      return (
        <code key={nextKey()} className="px-2 py-0.5 text-xs rounded-md text-purple-800 dark:text-purple-300 bg-purple-600/20 font-mono">
          {code}
        </code>
      );
    },
    code(code, lang) {
      return (
        <pre key={nextKey()} className="my-3 rounded-lg bg-zinc-900 dark:bg-zinc-950 overflow-x-auto">
          <code className={`block p-4 text-xs font-mono text-zinc-100 language-${lang ?? "text"}`}>
            {code}
          </code>
        </pre>
      );
    },
    link(href, text) {
      const safe = sanitizeHref(href);
      return (
        <a
          key={nextKey()}
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {text}
        </a>
      );
    },
    table(children) {
      return (
        <div key={nextKey()} className="overflow-x-auto my-3">
          <table className="w-full text-sm text-left border-collapse">{children}</table>
        </div>
      );
    },
    tableHeader(children) {
      return (
        <thead key={nextKey()} className="text-xs font-medium uppercase bg-muted/50">{children}</thead>
      );
    },
    tableBody(children) {
      return <tbody key={nextKey()}>{children}</tbody>;
    },
    tableRow(children) {
      return <tr key={nextKey()} className="border-b border-border hover:bg-muted/30">{children}</tr>;
    },
    tableCell(children, flags) {
      return flags.header ? (
        <th key={nextKey()} className="p-3 text-sm font-medium">{children}</th>
      ) : (
        <td key={nextKey()} className="p-3 text-xs">{children}</td>
      );
    },
    hr() {
      return <hr key={nextKey()} className="my-4 border-border" />;
    },
  };
}

export function Markdown({ processor, surfaceId, component, weight = "initial" }: MarkdownProps) {
  const { resolvePrimitive } = useDynamicComponent(processor, surfaceId, component, weight);

  const content = useMemo(
    () => String(resolvePrimitive(component.properties.content) ?? ""),
    [resolvePrimitive, component.properties.content],
  );

  // Counter resets each render so keys are unique within a single render pass.
  let keyCount = 0;
  const renderer = buildRenderer(() => keyCount++);

  return (
    <div className="markdown-body max-w-none" style={{ flex: weight }}>
      <MarkedReact value={content} renderer={renderer} breaks gfm openLinksInNewTab />
    </div>
  );
}
