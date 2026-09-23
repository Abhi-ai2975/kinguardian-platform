/**
 * Converts an EventInput (camelCase internal representation) to the
 * snake_case wire format the gateway REST API expects.
 *
 * Keeping this in core means every transport (browser, node, react-native,
 * etc.) produces identical JSON without duplicating the mapping logic.
 */
import type { EventInput } from "./domain/event.js";

export interface WireEvent {
  event_type: string;
  severity: string;
  message: string;
  user_id?: string;
  session_id?: string;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  payload?: Record<string, unknown>;
}

export function toWireEvent(event: EventInput): WireEvent {
  const wire: WireEvent = {
    event_type: event.eventType,
    severity: event.severity,
    message: event.message,
  };
  if (event.userId !== undefined) wire.user_id = event.userId;
  if (event.sessionId !== undefined) wire.session_id = event.sessionId;
  if (event.traceId !== undefined) wire.trace_id = event.traceId;
  if (event.spanId !== undefined) wire.span_id = event.spanId;
  if (event.parentSpanId !== undefined) wire.parent_span_id = event.parentSpanId;
  if (event.payload !== undefined) wire.payload = event.payload;
  return wire;
}
