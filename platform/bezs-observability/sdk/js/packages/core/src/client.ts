/**
 * Public façade — the only class application developers import.
 * Wires all layers together and exposes a simple, typed API.
 * Instantiate once per process; call shutdown() before exit.
 */
import { EventBuffer } from "./buffer.js";
import type { CaptureOptions, EventInput } from "./domain/event.js";
import { BackgroundFlusher } from "./flusher.js";
import type { Transport } from "./ports/transport.js";
import { CaptureEventUseCase } from "./usecases/capture-event.js";
import { FlushBufferUseCase } from "./usecases/flush-buffer.js";

/** The event type string for all AI agent telemetry events. */
export const EVENT_TYPE_AI = "ai" as const;

export interface ClientOptions {
  apiKey: string;
  /**
   * Optional — only needed for legacy org-level keys that have no app linked in the console.
   * App-scoped secret keys and all public tokens (wpub_) do not need this;
   * the gateway resolves the application from the key itself.
   */
  appId?: string;
  /**
   * Optional developer-set label for the component sending events.
   * Sent as X-Service-Name header — stored verbatim in ClickHouse for filtering.
   * Examples: "payment-api", "auth-worker", "mobile-ios", "ai-agent"
   */
  serviceName?: string;
  environment?: string;
  gatewayUrl?: string;
  flushInterval?: number;
  flushAt?: number;
  maxBuffer?: number;
}

export class Client {
  private readonly capture: CaptureEventUseCase;
  private readonly flushUseCase: FlushBufferUseCase;
  private readonly flusher: BackgroundFlusher;

  constructor(transport: Transport, options: ClientOptions) {
    if (!options.apiKey) throw new Error("apiKey is required");

    const buffer = new EventBuffer(options.maxBuffer ?? 10_000);
    this.capture = new CaptureEventUseCase(buffer);
    this.flushUseCase = new FlushBufferUseCase(buffer, transport);
    this.flusher = new BackgroundFlusher(
      this.flushUseCase,
      buffer,
      options.flushInterval ?? 500,
      options.flushAt ?? 100,
    );
    this.flusher.start();
  }

  // ── Typed helpers ───────────────────────────────────────────────────────────

  /** Capture an audit event — user actions, compliance trail, security events. */
  audit(message: string, options: CaptureOptions = {}): void {
    this.captureTyped("audit", "info", message, options);
  }

  /** Capture an application log event. */
  log(severity: string, message: string, options: Omit<CaptureOptions, "userId" | "sessionId"> = {}): void {
    this.captureTyped("log", severity, message, options);
  }

  /** Capture a distributed trace span. */
  trace(message: string, options: CaptureOptions = {}): void {
    this.captureTyped("trace", "info", message, options);
  }

  /** Capture a metric data point. Put the numeric value in payload. */
  metric(message: string, options: Pick<CaptureOptions, "payload"> = {}): void {
    this.captureTyped("metric", "info", message, options);
  }

  /** Capture an AI agent event — LLM calls, tool calls, workflow steps, evals.
   *  Always include a structured `payload` with a `kind` field so the console
   *  can display AI-specific columns (model, tokens, cost, latency).
   */
  ai(severity: string, message: string, options: CaptureOptions = {}): void {
    this.captureTyped("ai", severity, message, options);
  }

  /** Generic capture — use when the typed helpers don't fit. */
  event(eventType: string, severity: string, message: string, options: CaptureOptions = {}): void {
    this.captureTyped(eventType, severity, message, options);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Immediately send all buffered events. */
  async flush(): Promise<void> {
    await this.flushUseCase.execute();
  }

  /** Flush remaining events and stop the background flusher. */
  async shutdown(): Promise<void> {
    await this.flusher.stop();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private captureTyped(eventType: string, severity: string, message: string, options: CaptureOptions): void {
    const event: EventInput = {
      eventType,
      severity,
      message,
      ...(options.userId !== undefined && { userId: options.userId }),
      ...(options.sessionId !== undefined && { sessionId: options.sessionId }),
      ...(options.traceId !== undefined && { traceId: options.traceId }),
      ...(options.spanId !== undefined && { spanId: options.spanId }),
      ...(options.parentSpanId !== undefined && { parentSpanId: options.parentSpanId }),
      ...(options.payload !== undefined && { payload: options.payload }),
    };
    this.capture.execute(event);
    this.flusher.checkSizeTrigger();
  }
}
