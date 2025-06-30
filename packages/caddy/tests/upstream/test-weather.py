from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class WeatherHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {
            "service": "weather",
            "temperature": 25,
            "conditions": "sunny",
            "location": "New York"
        }
        self.wfile.write(json.dumps(response).encode())

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8083), WeatherHandler)
    print("Starting weather service on http://localhost:8083")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down weather service...")
        server.server_close() 