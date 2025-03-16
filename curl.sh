curl -X POST http://localhost:2020/veil/api/onboard \
-H "Content-Type: application/json" \
-d '{
  "path": "/weather/*",
  "upstream": "http://localhost:8082/weather",
  "required_subscription": "weather-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "weather-test-key-2", "name": "Weather Test Key 2"}]
}' | jq

curl http://localhost:2020/weather/current \
-H "X-Subscription-Key: weather-test-key-2" \
-H "X-Test-Header: test" | jq

curl -v http://localhost:2020/weather/current \
-H "X-Subscription-Key: foo-bar" \
-H "X-Test-Header: test" | jq

# ---------- Ordr ---------- #

curl -X POST http://localhost:2020/veil/api/onboard \
-H "Content-Type: application/json" \
-d '{
  "path": "/ordr/*",
  "upstream": "http://localhost:8083/ordr",
  "required_subscription": "ordr-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "ordr-test-key-2", "name": "Ordr Test Key 2"}]
}' | jq


curl -v http://localhost:2020/ordr/current \
-H "X-Subscription-Key: ordr-test-key-2" \
-H "X-Test-Header: test" | jq

curl -v http://localhost:2020/ordr/current \
-H "X-Subscription-Key: foo-test-key-2" \
-H "X-Test-Header: test" | jq

