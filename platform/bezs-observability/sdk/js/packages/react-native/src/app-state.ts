/**
 * AppState flush handler — the React Native equivalent of the browser's
 * visibilitychange + sendBeacon pattern.
 *
 * When the app moves to "background" or "inactive" (user switches app, locks phone,
 * gets a phone call), pending buffered events must be sent immediately because
 * the OS may suspend or kill the process at any point after this transition.
 *
 * AppState is imported from 'react-native' so this file must not be imported
 * in non-RN environments (web, Node.js). The package.json peerDep on react-native
 * ensures this.
 */
import { AppState, type AppStateStatus } from "react-native";
import type { Client } from "@watcher/core";

/**
 * Registers an AppState listener that flushes the client whenever the app
 * moves to background or inactive state.
 *
 * Returns a cleanup function — call it in your app's cleanup logic or
 * component unmount to remove the listener. The factory function
 * `createReactNativeClient` calls this automatically.
 */
export function registerAppStateFlush(client: Client): () => void {
  const subscription = AppState.addEventListener(
    "change",
    (nextState: AppStateStatus) => {
      // "background" — app is in the background (user switched apps)
      // "inactive"   — transitional state on iOS (call, control centre, etc.)
      // Both mean: flush now because the process may be suspended shortly.
      if (nextState === "background" || nextState === "inactive") {
        void client.flush().catch((err) => {
          console.error("[watcher] AppState flush failed:", err);
        });
      }
    },
  );

  // Return a cleanup function to remove the listener when no longer needed.
  return () => subscription.remove();
}
