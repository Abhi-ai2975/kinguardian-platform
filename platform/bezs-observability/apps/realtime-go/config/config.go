// Package config loads all environment variables for the realtime service.
// All configuration comes from the environment — nothing is hardcoded here.
package config

import (
	"fmt"
	"os"
)

// Config holds all runtime configuration for the realtime service.
type Config struct {
	Port           string
	RedisURL       string
	IAMDatabaseURL string
	Region         string
}

// Load reads environment variables and returns a Config.
// Returns an error if any required variable is missing.
func Load() (*Config, error) {
	iamDB := os.Getenv("IAM_DATABASE_URL")
	if iamDB == "" {
		return nil, fmt.Errorf("IAM_DATABASE_URL is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	return &Config{
		Port:           port,
		RedisURL:       redisURL,
		IAMDatabaseURL: iamDB,
		Region:         os.Getenv("REGION"),
	}, nil
}
