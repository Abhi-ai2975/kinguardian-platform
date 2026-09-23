/**
 * React SDK example app entry point.
 *
 * Wraps the whole app in FileNestProvider. The tokenEndpoint points to your
 * server — set VITE_FILENEST_TOKEN_ENDPOINT in .env.local.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { FileNestProvider } from "@filenest/react";
import { App } from "./App.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FileNestProvider
      projectId={import.meta.env.VITE_FILENEST_PROJECT_ID ?? ""}
      baseUrl={import.meta.env.VITE_FILENEST_API_URL ?? "http://localhost:8000"}
      tokenEndpoint={import.meta.env.VITE_FILENEST_TOKEN_ENDPOINT ?? "/api/filenest-token"}
      fetchInitialToken={true}
      tokenRefreshBuffer={60}
      tokenRetry={3}
      debug={import.meta.env.DEV}
    >
      <App />
    </FileNestProvider>
  </React.StrictMode>
);
