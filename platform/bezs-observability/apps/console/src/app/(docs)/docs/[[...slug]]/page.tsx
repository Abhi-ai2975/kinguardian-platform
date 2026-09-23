// Dynamic MDX renderer — resolves [[...slug]] to a file in src/content/docs/,
// compiles it with rehype-pretty-code syntax highlighting, and renders it.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getDoc, extractHeadings, getAllDocSlugs, getAdjacentDocs } from "@/lib/docs";
import { mdxComponents } from "@/components/docs/mdx-components";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { DocActions } from "@/components/docs/DocActions";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const doc = getDoc(slug);
  if (!doc) return {};
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug = [] } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const headings = extractHeadings(doc.content);
  const { prev, next } = getAdjacentDocs(slug);

  const { content } = await compileMDX({
    source: doc.content,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "wrap",
              properties: {
                className: ["anchor"],
              },
            },
          ],
          [
            rehypePrettyCode,
            {
              theme: { light: "github-light", dark: "github-dark" },
            },
          ],
        ],
      },
    },
  });

  return (
    <>
      {/* Main content */}
      <main className="min-w-0 flex-1 py-10">
        {/* Per-page action bar: Copy MD + Open in AI */}
        <div className="mb-6 flex justify-end">
          <DocActions rawMarkdown={doc.content} title={doc.frontmatter.title} />
        </div>

        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {content}
        </article>

        {/* Prev / Next navigation */}
        {(prev || next) && (
          <nav className="mt-16 flex items-center justify-between border-t pt-6">
            {prev ? (
              <Link
                href={prev.href}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>
                  <span className="block text-xs">Previous</span>
                  <span className="font-medium text-foreground">{prev.title}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={next.href}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-right"
              >
                <span>
                  <span className="block text-xs">Next</span>
                  <span className="font-medium text-foreground">{next.title}</span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </main>

      {/* Right TOC */}
      <TableOfContents headings={headings} />
    </>
  );
}
