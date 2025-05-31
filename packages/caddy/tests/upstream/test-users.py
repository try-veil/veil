from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class UsersHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {"service": "users", "message": "Basic subscription service"}
        self.wfile.write(json.dumps(response).encode())

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8080), UsersHandler)
    print("Starting users service on http://localhost:8080")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down users service...")
        server.server_close() 