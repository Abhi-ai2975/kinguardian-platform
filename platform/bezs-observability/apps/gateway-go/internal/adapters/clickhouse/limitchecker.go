// Package clickhouse implements the LimitChecker port using ClickHouse's HTTP
// interface. No external Go client is needed — standard net/http is sufficient
// for a single COUNT(*) query.
//
// Results are cached per org for 60 seconds so that high-throughput orgs do
// not pay the cost of a ClickHouse round-trip on every event.
package clickhouse

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// cachedEntry holds a count result and its expiry time.
type cachedEntry struct {
	count     int64
	expiresAt time.Time
}

// LimitCheckerAdapter queries ClickHouse for monthly event counts and caches
// the results in memory to avoid a DB round-trip on every ingest request.
type LimitCheckerAdapter struct {
	baseURL  string
	username string
	password string
	database string
	ttl      time.Duration

	mu    sync.RWMutex
	cache map[string]cachedEntry
}

// NewLimitCheckerAdapter creates the adapter.
// baseURL is the ClickHouse HTTP endpoint, e.g. "http://localhost:8123".
func NewLimitCheckerAdapter(baseURL, username, password, database string) *LimitCheckerAdapter {
	return &LimitCheckerAdapter{
		baseURL:  strings.TrimRight(baseURL, "/"),
		username: username,
		password: password,
		database: database,
		ttl:      60 * time.Second,
		cache:    make(map[string]cachedEntry),
	}
}

// MonthlyCount implements ports.LimitChecker.
// Returns the cached count if still fresh; otherwise queries ClickHouse.
// On ClickHouse error the caller should fail open (allow the event through).
func (a *LimitCheckerAdapter) MonthlyCount(ctx context.Context, orgID string) (int64, error) {
	// Fast path: return cached result if still valid.
	a.mu.RLock()
	if entry, ok := a.cache[orgID]; ok && time.Now().Before(entry.expiresAt) {
		a.mu.RUnlock()
		return entry.count, nil
	}
	a.mu.RUnlock()

	count, err := a.query(ctx, orgID)
	if err != nil {
		return 0, err
	}

	a.mu.Lock()
	a.cache[orgID] = cachedEntry{count: count, expiresAt: time.Now().Add(a.ttl)}
	a.mu.Unlock()

	return count, nil
}

// query hits the ClickHouse HTTP API with a parameterised COUNT query.
// Using named parameters ({orgId:String} + param_orgId=value) avoids any
// SQL injection risk from the orgID value.
func (a *LimitCheckerAdapter) query(ctx context.Context, orgID string) (int64, error) {
	q := `SELECT COUNT(*) FROM watcher.events WHERE organization_id={orgId:String} AND toStartOfMonth(timestamp)=toStartOfMonth(now())`

	reqURL := fmt.Sprintf("%s/?database=%s&param_orgId=%s&query=%s",
		a.baseURL,
		url.QueryEscape(a.database),
		url.QueryEscape(orgID),
		url.QueryEscape(q),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return 0, fmt.Errorf("limit checker: build request: %w", err)
	}
	if a.username != "" {
		req.SetBasicAuth(a.username, a.password)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("limit checker: request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("limit checker: read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("limit checker: clickhouse returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	count, err := strconv.ParseInt(strings.TrimSpace(string(body)), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("limit checker: parse %q: %w", strings.TrimSpace(string(body)), err)
	}

	return count, nil
}
