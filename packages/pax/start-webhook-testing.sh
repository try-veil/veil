#!/bin/bash

echo "=== Starting Webhook Testing Environment ==="
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not installed"
    echo ""
    echo "Install options:"
    echo "  1. Snap: sudo snap install ngrok"
    echo "  2. Download: https://ngrok.com/download"
    exit 1
fi

# Check if PAX is running
if ! lsof -ti:3002 > /dev/null 2>&1; then
    echo "❌ PAX service not running on port 3002"
    echo ""
    echo "Start PAX first:"
    echo "  cd packages/pax"
    echo "  bun run dev"
    exit 1
fi

echo "✅ PAX service running on port 3002"
echo "✅ ngrok installed"
echo ""
echo "🚀 Starting ngrok tunnel..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Copy the HTTPS forwarding URL from ngrok output below"
echo "   2. Go to: https://dashboard.razorpay.com/app/webhooks"
echo "   3. Add webhook: <your-ngrok-url>/api/v1/webhooks/razorpay"
echo "   4. Copy webhook secret to .env file"
echo "   5. Restart PAX service"
echo ""
echo "🌐 Web Interface: http://localhost:4040"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start ngrok
ngrok http 3002
