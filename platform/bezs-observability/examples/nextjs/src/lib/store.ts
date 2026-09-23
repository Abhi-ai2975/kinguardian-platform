// store.ts — in-memory bookmark store shared across route handlers and actions.
// Replace with a real database (Prisma, Drizzle, etc.) in production.
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  userId: string;
  createdAt: string;
}

export const bookmarks = new Map<string, Bookmark>([
  [
    "seed-1",
    {
      id: "seed-1",
      title: "Watcher24 Docs",
      url: "https://watcher24.io/docs",
      userId: "demo-user",
      createdAt: new Date().toISOString(),
    },
  ],
]);
