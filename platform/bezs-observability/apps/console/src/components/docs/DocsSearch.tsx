// DocsSearch — Cmd+K search modal powered by fuse.js.
// On first open it fetches the docs manifest from /api/docs/search, then searches
// entirely client-side so there are no per-keystroke round trips.
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocResult {
  slug: string[];
  frontmatter: { title: string; description?: string };
  excerpt: string;
}

export function DocsSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocResult[]>([]);
  const [selected, setSelected] = useState(0);
  const fuseRef = useRef<Fuse<DocResult> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialise fuse when the modal first opens.
  const initFuse = useCallback(async () => {
    if (fuseRef.current) return;
    try {
      const res = await fetch("/api/docs/search");
      const docs: DocResult[] = await res.json();
      fuseRef.current = new Fuse(docs, {
        keys: [
          { name: "frontmatter.title", weight: 3 },
          { name: "frontmatter.description", weight: 2 },
          { name: "excerpt", weight: 1 },
        ],
        threshold: 0.35,
        includeScore: true,
      });
    } catch {
      // Search unavailable — fail silently.
    }
  }, []);

  // Keyboard shortcut to open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus input on open.
  useEffect(() => {
    if (open) {
      initFuse();
      setQuery("");
      setResults([]);
      setSelected(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, initFuse]);

  function handleSearch(q: string) {
    setQuery(q);
    setSelected(0);
    if (!fuseRef.current || !q.trim()) {
      setResults([]);
      return;
    }
    setResults(fuseRef.current.search(q).map((r) => r.item).slice(0, 8));
  }

  function navigate(doc: DocResult) {
    const href =
      doc.slug.length === 0 ? "/docs" : "/docs/" + doc.slug.join("/");
    router.push(href);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((v) => Math.min(v + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      navigate(results[selected]);
    }
  }

  return (
    <>
      {/* Trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex items-center gap-2 w-52 justify-between text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5" />
          Search docs…
        </span>
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-lg rounded-xl border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search documentation…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                Esc
              </kbd>
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-2">
                {results.map((doc, i) => (
                  <li key={doc.slug.join("/")}>
                    <button
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                        i === selected ? "bg-accent" : "hover:bg-accent/50"
                      )}
                      onClick={() => navigate(doc)}
                      onMouseEnter={() => setSelected(i)}
                    >
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{doc.frontmatter.title}</p>
                        {doc.frontmatter.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {doc.frontmatter.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Start typing to search…
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
