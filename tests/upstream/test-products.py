from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class ProductsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {"service": "products", "message": "Premium subscription service"}
        self.wfile.write(json.dumps(response).encode())

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8081), ProductsHandler)
    print("Starting products service on http://localhost:8081")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down products service...")
        server.server_close() 