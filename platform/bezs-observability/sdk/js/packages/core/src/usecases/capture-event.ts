/**
 * Validates caller input and pushes one event onto the buffer.
 * Runs synchronously on the caller's thread — no I/O allowed here.
 */
import type { EventBuffer } from "../buffer.js";
import type { EventInput } from "../domain/event.js";

const VALID_EVENT_TYPES = new Set([
  "audit", "log", "trace", "metric", "event",
  "security", "ai", "system", "infrastructure",
]);

const VALID_SEVERITIES = new Set([
  "debug", "info", "warn", "error", "critical",
]);

export class CaptureEventUseCase {
  constructor(private readonly buffer: EventBuffer) {}

  execute(event: EventInput): void {
    validate(event);
    this.buffer.push(event);
  }
}

function validate(event: EventInput): void {
  if (!event.message) throw new Error("message is required");
  if (!VALID_EVENT_TYPES.has(event.eventType)) {
    throw new Error(`invalid eventType "${event.eventType}"; valid: ${[...VALID_EVENT_TYPES].join(", ")}`);
  }
  if (!VALID_SEVERITIES.has(event.severity)) {
    throw new Error(`invalid severity "${event.severity}"; valid: ${[...VALID_SEVERITIES].join(", ")}`);
  }
}
