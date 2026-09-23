// docs-nav.ts — navigation tree for the /docs site.
// Each section maps to a folder in src/content/docs/.
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
    title: "SDKs",
    items: [
      { title: "All SDKs", href: "/docs/sdks" },
      { title: "JavaScript / Node.js", href: "/docs/sdks/javascript" },
      { title: "Python", href: "/docs/sdks/python" },
      { title: "Go", href: "/docs/sdks/go" },
      { title: "Rust", href: "/docs/sdks/rust" },
      { title: "React Native", href: "/docs/sdks/react-native" },
      { title: "Next.js", href: "/docs/sdks/nextjs" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { title: "Event Ingestion", href: "/docs/api/ingestion" },
      { title: "Authentication", href: "/docs/api/authentication" },
    ],
  },
  {
    title: "Concepts",
    items: [
      { title: "Event Types", href: "/docs/concepts/events" },
      { title: "Organisations", href: "/docs/concepts/organisations" },
      { title: "Apps", href: "/docs/concepts/apps" },
      { title: "Data Retention", href: "/docs/concepts/retention" },
    ],
  },
  {
    title: "Platform",
    items: [
      { title: "Notifications", href: "/docs/platform/notifications" },
    ],
  },
  {
    title: "AI Observability",
    items: [
      { title: "Overview", href: "/docs/ai/overview" },
    ],
  },
  {
    title: "More",
    items: [
      { title: "Configuration", href: "/docs/configuration" },
      { title: "Changelog", href: "/docs/changelog" },
    ],
  },
  {
    title: "AI Resources",
    items: [
      { title: "Skills", href: "/docs/ai/skills" },
      { title: "LLMs.txt", href: "/docs/ai/llms" },
    ],
  },
];
