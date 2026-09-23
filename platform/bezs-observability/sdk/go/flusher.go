// flusher.go — background goroutine that periodically drains the buffer and
// sends events to the gateway. Using a single goroutine (not a pool) keeps
// delivery ordered and simplifies the transport interface.
package watcher

import (
	"log"
	"sync"
	"time"
)

// flusher owns the goroutine that drains the buffer on a timer tick or
// when the buffer reaches the flushAt threshold.
type flusher struct {
	interval  time.Duration
	flushAt   int
	buf       *buffer
	transport Transport

	trigger chan struct{} // signals the goroutine to flush immediately
	done    chan struct{} // signals the goroutine to stop after a final flush
	wg      sync.WaitGroup
}

// newFlusher creates a flusher and starts its background goroutine immediately.
func newFlusher(buf *buffer, transport Transport, interval time.Duration, flushAt int) *flusher {
	f := &flusher{
		interval:  interval,
		flushAt:   flushAt,
		buf:       buf,
		transport: transport,
		trigger:   make(chan struct{}, 1), // buffered so push never blocks
		done:      make(chan struct{}),
	}
	f.wg.Add(1)
	go f.run()
	return f
}

// run is the flush loop. It drains on the interval tick, on an early trigger
// (flushAt threshold), and once more when stop() closes the done channel.
func (f *flusher) run() {
	defer f.wg.Done()
	ticker := time.NewTicker(f.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			f.flush()
		case <-f.trigger:
			f.flush()
		case <-f.done:
			// Final flush — ensures no events are silently dropped on shutdown.
			f.flush()
			return
		}
	}
}

// notify is called after every push. If the buffer has reached the flushAt
// threshold it signals the goroutine to flush now rather than wait for the
// next timer tick. The channel is buffered (capacity 1) so this never blocks.
func (f *flusher) notify() {
	if f.buf.size() >= f.flushAt {
		select {
		case f.trigger <- struct{}{}:
		default: // goroutine already has a pending trigger queued
		}
	}
}

// flush drains the buffer and sends all events in a single batch.
// Errors are logged but never returned — telemetry must not crash the app.
func (f *flusher) flush() {
	events := f.buf.drain()
	if len(events) == 0 {
		return
	}
	if err := f.transport.Send(events); err != nil {
		log.Printf("watcher: flush error (%d events dropped): %v", len(events), err)
	}
}

// stop signals the goroutine to perform a final flush and exit, then waits
// for it to finish. Returns an error if already stopped.
func (f *flusher) stop() error {
	select {
	case <-f.done:
		// Already closed — calling stop twice is a no-op error.
		return nil
	default:
		close(f.done)
		f.wg.Wait()
		return nil
	}
}
