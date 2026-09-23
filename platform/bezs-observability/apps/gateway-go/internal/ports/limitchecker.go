// Package ports defines the interfaces (contracts) that the gateway's use cases
// depend on. Concrete implementations live in the adapters layer.
package ports

import "context"

// LimitChecker counts events for an organisation in the current calendar month.
// Implemented by the ClickHouse adapter; can be replaced with a fake in tests.
type LimitChecker interface {
	// MonthlyCount returns the number of events ingested by orgID this month.
	// Implementations are expected to cache results to avoid per-request DB hits.
	MonthlyCount(ctx context.Context, orgID string) (int64, error)
}
