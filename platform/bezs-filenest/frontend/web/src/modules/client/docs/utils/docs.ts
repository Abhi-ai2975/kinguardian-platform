/**
 * docs/utils/docs — Server-side utilities for reading and processing MDX docs.
 *
 * Reads MDX files from src/content/docs/, parses frontmatter, extracts headings,
 * and builds the search manifest. All functions are server-only — they use Node.js
 * fs/path APIs and must never run in the browser.
 *
 * @module
 */
import "server-only";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Heading } from "../components/TableOfContents";
import { flatNavItems } from "../config/nav";

const CONTENT_DIR = path.join(process.cwd(), "src/content/docs");

export interface DocFrontmatter {
  title: string;
  description?: string;
}

export interface Doc {
  frontmatter: DocFrontmatter;
  content: string;
  slug: string[];
}

export interface DocManifestEntry {
  slug: string[];
  href: string;
  title: string;
  description: string;
  excerpt: string;
}

/** Convert a heading text to a URL-safe slug (matches rehype-slug output). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Read and parse a single MDX file. Returns null if the file does not exist. */
export function getDoc(slug: string[]): Doc | null {
  const filePath = slug.length === 0
    ? path.join(CONTENT_DIR, "index.mdx")
    : path.join(CONTENT_DIR, ...slug) + ".mdx";

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    frontmatter: data as DocFrontmatter,
    content,
    slug,
  };
}

/** Extract h2 and h3 headings from raw markdown for the TableOfContents. */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h2) headings.push({ level: 2, text: h2[1].trim(), id: slugify(h2[1].trim()) });
    else if (h3) headings.push({ level: 3, text: h3[1].trim(), id: slugify(h3[1].trim()) });
  }

  return headings;
}

/** Walk the content directory and return all MDX file slugs for generateStaticParams. */
export function getAllDocSlugs(): { slug: string[] }[] {
  const results: { slug: string[] }[] = [{ slug: [] }]; // index.mdx → []

  function walk(dir: string, parts: string[]) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full, [...parts, entry]);
      } else if (entry.endsWith(".mdx") && entry !== "index.mdx") {
        results.push({ slug: [...parts, entry.replace(/\.mdx$/, "")] });
      }
    }
  }

  walk(CONTENT_DIR, []);
  return results;
}

/** Build the search manifest: title + description + plain-text excerpt per page. */
export function getDocsManifest(): DocManifestEntry[] {
  return getAllDocSlugs().map(({ slug }) => {
    const doc = getDoc(slug);
    if (!doc) return null;

    const plainText = doc.content
      .replace(/```[\s\S]*?```/g, "")
      .replace(/#{1,6} /g, "")
      .replace(/[*_`[\]()>]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    const href = slug.length === 0 ? "/docs" : `/docs/${slug.join("/")}`;

    return {
      slug,
      href,
      title: doc.frontmatter.title,
      description: doc.frontmatter.description ?? "",
      excerpt: plainText.slice(0, 200),
    };
  }).filter(Boolean) as DocManifestEntry[];
}

/** Return the previous and next nav items relative to the current slug. */
export function getAdjacentDocs(slug: string[]): {
  prev: { title: string; href: string } | null;
  next: { title: string; href: string } | null;
} {
  const href = slug.length === 0 ? "/docs" : `/docs/${slug.join("/")}`;
  const index = flatNavItems.findIndex((item) => item.href === href);

  return {
    prev: index > 0 ? flatNavItems[index - 1] : null,
    next: index < flatNavItems.length - 1 ? flatNavItems[index + 1] : null,
  };
}
