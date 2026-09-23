/**
 * @filenest/node example — comprehensive demo of the Node.js SDK.
 *
 * Covers every namespace: files (upload, list, get, update, delete, versions,
 * download), folders (ensurePath, list, getByPath, delete), search (query +
 * async iterate), uploadTokens (create), webhooks (CRUD + signature verify),
 * and resumable multipart uploads.
 *
 * Run:
 *   cp .env.example .env.local
 *   # fill in FILENEST_API_KEY, FILENEST_PROJECT_ID, FILENEST_API_URL
 *   pnpm start
 */

import { readFileSync } from "fs";
import { FileNest } from "@filenest/node";

// ── 1. Create the client ────────────────────────────────────────────────────

const fn = new FileNest({
  apiKey: process.env.FILENEST_API_KEY!,
  projectId: process.env.FILENEST_PROJECT_ID!,
  baseUrl: process.env.FILENEST_API_URL ?? "http://localhost:8000",
});

// ── Helper ─────────────────────────────────────────────────────────────────

function log(section: string, data: unknown) {
  console.log(`\n── ${section} ──`);
  console.log(JSON.stringify(data, null, 2));
}

// ── 2. Files — upload ──────────────────────────────────────────────────────

async function demoFiles() {
  // Single upload from a Buffer (< 5 MB → single-part; ≥ 5 MB → auto-multipart)
  const content = Buffer.from("Hello from the FileNest Node.js SDK!\n");
  const file = await fn.files.upload({
    filename: "hello.txt",
    data: content,
    mimeType: "text/plain",
    metadata: { source: "node-sdk-example", env: "demo" },
    tags: ["demo", "text"],
    onProgress: ({ percentage }) => process.stdout.write(`\r  progress: ${percentage}%`),
  });
  process.stdout.write("\n");
  log("files.upload", { id: file.id, filename: file.filename, status: file.status });

  // Get a single file
  const fetched = await fn.files.get(file.id);
  log("files.get", { id: fetched.id, size: fetched.size });

  // List files with filters
  const list = await fn.files.list({
    tags: ["demo"],
    sortBy: "created_at",
    sortOrder: "desc",
    limit: 5,
  });
  log("files.list", { total: list.total, count: list.items.length });

  // Update metadata and tags
  const updated = await fn.files.update(file.id, {
    filename: "hello-renamed.txt",
    tags: ["demo", "updated"],
    metadata: { reviewed: true },
  });
  log("files.update", { filename: updated.filename, tags: updated.tags });

  // Get a presigned download URL (valid for 1 hour by default)
  const { url, expiresAt } = await fn.files.getDownloadUrl(file.id, {
    ttl: 3600,
    disposition: "inline",
  });
  log("files.getDownloadUrl", { url: url.slice(0, 60) + "…", expiresAt });

  // Download to buffer (convenience wrapper over getDownloadUrl + fetch)
  const buf = await fn.files.downloadToBuffer(file.id);
  log("files.downloadToBuffer", { bytes: buf.length, preview: buf.toString("utf8").trim() });

  // List versions (populated after updates)
  const versions = await fn.files.versions.list(file.id);
  log("files.versions.list", { total: versions.total });

  // Soft-delete the file
  await fn.files.delete(file.id);
  log("files.delete", { deleted: file.id });

  // Restore from soft-delete
  const restored = await fn.files.restore(file.id);
  log("files.restore", { id: restored.id, status: restored.status });

  return file.id;
}

// ── 3. Folders ─────────────────────────────────────────────────────────────

async function demoFolders() {
  // ensurePath — creates all missing intermediate folders atomically
  const deep = await fn.folders.ensurePath("projects/2025/q3/reports");
  log("folders.ensurePath", { id: deep.id, name: deep.name, path: deep.path });

  // Create a sibling folder manually
  const assets = await fn.folders.create({
    name: "assets",
    parentFolderId: deep.parentFolderId ?? null,
  });
  log("folders.create", { id: assets.id, name: assets.name });

  // List folders (optionally filter by name)
  const rootFolders = await fn.folders.list({});
  log("folders.list", { total: rootFolders.total, names: rootFolders.items.map((f) => f.name) });

  // Resolve by path
  const found = await fn.folders.getByPath("projects/2025/q3/reports");
  log("folders.getByPath", found ? { id: found.id, path: found.path } : "not found");

  // Get a single folder
  const fetched = await fn.folders.get(deep.id);
  log("folders.get", { id: fetched.id, name: fetched.name });

  // Upload a file into the deep folder
  const buf = Buffer.from("Q3 report placeholder");
  const fileInFolder = await fn.files.upload({
    filename: "q3-report.txt",
    data: buf,
    mimeType: "text/plain",
    folderId: deep.id,
  });
  log("upload into folder", { fileId: fileInFolder.id, folderId: deep.id });

  // Clean up
  await fn.folders.delete(assets.id);
  log("folders.delete", { deleted: assets.id });

  return deep.id;
}

