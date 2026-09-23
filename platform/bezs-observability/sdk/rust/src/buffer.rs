// buffer.rs — thread-safe in-memory event queue.
// Shared between the application threads (push) and the flusher thread (drain).
// When full, the oldest event is silently dropped to make room — we prefer
// to lose old data over blocking the caller's hot path.
use std::sync::{Arc, Mutex};

use crate::event::WireEvent;

/// Thread-safe fixed-capacity queue for pending WireEvents.
#[derive(Clone)]
pub(crate) struct Buffer {
    inner: Arc<Mutex<Vec<WireEvent>>>,
    max_size: usize,
}

impl Buffer {
    /// Creates a new buffer with the given maximum capacity.
    pub fn new(max_size: usize) -> Self {
        Self {
            inner: Arc::new(Mutex::new(Vec::with_capacity(max_size.min(512)))),
            max_size,
        }
    }

    /// Appends an event, dropping the oldest if at capacity.
    pub fn push(&self, event: WireEvent) {
        let mut guard = self.inner.lock().unwrap();
        if guard.len() >= self.max_size {
            // O(n) shift — only happens when the gateway is slow or the app
            // produces events faster than the flusher can drain.
            guard.remove(0);
        }
        guard.push(event);
    }

    /// Atomically removes and returns all buffered events.
    /// Returns an empty Vec when the buffer is empty.
    pub fn drain(&self) -> Vec<WireEvent> {
        let mut guard = self.inner.lock().unwrap();
        std::mem::take(&mut *guard)
    }

    /// Returns the current number of buffered events without draining.
    pub fn len(&self) -> usize {
        self.inner.lock().unwrap().len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::WireEvent;

    fn make_event(msg: &str) -> WireEvent {
        WireEvent {
            event_type: "log".to_owned(),
            severity: "info".to_owned(),
            message: msg.to_owned(),
            user_id: None, session_id: None,
            trace_id: None, span_id: None, parent_span_id: None,
            payload: None,
        }
    }

    #[test]
    fn test_buffer_push_and_drain_returns_all_events() {
        let buf = Buffer::new(10);
        buf.push(make_event("a"));
        buf.push(make_event("b"));
        let drained = buf.drain();
        assert_eq!(drained.len(), 2);
        assert_eq!(buf.len(), 0);
    }

    #[test]
    fn test_buffer_exceeds_max_size_drops_oldest_event() {
        let buf = Buffer::new(3);
        buf.push(make_event("first"));
        buf.push(make_event("second"));
        buf.push(make_event("third"));
        buf.push(make_event("fourth")); // pushes "first" out
        let drained = buf.drain();
        assert_eq!(drained.len(), 3);
        assert!(drained.iter().all(|e| e.message != "first"), "oldest should be dropped");
    }

    #[test]
    fn test_buffer_drain_empty_returns_empty_vec() {
        let buf = Buffer::new(10);
        assert!(buf.drain().is_empty());
    }
}
