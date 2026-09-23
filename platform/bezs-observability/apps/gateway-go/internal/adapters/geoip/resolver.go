// Package geoip implements the ports.GeoResolver interface using the free
// ip-api.com HTTP API.  Results are cached in memory for 24 hours so that
// repeated events from the same IP (common in server SDKs) never hit the
// network more than once per day.  Private and loopback addresses are
// identified locally without any network call.
package geoip

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"
)

// cacheEntry holds a resolved country code and its expiry timestamp.
type cacheEntry struct {
	code    string
	expires time.Time
}

// HTTPGeoResolver resolves IPs to ISO alpha-2 country codes via ip-api.com.
// It is safe for concurrent use across goroutines.
type HTTPGeoResolver struct {
	client   *http.Client
	mu       sync.RWMutex
	cache    map[string]cacheEntry
	cacheTTL time.Duration
}

// NewHTTPGeoResolver creates a resolver with a 1-second HTTP timeout and a
// 24-hour in-memory cache TTL.  Wire this once at startup and reuse it for
// the lifetime of the process.
func NewHTTPGeoResolver() *HTTPGeoResolver {
	return &HTTPGeoResolver{
		client:   &http.Client{Timeout: time.Second},
		cache:    make(map[string]cacheEntry),
		cacheTTL: 24 * time.Hour,
	}
}

// Resolve returns the ISO alpha-2 country code for ip, or "" on any failure.
// Private, loopback, and invalid IPs return "" immediately with no network call.
func (r *HTTPGeoResolver) Resolve(ctx context.Context, ip string) string {
	if isPrivateIP(ip) {
		return ""
	}

	// Fast-path: serve from cache.
	r.mu.RLock()
	entry, ok := r.cache[ip]
	r.mu.RUnlock()
	if ok && time.Now().Before(entry.expires) {
		return entry.code
	}

	// Slow-path: resolve via HTTP.
	code := r.lookup(ctx, ip)

	// Cache even empty strings so repeated failures don't re-hit the network.
	r.mu.Lock()
	r.cache[ip] = cacheEntry{code: code, expires: time.Now().Add(r.cacheTTL)}
	r.mu.Unlock()

	return code
}

type ipAPIResponse struct {
	CountryCode string `json:"countryCode"`
	Status      string `json:"status"`
}

// lookup calls ip-api.com and returns the ISO alpha-2 code, or "" on failure.
func (r *HTTPGeoResolver) lookup(ctx context.Context, ip string) string {
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=countryCode,status", ip)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return ""
	}

	resp, err := r.client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	var result ipAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return ""
	}
	if result.Status != "success" {
		return ""
	}
	return result.CountryCode
}

// privateNetworks holds the RFC-1918, loopback, and link-local CIDR ranges
// that should never be sent to a GeoIP API.
var privateNetworks []*net.IPNet

func init() {
	for _, cidr := range []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"169.254.0.0/16",
		"::1/128",
		"fc00::/7",
		"fe80::/10",
	} {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}
		privateNetworks = append(privateNetworks, network)
	}
}

// isPrivateIP returns true if ipStr is empty, unparseable, loopback, or
// falls within any RFC-1918 / link-local range.
func isPrivateIP(ipStr string) bool {
	if ipStr == "" {
		return true
	}
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return true
	}
	for _, n := range privateNetworks {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}
