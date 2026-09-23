"use server";

import { filenestServer } from "@filenest/nextjs/server";
import { revalidatePath } from "next/cache";
import type { FileRecord } from "@filenest/core";

export async function uploadFileAction(formData: FormData): Promise<{ file?: FileRecord; error?: string }> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };

  try {
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
    return { file: result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}
