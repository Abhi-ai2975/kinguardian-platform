/**
 * Pure data describing one telemetry event at capture time.
 * No methods, no I/O — only what the application can know.
 * The gateway adds org context, enrichment, and ingestion timestamp.
 */
export interface EventInput {
  readonly eventType: string;
  readonly severity: string;
  readonly message: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly parentSpanId?: string;
  readonly payload?: Record<string, unknown>;
}

/** Options shared across all typed capture methods. */
export interface CaptureOptions {
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  payload?: Record<string, unknown>;
}
