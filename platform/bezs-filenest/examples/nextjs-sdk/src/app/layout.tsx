/**
 * Root layout — wraps every page in FileNestProvider from @filenest/react.
 *
 * The provider fetches upload tokens from /api/filenest-token so all child
 * components and hooks can upload files without handling auth themselves.
 */

import type { Metadata } from "next";
import { FileNestProvider } from "@filenest/react";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "FileNest SDK — Next.js Examples",
  description: "Complete demo of @filenest/nextjs and @filenest/react",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/*
          FileNestProvider is the single setup step for all @filenest/react
          components and hooks. It lazily fetches upload tokens from
          tokenEndpoint when needed, caches them, and refreshes before expiry.
        */}
        <FileNestProvider
          tokenEndpoint="/api/filenest-token"
          projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
          baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
          fetchInitialToken={true}
          tokenRefreshBuffer={60}
          tokenRetry={3}
          debug={process.env.NODE_ENV === "development"}
        >
          <div className="layout">
            <Sidebar />
            <main className="main">{children}</main>
          </div>
        </FileNestProvider>
      </body>
    </html>
  );
}
