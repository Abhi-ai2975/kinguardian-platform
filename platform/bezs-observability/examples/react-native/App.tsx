// App.tsx — Watcher24 React Native SDK example.
//
// Demonstrates:
//   - WatcherProvider wrapping the app root
//   - All typed hooks (useAudit, useLog, useTrace, useMetric)
//   - Manual flush before a critical action
//   - AppState background flush (registered automatically by createReactNativeClient)
//
// Run:
//   cp .env.example .env    # fill in EXPO_PUBLIC_W24_PUBLIC_TOKEN
//   pnpm start
import React, { useEffect } from "react";
import {
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  WatcherProvider,
  useAudit,
  useLog,
  useMetric,
  useTrace,
} from "@watcher/react-native";

import { watcher } from "./lib/watcher";

// ── Root — wrap the entire app in WatcherProvider ────────────────────────────

export default function App() {
  return (
    <WatcherProvider client={watcher}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.heading}>Watcher24 RN Example</Text>
          <EventButtons />
        </ScrollView>
      </SafeAreaView>
    </WatcherProvider>
  );
}

// ── Demo buttons — one per event type ───────────────────────────────────────

function EventButtons() {
  const audit  = useAudit();
  const log    = useLog();
  const trace  = useTrace();
  const metric = useMetric();

  // Log a screen view on mount — equivalent of a page view in web analytics.
  useEffect(() => {
    audit("screen.viewed", { payload: { screen: "Home" } });
  }, []);

  function handleAudit() {
    audit("button.tapped", {
      userId:  "u_demo",
      payload: { button: "Audit event", screen: "Home" },
    });
  }

  function handleLog() {
    log("info", "user action logged", {
      payload: { action: "Log button tapped" },
    });
  }

  function handleTrace() {
    const traceId = `trace-${Date.now()}`;
    trace("api.request", {
      traceId,
      spanId: "span-root",
      payload: { endpoint: "/api/orders", method: "POST" },
    });
    trace("db.query", {
      traceId,
      spanId:       "span-db",
      parentSpanId: "span-root",
      payload:      { table: "orders", latency_ms: 12 },
    });
  }

  function handleMetric() {
    metric("button.tap_count", {
      payload: { value: 1, button: "Metric" },
    });
  }

  async function handleFlush() {
    // Explicit flush — use before a critical transition (sign out, checkout, etc.)
    // to ensure buffered events are sent before the screen changes.
    await watcher.flush();
    log("info", "manual flush complete");
  }

  return (
    <View style={styles.buttons}>
      <Button title="Send audit event"  onPress={handleAudit}  />
      <Button title="Send log event"    onPress={handleLog}    />
      <Button title="Send trace spans"  onPress={handleTrace}  />
      <Button title="Send metric"       onPress={handleMetric} />
      <Button title="Flush now"         onPress={handleFlush}  />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, gap: 8 },
  heading:   { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  buttons:   { gap: 12 },
});
