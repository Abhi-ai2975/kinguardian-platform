// main.tsx — application entry point.
// Wraps the app with WatcherProvider so every component can call
// useAudit / useLog / useTrace / useMetric without prop-drilling.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WatcherProvider } from "@watcher/react";
import { watcherClient } from "./lib/watcher";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WatcherProvider client={watcherClient}>
      <App />
    </WatcherProvider>
  </StrictMode>,
);
