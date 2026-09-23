// transport.go — HTTP transport that sends event batches to the gateway.
// The Transport interface allows tests to inject a fake without a live gateway.
// The httpTransport implementation uses only stdlib net/http — no dependencies.
package watcher

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Transport is the port interface for delivering event batches to the gateway.
// The production implementation uses HTTP; tests inject a recordingTransport.
type Transport interface {
	// Send delivers a batch of events. Returns nil on success.
	// Network errors and 5xx responses are retried; 4xx errors are not.
	Send(events []wireEvent) error
}

// httpTransport implements Transport using stdlib net/http with retry logic.
// One instance is shared by the flusher goroutine — no concurrent Send calls.
type httpTransport struct {
	client      *http.Client
	endpoint    string // e.g. https://ingest.watcher24.io/v1/events
	apiKey      string
	sdkVersion  string
	runtime     string // e.g. go/go1.21.0
	appID       string
	serviceName string
}

// retryDelays defines the wait durations between successive send attempts.
// Applied only to network errors and 5xx responses — 4xx errors are never retried
// because re-sending the same batch won't change a 400 or 401 outcome.
var retryDelays = []time.Duration{100 * time.Millisecond, 200 * time.Millisecond, 400 * time.Millisecond}

// Send serialises the event batch as a JSON array and POSTs it to the gateway.
// Retries up to len(retryDelays) times on transient failures.
func (t *httpTransport) Send(events []wireEvent) error {
	body, err := json.Marshal(events)
	if err != nil {
		return fmt.Errorf("watcher: marshal events: %w", err)
	}

	var lastErr error
	for attempt := 0; attempt <= len(retryDelays); attempt++ {
		if attempt > 0 {
			time.Sleep(retryDelays[attempt-1])
		}
		lastErr = t.do(body)
		if lastErr == nil {
			return nil
		}
		if isClientError(lastErr) {
			// 4xx — retrying the same payload won't help; drop the batch.
			return lastErr
		}
	}
	return fmt.Errorf("watcher: send failed after %d attempts: %w", len(retryDelays)+1, lastErr)
}

// do performs a single HTTP POST and returns an error if the response is not 2xx.
func (t *httpTransport) do(body []byte) error {
	req, err := http.NewRequest(http.MethodPost, t.endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("watcher: build request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+t.apiKey)
	req.Header.Set("X-SDK-Version", t.sdkVersion)
	req.Header.Set("X-Runtime", t.runtime)
	if t.appID != "" {
		req.Header.Set("X-App-ID", t.appID)
	}
	if t.serviceName != "" {
		req.Header.Set("X-Service-Name", t.serviceName)
	}

	resp, err := t.client.Do(req)
	if err != nil {
		return fmt.Errorf("watcher: http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return &gatewayError{status: resp.StatusCode}
}

// gatewayError wraps an HTTP status code so the retry logic can distinguish
// client errors (4xx) from server errors (5xx).
type gatewayError struct{ status int }

func (e *gatewayError) Error() string {
	return fmt.Sprintf("watcher: gateway returned HTTP %d", e.status)
}

// isClientError returns true when the error is a 4xx gateway response.
func isClientError(err error) bool {
	ge, ok := err.(*gatewayError)
	return ok && ge.status >= 400 && ge.status < 500
}
