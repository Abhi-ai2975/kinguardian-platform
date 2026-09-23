/**
 * @filenest/node namespaces/search — SearchNamespace implementation.
 * @module
 */

import type { FileNestHttpClient, FileRecord, SearchFilters, SearchResults } from "@filenest/core";

export interface SearchOptions {
  q?: string;
  filters?: SearchFilters;
  facets?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class SearchNamespace {
  constructor(
    private readonly http: FileNestHttpClient,
    private readonly projectId: string
  ) {}

  async query(input: string | SearchOptions): Promise<SearchResults> {
    const options: SearchOptions = typeof input === "string" ? { q: input } : input;
    return this.http.post(`/v1/projects/${this.projectId}/search`, options);
  }

  async *iterate(options: SearchOptions = {}): AsyncIterableIterator<FileRecord> {
    const limit = options.limit ?? 50;
    let offset = 0;

    while (true) {
      const results = await this.query({ ...options, limit, offset });
      for (const hit of results.hits) {
        yield hit.file;
      }
      if (results.hits.length < limit) break;
      offset += limit;
    }
  }
}
