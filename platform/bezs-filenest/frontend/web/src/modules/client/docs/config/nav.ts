/**
 * docs/config/nav — Documentation navigation structure.
 *
 * Single source of truth for all docs sections and links. Consumed by
 * DocsSidebar (active-link tree), DocsHeader (quick links), and
 * getAdjacentDocs() for prev/next page navigation.
 *
 * @module
 */

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const docsNav: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Overview", href: "/docs" },
      { title: "Quickstart", href: "/docs/quickstart" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { title: "Organizations", href: "/docs/concepts/organizations" },
      { title: "Projects", href: "/docs/concepts/projects" },
      { title: "Files", href: "/docs/concepts/files" },
      { title: "Upload Flow & Processing", href: "/docs/concepts/processing" },
      { title: "API Keys", href: "/docs/concepts/api-keys" },
    ],
  },
  {
    title: "Storage",
    items: [
      { title: "Overview", href: "/docs/storage/overview" },
      { title: "Managed Storage", href: "/docs/storage/managed" },
      { title: "Bring Your Own Bucket", href: "/docs/storage/byob" },
      { title: "AWS S3", href: "/docs/storage/s3" },
      { title: "Azure Blob Storage", href: "/docs/storage/azure" },
      { title: "Google Cloud Storage", href: "/docs/storage/gcs" },
      { title: "MinIO", href: "/docs/storage/minio" },
      { title: "Cloudflare R2", href: "/docs/storage/r2" },
      { title: "RustFS", href: "/docs/storage/rustfs" },
      { title: "Encryption (SSE)", href: "/docs/storage/encryption" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { title: "Authentication", href: "/docs/api/authentication" },
      { title: "Projects", href: "/docs/api/projects" },
      { title: "Files", href: "/docs/api/files" },
      { title: "Folders", href: "/docs/api/folders" },
      { title: "Upload Tokens", href: "/docs/api/upload-tokens" },
      { title: "Metadata & Tags", href: "/docs/api/metadata" },
      { title: "Webhooks", href: "/docs/api/webhooks" },
      { title: "Storage Config", href: "/docs/api/storage" },
      { title: "Health", href: "/docs/api/health" },
    ],
  },
  {
    title: "SDKs",
    items: [
      { title: "Node.js", href: "/docs/sdks/node" },
      { title: "React", href: "/docs/sdks/react" },
      { title: "Next.js", href: "/docs/sdks/nextjs" },
      { title: "Python", href: "/docs/sdks/python" },
    ],
  },
  {
    title: "Console Guide",
    items: [
      { title: "Overview", href: "/docs/console/overview" },
      { title: "Dashboard", href: "/docs/console/dashboard" },
      { title: "Projects", href: "/docs/console/projects" },
      { title: "Files", href: "/docs/console/files" },
      { title: "Usage", href: "/docs/console/usage" },
      { title: "API Keys", href: "/docs/console/api-keys" },
      { title: "Webhooks", href: "/docs/console/webhooks" },
      { title: "Settings", href: "/docs/console/settings" },
    ],
  },
];

/** Flat ordered list of all nav items — used for prev/next generation. */
export const flatNavItems: NavItem[] = docsNav.flatMap((s) => s.items);
