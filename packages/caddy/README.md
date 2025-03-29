# Veil - Dynamic API Gateway Module for Caddy

Veil is a Caddy module that enables dynamic API routing and subscription-based access control. It allows you to easily onboard new APIs to your Caddy server and control access based on subscription levels.

## Features

- Dynamic API routing
- Subscription-based access control
- Simple configuration via Caddyfile
- Real-time API onboarding

## Installation

To use this module during development, you need to build Caddy with this module included. You can do this using xcaddy from the root of your project:

```bash
# From the project root directory
xcaddy build --with github.com/techsavvyash/veil/packages/caddy=./packages/caddy
```

This tells xcaddy to use the local code in `./packages/caddy` instead of fetching from GitHub.

Once the module is published, you can use:

```bash
xcaddy build --with github.com/techsavvyash/veil/packages/caddy
```

## Configuration

The module can be configured in your Caddyfile. Here's an example configuration:

```caddyfile
{
    order veil before reverse_proxy
}

localhost:2019 {
    veil X-Subscription-Key {
        api /api/v1/users http://localhost:8080 basic
        api /api/v1/products http://localhost:8081 premium
        api /api/v1/orders http://localhost:8082 enterprise
    }
}
```

### Configuration Options

- The first argument after `veil` is the header name that contains the subscription key
- Each `api` block takes three arguments:
  1. The path to match
  2. The upstream service URL
  3. The required subscription level

## How it Works

1. When a request comes in, Veil checks if the path matches any configured API routes
2. If a match is found, it checks the subscription header
3. If the subscription level matches or exceeds the required level, the request is proxied to the upstream service
4. If the subscription check fails, a 403 Forbidden response is returned
5. If no API route matches, the request is passed to the next handler

## Example Usage

Here's a complete example of how to use Veil:

1. Build Caddy with the Veil module:

```bash
xcaddy build --with github.com/techsavvyash/veil/packages/caddy
```

2. Create a Caddyfile:

```caddyfile
{
    order veil before reverse_proxy
}

localhost:2019 {
    veil X-Subscription-Key {
        api /api/v1/users http://localhost:8080 basic
        api /api/v1/products http://localhost:8081 premium
        api /api/v1/orders http://localhost:8082 enterprise
    }
}
```

3. Start Caddy:

```bash
./veil run
```

4. Make a request:

```bash
curl -H "X-Subscription-Key: premium" http://localhost:2019/api/v1/products
```

## Testing and Development

### 1. Build the Module

First, build Caddy with the Veil module from the project root:

```bash
xcaddy build --with github.com/techsavvyash/veil/packages/caddy=./packages/caddy
```

This will create a `caddy` binary in your current directory.

### 2. Set Up Test Services

For testing, you'll need some backend services. Here's a quick way to set up test services using Python:

Create three files for different services:

`test-users.py`:

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class UsersHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {"service": "users", "message": "Basic subscription service"}
        self.wfile.write(json.dumps(response).encode())

HTTPServer(('localhost', 8080), UsersHandler).serve_forever()
```

`test-products.py`:

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class ProductsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {"service": "products", "message": "Premium subscription service"}
        self.wfile.write(json.dumps(response).encode())

HTTPServer(('localhost', 8081), ProductsHandler).serve_forever()
```

`test-orders.py`:

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class OrdersHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {"service": "orders", "message": "Enterprise subscription service"}
        self.wfile.write(json.dumps(response).encode())

HTTPServer(('localhost', 8082), OrdersHandler).serve_forever()
```

### 3. Create Test Caddyfile

Create a `Caddyfile` for testing:

```caddyfile
{
    order veil before reverse_proxy
    admin localhost:2019
}

localhost:2020 {
    veil X-Subscription-Key {
        api /api/v1/users http://localhost:8080 basic
        api /api/v1/products http://localhost:8081 premium
        api /api/v1/orders http://localhost:8082 enterprise
    }
}
```

### 4. Start the Test Environment

1. Start the test services (in separate terminals):

```bash
python test-users.py
python test-products.py
python test-orders.py
```

2. Start Caddy with your test configuration:

```bash
./veil run --config Caddyfile
```

### 5. Test the API Gateway

Now you can test different subscription levels:

1. Test basic subscription:

```bash
# Should succeed
curl -H "X-Subscription-Key: basic" http://localhost:2020/api/v1/users
# Should fail
curl -H "X-Subscription-Key: basic" http://localhost:2020/api/v1/products
```

2. Test premium subscription:

```bash
# Should succeed
curl -H "X-Subscription-Key: premium" http://localhost:2020/api/v1/products
# Should succeed
curl -H "X-Subscription-Key: premium" http://localhost:2020/api/v1/users
# Should fail
curl -H "X-Subscription-Key: premium" http://localhost:2020/api/v1/orders
```

3. Test enterprise subscription:

```bash
# Should succeed (all endpoints)
curl -H "X-Subscription-Key: enterprise" http://localhost:2020/api/v1/orders
curl -H "X-Subscription-Key: enterprise" http://localhost:2020/api/v1/products
curl -H "X-Subscription-Key: enterprise" http://localhost:2020/api/v1/users
```

4. Test missing or invalid subscription:

```bash
# Should fail with 401 Unauthorized
curl http://localhost:2020/api/v1/users
# Should fail with 403 Forbidden
curl -H "X-Subscription-Key: invalid" http://localhost:2020/api/v1/users
```

### 6. Monitor Logs

You can monitor Caddy's logs for debugging:

```bash
curl localhost:2019/debug/vars
```

Or check the Caddy admin API for the current configuration:

```bash
curl localhost:2019/config/
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
