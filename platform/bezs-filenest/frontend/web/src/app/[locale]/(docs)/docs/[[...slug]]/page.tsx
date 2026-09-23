/**
 * (docs)/docs/[[...slug]]/page — Dynamic MDX renderer for all documentation pages.
 *
 * Catches all /docs/* routes via the optional catch-all segment. Reads the
 * corresponding MDX file, compiles it with next-mdx-remote/rsc, extracts headings
 * for the TOC, and renders the three-column layout: DocsSidebar | article | TableOfContents.
 *
 * @module
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DocsSidebar } from "@/modules/client/docs/components/DocsSidebar";
import { TableOfContents } from "@/modules/client/docs/components/TableOfContents";
import { DocActions } from "@/modules/client/docs/components/DocActions";
import { getMDXComponents } from "@/modules/client/docs/mdx-components";
import {
  getDoc,
  extractHeadings,
  getAllDocSlugs,
  getAdjacentDocs,
} from "@/modules/client/docs/utils/docs";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  return getAllDocSlugs();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const doc = getDoc(slug);
  if (!doc) return {};
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
  };
}

export default async function DocsPage({ params }: PageProps) {
  const { slug = [] } = await params;
  const doc = getDoc(slug);

  if (!doc) notFound();

  const headings = extractHeadings(doc.content);
  const { prev, next } = getAdjacentDocs(slug);

  return (
    <div className="flex gap-8 py-8">
      <DocsSidebar />

      <main className="min-w-0 flex-1">
        {/* Per-page action bar: Copy MD + Open in AI */}
        <div className="mb-6 flex justify-end">
          <DocActions rawMarkdown={doc.content} title={doc.frontmatter.title} />
        </div>

        <article className="prose prose-slate dark:prose-invert max-w-none
          prose-headings:scroll-mt-20
          prose-code:before:content-none prose-code:after:content-none
          prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none">
          <MDXRemote
            source={doc.content}
            components={getMDXComponents()}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                  rehypeSlug,
                  [rehypeAutolinkHeadings, { behavior: "wrap" }],
                  [
                    rehypePrettyCode,
                    {
                      theme: { light: "github-light", dark: "github-dark" },
                      keepBackground: false,
                    },
                  ],
                ],
              },
            }}
          />
        </article>

        {/* Prev / Next navigation */}
        {(prev || next) && (
          <nav className="mt-12 flex items-center justify-between border-t pt-6 text-sm">
            {prev ? (
              <Link
                href={prev.href}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={next.href}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{next.title}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </main>

      <TableOfContents headings={headings} />
    </div>
  );
}
