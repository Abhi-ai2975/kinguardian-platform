// Root layout — mounts the WatcherProvider so every Client Component in
// the tree can call useAudit / useLog / useTrace / useMetric.
// The provider is a thin client wrapper; it does not block server rendering.
import type { Metadata } from "next";
import { WatcherClientProvider } from "@/components/WatcherClientProvider";

export const metadata: Metadata = {
  title: "Bookmark Manager — Watcher24 Next.js Example",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", margin: 0, background: "#f9fafb" }}>
        <WatcherClientProvider>
          {children}
        </WatcherClientProvider>
      </body>
    </html>
  );
}
