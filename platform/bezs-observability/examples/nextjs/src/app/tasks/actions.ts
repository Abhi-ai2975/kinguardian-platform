"use server";
// Server Actions for bookmark CRUD.
// Each mutating action fires an audit event so the operation appears in the
// Watcher24 audit trail regardless of which client triggered it.
import { revalidatePath } from "next/cache";
import { watcher } from "@/lib/watcher";
import { bookmarks, type Bookmark } from "@/lib/store";

export async function createBookmark(formData: FormData): Promise<void> {
  const title = (formData.get("title") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();
  const userId = (formData.get("userId") as string) ?? "anonymous";

  if (!title || !url) return;

  const bookmark: Bookmark = {
    id: crypto.randomUUID(),
    title,
    url,
    userId,
    createdAt: new Date().toISOString(),
  };
  bookmarks.set(bookmark.id, bookmark);

  // Audit the creation — who added which URL and when.
  watcher.audit("bookmark.created", {
    userId,
    payload: { bookmarkId: bookmark.id, title, url },
  });

  // Track the running total as a metric for capacity planning.
  watcher.metric("bookmarks.total", { payload: { value: bookmarks.size } });

  revalidatePath("/tasks");
}

export async function deleteBookmark(bookmarkId: string, userId: string): Promise<void> {
  const bookmark = bookmarks.get(bookmarkId);
  if (!bookmark) return;

  bookmarks.delete(bookmarkId);

  watcher.audit("bookmark.deleted", {
    userId,
    payload: { bookmarkId, title: bookmark.title, url: bookmark.url },
  });

  watcher.metric("bookmarks.total", { payload: { value: bookmarks.size } });

  revalidatePath("/tasks");
}
