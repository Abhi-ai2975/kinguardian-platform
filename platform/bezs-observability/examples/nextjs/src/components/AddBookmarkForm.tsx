"use client";
// AddBookmarkForm.tsx — Client Component form that calls a Server Action.
// Uses useLog to record validation errors client-side before the form submits.
import { useRef } from "react";
import { useLog } from "@watcher/nextjs/client";
import { createBookmark } from "@/app/tasks/actions";

interface Props {
  userId: string;
}

export function AddBookmarkForm({ userId }: Props) {
  const log = useLog();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    const url = formData.get("url") as string;

    // Client-side URL validation — log the failure so it's visible in the
    // dashboard even if the user never submits invalid data to the server.
    try {
      new URL(url);
    } catch {
      log("warn", "bookmark.form.invalid_url", { payload: { url } });
      return;
    }

    await createBookmark(formData);
    formRef.current?.reset();
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input
        name="title"
        placeholder="Title"
        required
        style={inputStyle}
      />
      <input
        name="url"
        type="url"
        placeholder="https://example.com"
        required
        style={inputStyle}
      />
      <button type="submit" style={btnStyle}>Add Bookmark</button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 14, borderRadius: 6,
  border: "1px solid #d1d5db", outline: "none",
};
const btnStyle: React.CSSProperties = {
  padding: "9px", fontSize: 14, borderRadius: 6,
  background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
};
