/**
 * @watcher/react-native — Watcher24 SDK for React Native.
 *
 * Uses the same @watcher/core Client and React hooks as the browser SDK,
 * with a React Native-specific transport (fetch, no sendBeacon) and an
 * AppState listener for background flush instead of visibilitychange.
 *
 * Always use a public token (wpub_) — never bundle a secret key (wtch_)
 * in a mobile app binary.
 *
 * Quick start:
 *   const client = createReactNativeClient({
 *     apiKey: process.env.EXPO_PUBLIC_W24_PUBLIC_TOKEN,
 *     appId:  process.env.EXPO_PUBLIC_W24_APP_ID,
 *   });
 *
 *   // In your root component:
 *   <WatcherProvider client={client}>
 *     <App />
 *   </WatcherProvider>
 *
 *   // In any component:
 *   const audit = useAudit();
 *   audit("screen.viewed", { payload: { screen: "Home" } });
 */
import { Client, DEFAULT_GATEWAY_URL, type ClientOptions } from "@watcher/core";
import { registerAppStateFlush } from "./app-state.js";
import { ReactNativeTransport } from "./transport.js";

// Re-export the React context provider and hooks — they work in React Native
// unchanged since React Native uses the same React runtime.
export { WatcherProvider, useWatcher } from "@watcher/react";
export { useAudit, useLog, useMetric, useTrace } from "@watcher/react";

// Re-export core types so callers only need one import.
export type { CaptureOptions, ClientOptions } from "@watcher/core";
export { ReactNativeTransport } from "./transport.js";

/**
 * Creates a Watcher Client configured for React Native:
 *   - fetch-based transport (no sendBeacon)
 *   - AppState listener flushes events when app goes to background
 *
 * Call once at app startup and pass the client to WatcherProvider.
 * The AppState listener is registered automatically.
 *
 * @param options.apiKey  Public token (wpub_) from Settings → API Keys → Public Tokens
 * @param options.appId   Optional app ID from Settings → Apps
 */
export function createReactNativeClient(options: ClientOptions): Client {
  const transport = new ReactNativeTransport(
    options.gatewayUrl  ?? DEFAULT_GATEWAY_URL,
    options.apiKey,
    options.appId,
    options.environment ?? "production",
    options.serviceName,
  );

  const client = new Client(transport, options);

  // Flush when app goes to background — the OS may suspend the process at any
  // point after this transition so we must send buffered events immediately.
  registerAppStateFlush(client);

  return client;
}
