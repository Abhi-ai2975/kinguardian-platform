"use client";

import React, { useMemo } from "react";
import MarkedReact, { ReactRenderer } from "marked-react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { TextNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

interface TextProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: TextNode;
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

const inlineRenderer: Partial<ReactRenderer> = {
  strong(children) {
    return <strong className="font-semibold">{children}</strong>;
  },
  em(children) {
    return <em className="italic">{children}</em>;
  },
  codespan(code) {
    return (
      <code className="px-1.5 py-0.5 text-xs rounded text-purple-800 dark:text-purple-300 bg-purple-600/20 font-mono">
        {code}
      </code>
    );
  },
  link(href, text) {
    const safe = sanitizeHref(href);
    return (
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {text}
      </a>
    );
  },
};

const hintClasses: Record<string, string> = {
  h1: "text-4xl font-bold",
  h2: "text-3xl font-bold",
  h3: "text-2xl font-semibold",
  h4: "text-xl font-semibold",
  h5: "text-lg font-medium",
  caption: "text-sm text-muted-foreground",
  monospaced: "font-mono text-sm",
  body: "text-base",
};

export function Text({ processor, surfaceId, component, weight = "initial" }: TextProps) {
  const { resolvePrimitive } = useDynamicComponent(processor, surfaceId, component, weight);

  const text = useMemo(
    () => String(resolvePrimitive(component.properties.text) ?? "(empty)"),
    [resolvePrimitive, component.properties.text],
  );

  const usageHint = component.properties.usageHint ?? "body";
  const className = hintClasses[usageHint] ?? "text-base";

  const isHeading = ["h1", "h2", "h3", "h4", "h5"].includes(usageHint);

  if (isHeading) {
    const Tag = usageHint as React.ElementType;
    return (
      <Tag className={className} style={{ flex: weight }}>
        {text}
      </Tag>
    );
  }

  return (
    <div className={className} style={{ flex: weight }}>
      <MarkedReact value={text} renderer={inlineRenderer} breaks gfm />
    </div>
  );
}
