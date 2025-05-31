from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class OrdersHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {"service": "orders", "message": "Enterprise subscription service"}
        self.wfile.write(json.dumps(response).encode())

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8082), OrdersHandler)
    print("Starting orders service on http://localhost:8082")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down orders service...")
        server.server_close() 