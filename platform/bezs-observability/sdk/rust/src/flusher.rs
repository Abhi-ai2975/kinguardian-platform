// flusher.rs — background thread that drains the buffer on a timer or trigger.
//
// Uses a single std::sync::mpsc channel carrying FlushSignal. The thread
// blocks with recv_timeout(flush_interval) — the timeout IS the timer tick.
// A Flush signal causes an early drain; Stop causes a final flush then exits.
//
// A single thread (not a pool) keeps delivery ordered and the transport simple.
use std::sync::{mpsc, Arc};
use std::thread;
use std::time::Duration;

use crate::buffer::Buffer;
use crate::transport::Transport;

/// Signals sent from the main thread to the flusher thread.
pub(crate) enum FlushSignal {
    /// Drain and send now (triggered when flushAt threshold is reached).
    Flush,
    /// Drain, send, then exit.
    Stop,
}

/// Owns the flusher thread handle and the sender half of the signal channel.
pub(crate) struct Flusher {
    handle: Option<thread::JoinHandle<()>>,
    tx: mpsc::SyncSender<FlushSignal>,
}

impl Flusher {
    /// Spawns the flusher thread. The thread holds the only reference to the
    /// transport so no locking is needed around transport calls.
    pub fn start(
        buffer: Arc<Buffer>,
        transport: Arc<dyn Transport>,
        flush_interval: Duration,
        flush_at: usize,
    ) -> Self {
        // Bounded channel of capacity 1 — a second trigger while one is already
        // queued is a no-op (try_send fails silently). Prevents trigger storms.
        let (tx, rx) = mpsc::sync_channel::<FlushSignal>(1);

        let handle = thread::Builder::new()
            .name("watcher-flusher".to_owned())
            .spawn(move || run(rx, buffer, transport, flush_interval, flush_at))
            .expect("watcher: failed to spawn flusher thread");

        Flusher { handle: Some(handle), tx }
    }

    /// Signals the background thread to flush immediately (non-blocking).
    /// If a signal is already queued, this is a no-op.
    pub fn notify(&self, buffer_len: usize, flush_at: usize) {
        if buffer_len >= flush_at {
            let _ = self.tx.try_send(FlushSignal::Flush);
        }
    }

    /// Sends Stop, waits for the final flush, and joins the thread.
    pub fn stop(mut self) {
        let _ = self.tx.send(FlushSignal::Stop);
        if let Some(h) = self.handle.take() {
            let _ = h.join();
        }
    }
}

fn run(
    rx: mpsc::Receiver<FlushSignal>,
    buffer: Arc<Buffer>,
    transport: Arc<dyn Transport>,
    flush_interval: Duration,
    _flush_at: usize,
) {
    loop {
        match rx.recv_timeout(flush_interval) {
            Ok(FlushSignal::Stop) | Err(mpsc::RecvTimeoutError::Disconnected) => {
                // Final flush before exiting so no buffered events are lost.
                flush_once(&buffer, &*transport);
                return;
            }
            Ok(FlushSignal::Flush) | Err(mpsc::RecvTimeoutError::Timeout) => {
                flush_once(&buffer, &*transport);
            }
        }
    }
}

/// Drains the buffer and sends all events in one batch.
/// Logs errors to stderr but never panics — telemetry must not crash the app.
fn flush_once(buffer: &Buffer, transport: &dyn Transport) {
    let events = buffer.drain();
    if events.is_empty() {
        return;
    }
    if let Err(e) = transport.send(&events) {
        eprintln!("watcher: flush error ({} events dropped): {e}", events.len());
    }
}
