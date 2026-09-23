"use client";
// BookmarkList.tsx — Client Component.
// Uses useAudit to fire client-side audit events when the user clicks a link
// or deletes a bookmark, and useLog for optimistic-update error recovery.
import { useAudit, useLog } from "@watcher/nextjs/client";
import { deleteBookmark } from "@/app/tasks/actions";
import type { Bookmark } from "@/lib/store";

interface Props {
  bookmarks: Bookmark[];
  userId: string;
}

export function BookmarkList({ bookmarks, userId }: Props) {
  const audit = useAudit();
  const log = useLog();

  async function handleDelete(bookmark: Bookmark) {
    try {
      // Audit before the server action fires so the event timestamp matches
      // the user's intent rather than the server round-trip time.
      audit("bookmark.delete.intent", {
        userId,
        payload: { bookmarkId: bookmark.id, title: bookmark.title },
      });
      await deleteBookmark(bookmark.id, userId);
    } catch (err) {
      log("error", "bookmark.delete.failed", {
        payload: {
          bookmarkId: bookmark.id,
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  function handleLinkClick(bookmark: Bookmark) {
    // Audit every outbound link click — important for compliance when the
    // bookmarks are internal tools or sensitive resources.
    audit("bookmark.link.clicked", {
      userId,
      payload: { bookmarkId: bookmark.id, url: bookmark.url },
    });
  }

  if (bookmarks.length === 0) {
    return <p style={{ color: "#9ca3af" }}>No bookmarks yet — add one above.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {bookmarks.map((b) => (
        <li
          key={b.id}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 8,
            border: "1px solid #e5e7eb", marginBottom: 8, background: "#fff",
          }}
        >
          <div style={{ flex: 1 }}>
            <a
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleLinkClick(b)}
              style={{ fontWeight: 500, color: "#2563eb", textDecoration: "none" }}
            >
              {b.title}
            </a>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>{b.url}</p>
          </div>
          <button
            onClick={() => handleDelete(b)}
            style={{
              padding: "3px 10px", fontSize: 12, borderRadius: 4,
              background: "transparent", border: "1px solid #fca5a5",
              color: "#ef4444", cursor: "pointer",
            }}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
