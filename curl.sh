curl -X POST http://localhost:2020/veil/api/onboard \
-H "Content-Type: application/json" \
-d '{
  "path": "/weather/*",
  "upstream": "http://localhost:8083/weather",
  "required_subscription": "weather-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "weather-test-key-2", "name": "Weather Test Key 2"}]
}' | jq

curl http://localhost:2020/weather/current \
-H "X-Subscription-Key: weather-test-key-2" \
-H "X-Test-Header: test" | jq

curl http://localhost:2020/weather/current \
-H "X-Subscription-Key: order-test-key-2" \
-H "X-Test-Header: test" | jq

curl -v http://localhost:2020/weather/current \
-H "X-Subscription-Key: foo-bar" \
-H "X-Test-Header: test" | jq

# ---------- Ordr ---------- #

curl -X POST http://localhost:2020/veil/api/onboard \
-H "Content-Type: application/json" \
-d '{
  "path": "/order/*",
  "upstream": "http://localhost:8082/order",
  "required_subscription": "order-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "order-test-key-2", "name": "Order Test Key 2"}]
}' | jq


curl -v http://localhost:2020/order/current \
-H "X-Subscription-Key: order-test-key-2" \
-H "X-Test-Header: test" | jq

curl -v http://localhost:2020/order/current \
-H "X-Subscription-Key: weather-test-key-2" \
-H "X-Test-Header: test" | jq

curl -v http://localhost:2020/order/current \
-H "X-Subscription-Key: foo-test-key-2" \
-H "X-Test-Header: test" | jq

# ---------- API Keys ---------- #

curl -X POST http://localhost:2020/veil/api/api-keys \
-H "Content-Type: application/json" \
-d '{
  "path": "/weather/*",
  "api_keys": [{"key": "yash-key-1", "name": "Yash Key 1"}]
}' | jq

# -- valid key
curl http://localhost:2020/weather/current \
-H "X-Subscription-Key: yash-key-1" \
-H "X-Test-Header: test" | jq

# -- invalid key
curl http://localhost:2020/weather/current \
-H "X-Subscription-Key: invalid-key" \
-H "X-Test-Header: test" | jq

# -- update key status
curl -X PUT http://localhost:2020/veil/api/api-keys/status \
-H "Content-Type: application/json" \
-d '{
  "path": "/weather/*",
  "api_key": "yash-key-1",
  "is_active": false
}' | jq