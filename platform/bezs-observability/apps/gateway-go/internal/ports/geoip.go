// Package ports — see keyvalidator.go for the package description.
package ports

import "context"

// GeoResolver resolves a client IP address to an ISO 3166-1 alpha-2 country code.
//
// Enrichment happens at ingestion time so every stored event carries the origin
// country — this powers the global distribution choropleth on the dashboard.
//
// The interface exists so the real HTTP-based resolver can be swapped for a
// test fake without touching the transport layer.
type GeoResolver interface {
	// Resolve returns the ISO alpha-2 code (e.g. "US", "DE") for the given IP.
	// Returns an empty string for private/loopback IPs or on lookup failure so
	// that callers always receive a safe no-op value rather than an error.
	Resolve(ctx context.Context, ip string) string
}
