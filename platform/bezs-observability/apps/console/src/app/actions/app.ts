"use server";
// app.ts — Server Actions for app-level state changes.
// These run on the server and can safely access cookies.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// ACTIVE_APP_COOKIE stores the currently selected app_id in the dashboard.
// A null value means "All Apps" — no per-app filter is applied.
const ACTIVE_APP_COOKIE = "watcher_app";

// switchActiveApp sets (or clears) the active app cookie and revalidates the
// dashboard layout so the new filter takes effect on the next request.
export async function switchActiveApp(appId: string | null): Promise<void> {
  const jar = await cookies();
  if (appId) {
    jar.set(ACTIVE_APP_COOKIE, appId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } else {
    jar.delete(ACTIVE_APP_COOKIE);
  }
  revalidatePath("/", "layout");
}
