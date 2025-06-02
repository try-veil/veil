curl -X POST http://localhost:2020/veil/api/routes \
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

curl http://localhost:2021/weather/current \
-H "X-Subscription-Key: weather-test-key-2" \
-H "X-Test-Header: test" | jq

curl http://localhost:2020/weather/current \
-H "X-Subscription-Key: order-test-key-2" \
-H "X-Test-Header: test" | jq

curl http://localhost:2020/weather/current \
-H "X-Subscription-Key: orde-test-key-2" \
-H "X-Test-Header: test" | jq

curl -v http://localhost:2020/weather/current \
-H "X-Subscription-Key: foo-bar" \
-H "X-Test-Header: test" | jq

# ---------- Ordr ---------- #

curl -X POST http://localhost:2020/veil/api/routes \
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

curl -X POST http://localhost:2020/veil/api/keys \
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
curl -X PUT http://localhost:2020/veil/api/keys/status \
-H "Content-Type: application/json" \
-d '{
  "path": "/weather/*",
  "api_key": "yash-key-1",
  "is_active": false
}' | jq


# -- HTTP BIN ---
curl -X POST http://localhost:2020/veil/api/routes \
-H "Content-Type: application/json" \
-d '{
  "path": "/bin/*",
  "upstream": "https://httpbin.org/get",
  "required_subscription": "bin-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "httpbin-key", "name": "Httpbin Key"}]
}' | jq

curl http://localhost:2020/bin/get \
-H "X-Subscription-Key: httpbin-key" \
-H "X-Test-Header: test" | jq


curl -X POST http://localhost:2020/veil/api/routes \
-H "Content-Type: application/json" \
-d '{
  "path": "/todos/*",
  "upstream": "https://dummyjson.com/todos",
  "required_subscription": "todos-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "todos-key", "name": "Todos Key"}]
}' | jq

curl http://localhost:2020/todos/1 \
-H "X-Subscription-Key: todos-key" \
-H "X-Test-Header: test" | jq

curl http://localhost:2021/todos/1 \
-H "X-Subscription-Key: todos-key" \
-H "X-Test-Header: test" | jq

curl http://localhost:2021/todos/1 \
-H "X-Subscription-Key: odos-key" \
-H "X-Test-Header: test" | jq

curl http://localhost:2020/todos/1 \
-H "X-Subscription-Key: random-key" \
-H "X-Test-Header: test" | jq

curl -X POST http://localhost:2020/veil/api/routes \
-H "Content-Type: application/json" \
-d '{
  "path": "/todos",
  "upstream": "https://dummyjson.com/todos",
  "required_subscription": "todo-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "todo-key", "name": "Todo Key"}]
}' | jq

curl http://localhost:2020/todos \
-H "X-Subscription-Key: todo-key" \
-H "X-Test-Header: test" | jq


curl -X POST http://localhost:2020/veil/api/routes \
-H "Content-Type: application/json" \
-d '{
  "path": "/todo",
  "upstream": "https://dummyjson.com/todos",
  "required_subscription": "todo-subscription",
  "methods": ["GET"],
  "required_headers": ["X-Test-Header"],
  "api_keys": [{"key": "todoo-key", "name": "Todo Key"}]
}' | jq

curl http://localhost:2020/todo \
-H "X-Subscription-Key: todoo-key" \
-H "X-Test-Header: test" | jq


