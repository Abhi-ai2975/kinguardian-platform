/**
 * /server-action — Upload a file via a Next.js server action.
 *
 * The client sends a FormData to the server action. The action calls
 * filenestServer().files.upload() server-side, so the API key stays
 * on the server and the browser never touches it directly.
 */

import { CodeBlock } from "@/components/CodeBlock";
import { ServerActionUploadForm } from "./ServerActionUploadForm";

const SOURCE = `// server-action/actions.ts
"use server";
import { filenestServer } from "@filenest/nextjs/server";
import { revalidatePath } from "next/cache";

export async function uploadFileAction(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("No file provided");

  const fn = filenestServer({
    apiKey: process.env.FILENEST_API_KEY!,
    projectId: process.env.FILENEST_PROJECT_ID!,
    baseUrl: process.env.FILENEST_API_URL,
  });

  const result = await fn.files.upload({
    filename: file.name,
    data: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || "application/octet-stream",
  });

  revalidatePath("/server-component");
  return result;
}`;

export default function ServerActionPage() {
  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>Server Action</h1>
          <span className="badge badge-blue">@filenest/nextjs/server</span>
        </div>
        <p className="page-sub">
          Upload a file through a Next.js server action. The browser sends a <code>FormData</code>;
          the server action calls <code>filenestServer().files.upload()</code> and returns the result.
        </p>
      </div>

      <div className="demo-split">
        <ServerActionUploadForm />
        <CodeBlock title="server-action/actions.ts" code={SOURCE} />
      </div>
    </div>
  );
}
