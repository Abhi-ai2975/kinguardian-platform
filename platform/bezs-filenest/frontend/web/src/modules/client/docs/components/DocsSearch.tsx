/**
 * DocsSearch — Cmd+K search modal for documentation pages.
 *
 * Fetches the search manifest from /api/docs/search once and caches it in
 * module-level memory. Uses Fuse.js for client-side fuzzy matching.
 * Renders results in a Command dialog; clicking a result navigates and closes.
 *
 * @module
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { DocManifestEntry } from "../utils/docs";

let manifestCache: DocManifestEntry[] | null = null;

interface DocsSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocsSearch({ open, onOpenChange }: DocsSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocManifestEntry[]>([]);
  const [manifest, setManifest] = useState<DocManifestEntry[]>([]);
  const fuseRef = useRef<Fuse<DocManifestEntry> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);

    if (manifestCache) {
      setManifest(manifestCache);
      return;
    }

    fetch("/api/docs/search")
      .then((r) => r.json())
      .then((data: DocManifestEntry[]) => {
        manifestCache = data;
        setManifest(data);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    fuseRef.current = new Fuse(manifest, {
      keys: [
        { name: "title", weight: 3 },
        { name: "description", weight: 2 },
        { name: "excerpt", weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, [manifest]);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim() || !fuseRef.current) {
        setResults(manifest.slice(0, 8));
        return;
      }
      setResults(fuseRef.current.search(q).slice(0, 8).map((r) => r.item));
    },
    [manifest],
  );

  useEffect(() => {
    if (open && manifest.length > 0 && !query) {
      setResults(manifest.slice(0, 8));
    }
  }, [open, manifest, query]);

  function navigate(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href as "/");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 overflow-hidden">
        <DialogTitle className="sr-only">Search documentation</DialogTitle>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search docs…"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((item) => (
              <li key={item.href}>
                <button
                  className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors"
                  onClick={() => navigate(item.href)}
                >
                  <p className="text-sm font-medium leading-none">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {query ? `No results for "${query}"` : "Start typing to search…"}
          </p>
        )}

        <div className="border-t px-3 py-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> to select
          </span>
          <span className="flex items-center gap-1">
            <Kbd>ESC</Kbd> to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Trigger button shown in the DocsHeader — opens the search dialog. */
export function DocsSearchTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-48 justify-between text-muted-foreground font-normal"
      onClick={onOpen}
    >
      <span className="flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5" />
        Search docs…
      </span>
      <span className="flex items-center gap-0.5">
        <Kbd className="text-xs">⌘</Kbd>
        <Kbd className="text-xs">K</Kbd>
      </span>
    </Button>
  );
}
