// Public surface of @watcher/core.
// Adapter packages re-export Client and ClientOptions plus their own factory.
export { DEFAULT_GATEWAY_URL } from "./config.js";
export { Client, EVENT_TYPE_AI } from "./client.js";
export type { ClientOptions } from "./client.js";
export type { CaptureOptions, EventInput } from "./domain/event.js";
export type { Transport } from "./ports/transport.js";
export { EventBuffer } from "./buffer.js";
export { CaptureEventUseCase } from "./usecases/capture-event.js";
export { FlushBufferUseCase } from "./usecases/flush-buffer.js";
export { BackgroundFlusher } from "./flusher.js";
export { toWireEvent } from "./serializer.js";
export type { WireEvent } from "./serializer.js";
