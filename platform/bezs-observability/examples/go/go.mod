module github.com/watcher24/example-go

go 1.21

require (
	github.com/joho/godotenv v1.5.1
	github.com/watcher24/go-sdk v0.1.0
)

replace github.com/watcher24/go-sdk => ../../sdk/go
