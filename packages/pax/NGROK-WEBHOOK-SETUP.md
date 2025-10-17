# Setting Up Razorpay Webhooks with ngrok

## Prerequisites
- PAX service running on port 3002
- Razorpay account with test credentials
- ngrok installed

## Step 1: Install ngrok (if not installed)

```bash
# Download and install ngrok
# Visit: https://ngrok.com/download
# OR use snap:
sudo snap install ngrok

# Authenticate ngrok (sign up at ngrok.com for free account)
ngrok authtoken YOUR_NGROK_AUTHTOKEN
```

## Step 2: Start PAX Service

```bash
cd packages/pax
bun run dev
# Service should be running on http://localhost:3002
```

## Step 3: Start ngrok Tunnel

**Open a new terminal:**

```bash
# Expose port 3002 to the internet
ngrok http 3002
```

**You'll see output like:**
```
Session Status                online
Account                       your@email.com
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abc123.ngrok.io -> http://localhost:3002
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

## Step 4: Configure Razorpay Webhook

1. Go to **Razorpay Dashboard**: https://dashboard.razorpay.com/
2. Navigate to: **Settings** → **Webhooks** → **Add New Webhook**
3. Fill in the details:

   - **Webhook URL**: `https://abc123.ngrok.io/api/v1/webhooks/razorpay`
   - **Alert Email**: your@email.com
   - **Secret**: Generate a random secret (or use existing one from .env)

4. **Select Events** (check all relevant):
   - ✅ payment.authorized
   - ✅ payment.captured
   - ✅ payment.failed
   - ✅ order.paid
   - ✅ refund.processed
   - ✅ refund.failed

5. Click **Create Webhook**

## Step 5: Update .env with Webhook Secret

Copy the webhook secret from Razorpay dashboard and update your `.env`:

```bash
cd packages/pax
nano .env  # or your preferred editor
```

Update:
```env
RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
```

**Restart PAX service** to load the new secret:
```bash
# Stop current service (Ctrl+C)
bun run dev
```

## Step 6: Test Webhook

### Option 1: Test via Razorpay Dashboard

1. Go to **Settings** → **Webhooks**
2. Click on your webhook
3. Click **Send Test Webhook**
4. Select event type: `payment.captured`
5. Click **Send**

Watch your PAX service logs for:
```
📥 Webhook received: payment.captured
✅ Signature verified
💳 Payment updated: <payment_id>
```

### Option 2: Test with Real Payment

Create a test payment and complete it:

```bash
# Generate JWT token
TOKEN=$(bun generate-token.js 1 test@example.com 2>/dev/null | grep "Token:" | awk '{print $2}')

# Create payment order
curl -X POST http://localhost:3002/api/v1/payments/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "description": "Test payment"
  }' | jq

# Copy the razorpayOrderId and use it in Razorpay test checkout
# When payment completes, Razorpay will send webhook to ngrok → PAX
```

## Step 7: Monitor Webhooks

### In PAX Service Terminal
Watch for webhook logs:
```
📥 Webhook received: payment.captured
🔐 Verifying signature...
✅ Signature verified
💳 Processing event: payment.captured
✅ Payment pmt_xxxxx updated to: captured
```

### In ngrok Terminal
See all incoming requests:
```
GET  /api/v1/webhooks/razorpay  200 OK
POST /api/v1/webhooks/razorpay  200 OK
```

### In ngrok Web Interface
Visit: http://127.0.0.1:4040

This shows:
- All HTTP requests through the tunnel
- Request/response bodies
- Headers
- Timing

## Troubleshooting

### Webhook Not Received

**Check ngrok is running:**
```bash
curl https://your-ngrok-url.ngrok.io/health
# Should return: {"status":"ok"}
```

**Check Razorpay webhook logs:**
- Go to Razorpay Dashboard → Settings → Webhooks
- Click on your webhook
- View **Webhook Logs** tab

### Signature Verification Failed

**Error:** `Invalid webhook signature`

**Fix:**
1. Verify webhook secret matches in:
   - Razorpay Dashboard
   - packages/pax/.env
2. Restart PAX service after changing .env
3. Check ngrok isn't modifying the request

### ngrok URL Changed

**Problem:** ngrok generates new URL on restart

**Solution 1: Use ngrok paid plan for static domain**

**Solution 2: Update Razorpay webhook URL**
1. Stop ngrok
2. Start ngrok again: `ngrok http 3002`
3. Copy new URL
4. Update Razorpay webhook URL

**Solution 3: Use ngrok config for reserved domain (paid)**
```yaml
# ~/.ngrok2/ngrok.yml
version: "2"
authtoken: YOUR_TOKEN
tunnels:
  pax:
    addr: 3002
    proto: http
    domain: your-reserved-domain.ngrok.io
```

Start with: `ngrok start pax`

## Production Deployment

For production, **don't use ngrok**. Instead:

1. Deploy PAX to a server with public IP/domain
2. Configure webhook URL: `https://yourdomain.com/api/v1/webhooks/razorpay`
3. Use environment variables for secrets
4. Set up SSL certificate (Let's Encrypt)

## Testing Different Webhook Events

### Test payment.authorized
```bash
# In Razorpay Dashboard → Webhooks → Send Test Webhook
Select: payment.authorized
```

### Test payment.captured
```bash
# Complete a real test payment through checkout
# OR send test webhook from dashboard
```

### Test refund.processed
```bash
# Create a refund via API:
curl -X POST http://localhost:3002/api/v1/payments/refund \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentUid": "pmt_xxxxx",
    "reason": "Customer requested"
  }' | jq
```

## Quick Start Script

Save as `start-webhook-testing.sh`:

```bash
#!/bin/bash

echo "=== Starting Webhook Testing Environment ==="
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not installed"
    echo "Install: sudo snap install ngrok"
    exit 1
fi

# Check if PAX is running
if ! lsof -ti:3002 > /dev/null; then
    echo "❌ PAX service not running on port 3002"
    echo "Start: cd packages/pax && bun run dev"
    exit 1
fi

echo "✅ PAX service running"
echo "🚀 Starting ngrok tunnel..."
echo ""

ngrok http 3002 --log=stdout
```

Run with:
```bash
chmod +x start-webhook-testing.sh
./start-webhook-testing.sh
```

## Webhook Endpoint Details

**URL:** `POST /api/v1/webhooks/razorpay`

**Headers:**
- `x-razorpay-signature` - HMAC SHA256 signature
- `Content-Type: application/json`

**Security:**
- Signature verification using HMAC SHA256
- Webhook secret from environment variable
- Event deduplication by event ID
- Idempotent processing

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```
