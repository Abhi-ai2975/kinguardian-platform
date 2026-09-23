// watcher.ts — Watcher24 client singleton for this React Native app.
//
// Always use a public token (wpub_) — never a secret key (wtch_).
// Secret keys can be extracted from mobile binaries; public tokens are
// write-only and rate-limited so a leaked token cannot cause real damage.
//
// EXPO_PUBLIC_* variables are bundled into the app at build time.
// Do not put secret keys in any EXPO_PUBLIC_* variable.
import { createReactNativeClient } from "@watcher/react-native";

export const watcher = createReactNativeClient({
  apiKey:      process.env.EXPO_PUBLIC_W24_PUBLIC_TOKEN ?? "",
  appId:       process.env.EXPO_PUBLIC_W24_APP_ID,
  serviceName: "example-rn-app",
  environment: __DEV__ ? "development" : "production",
});
