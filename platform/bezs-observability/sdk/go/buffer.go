// buffer.go — thread-safe in-memory event queue.
// Events are pushed by the application goroutines and drained by the flusher
// goroutine. When the buffer is full, the oldest event is dropped to make room
// — we prefer to lose old data over blocking the caller's hot path.
package watcher

import "sync"

// buffer holds pending wireEvents that have not yet been sent to the gateway.
// All methods are safe for concurrent use.
type buffer struct {
	mu      sync.Mutex
	events  []wireEvent
	maxSize int
}

// newBuffer creates a buffer with the given maximum capacity.
func newBuffer(maxSize int) *buffer {
	return &buffer{
		events:  make([]wireEvent, 0, min(maxSize, 512)),
		maxSize: maxSize,
	}
}

// push appends an event to the buffer.
// If the buffer is at capacity, the oldest event is silently dropped first.
func (b *buffer) push(e wireEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(b.events) >= b.maxSize {
		// Shift left — O(n) but rare; only triggers when the gateway is slow
		// or the app is producing events faster than the flusher can send.
		b.events = b.events[1:]
	}
	b.events = append(b.events, e)
}

// drain removes and returns all buffered events atomically.
// Returns nil when the buffer is empty. The caller (flusher) owns the slice.
func (b *buffer) drain() []wireEvent {
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(b.events) == 0 {
		return nil
	}
	out := b.events
	b.events = make([]wireEvent, 0, min(b.maxSize, 512))
	return out
}

// size returns the current number of buffered events without draining.
func (b *buffer) size() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.events)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
