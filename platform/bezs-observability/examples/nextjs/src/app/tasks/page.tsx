// tasks/page.tsx — Server Component.
// Reads bookmarks directly from the store and fires a page-view audit event
// on every render, giving a server-side record of who visited and when.
import { watcher } from "@/lib/watcher";
import { bookmarks } from "@/lib/store";
import { BookmarkList } from "@/components/BookmarkList";
import { AddBookmarkForm } from "@/components/AddBookmarkForm";

// In a real app this would come from the session / auth cookie.
const DEMO_USER_ID = "demo-user";

export default async function TasksPage() {
  const userBookmarks = [...bookmarks.values()].filter(
    (b) => b.userId === DEMO_USER_ID,
  );

  // Audit the page view server-side — captures SSR renders even if JS is disabled.
  watcher.audit("page.view", {
    userId: DEMO_USER_ID,
    payload: { page: "/tasks", bookmarkCount: userBookmarks.length },
  });

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ margin: "0 0 4px" }}>🔖 Bookmarks</h1>
        <a href="/test" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>
          SDK Test Lab →
        </a>
      </div>
      <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        Watcher24 Next.js example — user: <code>{DEMO_USER_ID}</code>
      </p>

      <AddBookmarkForm userId={DEMO_USER_ID} />
      <BookmarkList bookmarks={userBookmarks} userId={DEMO_USER_ID} />
    </main>
  );
}
