// Route Handler — REST API for bookmarks.
// Used by external clients (mobile apps, other services) that cannot call
// Server Actions. Demonstrates createNextServerClient in Route Handlers.
import { NextRequest, NextResponse } from "next/server";
import { watcher } from "@/lib/watcher";
import { bookmarks, type Bookmark } from "@/lib/store";

// GET /api/tasks?userId=...
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";

  const result = [...bookmarks.values()].filter((b) => b.userId === userId);

  watcher.metric("api.bookmarks.listed", {
    payload: { userId, count: result.length },
  });

  return NextResponse.json(result);
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  const body = await req.json() as { title: string; url: string; userId: string };
  const { title, url, userId } = body;

  if (!title || !url || !userId) {
    watcher.log("warn", "api.bookmark.create.invalid", {
      payload: { reason: "missing fields", body },
    });
    return NextResponse.json({ error: "title, url, and userId are required" }, { status: 400 });
  }

  const bookmark: Bookmark = {
    id: crypto.randomUUID(),
    title,
    url,
    userId,
    createdAt: new Date().toISOString(),
  };
  bookmarks.set(bookmark.id, bookmark);

  watcher.audit("bookmark.created.api", {
    userId,
    payload: { bookmarkId: bookmark.id, title, url },
  });

  watcher.metric("bookmarks.total", { payload: { value: bookmarks.size } });

  return NextResponse.json(bookmark, { status: 201 });
}

// DELETE /api/tasks?id=...&userId=...
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const userId = req.nextUrl.searchParams.get("userId") ?? "";

  const bookmark = bookmarks.get(id);
  if (!bookmark) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  bookmarks.delete(id);

  watcher.audit("bookmark.deleted.api", {
    userId,
    payload: { bookmarkId: id, title: bookmark.title },
  });

  return NextResponse.json({ ok: true });
}