// ── 4. Search ─────────────────────────────────────────────────────────────

async function demoSearch() {
  // Simple string query
  const simple = await fn.search.query("report");
  log("search.query (string)", { total: simple.total, hits: simple.hits.length });

  // Full search options — filters, facets, sort
  const advanced = await fn.search.query({
    q: "report",
    filters: { tags: ["demo"] },
    facets: ["mimeType", "status"],
    sortBy: "created_at",
    sortOrder: "desc",
    limit: 10,
  });
  log("search.query (advanced)", {
    total: advanced.total,
    queryTimeMs: advanced.queryTimeMs,
    facets: advanced.facets,
  });

  // Async iterator — transparently pages through all results
  let count = 0;
  for await (const file of fn.search.iterate({ q: "demo", limit: 5 })) {
    count++;
    if (count === 1) log("search.iterate first hit", { id: file.id, filename: file.filename });
  }
  log("search.iterate total iterated", { count });
}

// ── 5. Upload tokens ───────────────────────────────────────────────────────

async function demoUploadTokens() {
  // Create a short-lived token for a browser client
  const token = await fn.uploadTokens.create({
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxFiles: 5,
    expiresIn: 900, // 15 minutes
    ownerUserId: "user_abc123",
    ownerOrgId: "org_xyz456",
    metadata: { uploadedFrom: "web-app" },
  });
  log("uploadTokens.create", {
    token: token.token.slice(0, 30) + "…",
    expiresAt: token.expiresAt,
  });
}

// ── 6. Webhooks ────────────────────────────────────────────────────────────

async function demoWebhooks() {
  // Create a webhook endpoint
  const hook = await fn.webhooks.create({
    name: "My endpoint",
    url: "https://example.com/webhooks/filenest",
    events: ["file.uploaded", "file.processing_completed", "file.deleted"],
  });
  log("webhooks.create", { id: hook.id, name: hook.name, events: hook.events });

  // List all webhooks
  const list = await fn.webhooks.list();
  log("webhooks.list", { total: list.total });

  // Update — pause delivery
  const updated = await fn.webhooks.update(hook.id, { status: "disabled" });
  log("webhooks.update", { id: updated.id, status: updated.status });

  // List delivery history
  const deliveries = await fn.webhooks.listDeliveries(hook.id, { limit: 5 });
  log("webhooks.listDeliveries", { total: deliveries.total });

  // Signature verification — simulates receiving an incoming webhook
  const secret = process.env.FILENEST_WEBHOOK_SECRET ?? "whsec_demo_secret";
  const rawBody = Buffer.from(JSON.stringify({ event: "file.uploaded", fileId: "file_123" }));
  const fakeSignature = "sha256=invalid_signature_for_demo";
  const valid = fn.webhooks.verify(rawBody, fakeSignature, secret);
  log("webhooks.verify (invalid sig → false)", { valid });

  // Delete the test webhook
  await fn.webhooks.delete(hook.id);
  log("webhooks.delete", { deleted: hook.id });
}

// ── 7. Resumable multipart upload ──────────────────────────────────────────

async function demoMultipartUpload() {
  // Generate a 6 MB buffer to trigger the automatic multipart path (threshold: 5 MB)
  const bigBuffer = Buffer.alloc(6 * 1024 * 1024, "x");

  const file = await fn.files.upload({
    filename: "big-file.bin",
    data: bigBuffer,
    mimeType: "application/octet-stream",
    onProgress: ({ percentage, chunkNumber, totalChunks }) =>
      process.stdout.write(`\r  multipart: ${percentage}% (chunk ${chunkNumber}/${totalChunks})`),
  });
  process.stdout.write("\n");
  log("multipart upload (auto)", { id: file.id, size: file.size, status: file.status });

  // Clean up
  await fn.files.delete(file.id);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("FileNest Node.js SDK — comprehensive example\n");
  console.log(`API URL : ${process.env.FILENEST_API_URL ?? "http://localhost:8000"}`);
  console.log(`Project : ${process.env.FILENEST_PROJECT_ID ?? "(not set)"}\n`);

  try {
    console.log("═══ 2. Files ══════════════════════════════════════════");
    await demoFiles();

    console.log("\n═══ 3. Folders ════════════════════════════════════════");
    await demoFolders();

    console.log("\n═══ 4. Search ═════════════════════════════════════════");
    await demoSearch();

    console.log("\n═══ 5. Upload tokens ══════════════════════════════════");
    await demoUploadTokens();

    console.log("\n═══ 6. Webhooks ════════════════════════════════════════");
    await demoWebhooks();

    console.log("\n═══ 7. Multipart upload ════════════════════════════════");
    await demoMultipartUpload();

    console.log("\n✓ All demos completed successfully.");
  } catch (err) {
    console.error("\n✗ Demo failed:", err);
    process.exit(1);
  }
}

main();
