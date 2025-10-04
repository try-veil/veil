# Razorpay Webhook Setup for Local Development

## Problem
Razorpay doesn't allow `localhost` URLs for webhooks. You need a public URL that forwards to your local development server.

---

## Solution Options

### Option 1: ngrok (Recommended - Free & Simple)

**1. Install ngrok:**
```bash
# Download from https://ngrok.com/download
# Or via package manager:
snap install ngrok
# Or
brew install ngrok
```

**2. Start your Platform API:**
```bash
cd /home/shady/Desktop/veil/packages/platform-api
bun run dev
# Should start on http://localhost:3000
```

**3. Create ngrok tunnel:**
```bash
ngrok http 3000
```

**4. Copy the public URL:**
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

**5. Configure in Razorpay:**
- Go to: https://dashboard.razorpay.com/app/webhooks
- Click "Add New Webhook"
- URL: `https://abc123.ngrok.io/api/v1/payments/webhook/razorpay`
- Select events:
  - [x] payment.authorized
  - [x] payment.captured
  - [x] payment.failed
  - [x] subscription.charged
  - [x] subscription.cancelled
  - [x] refund.created
  - [x] refund.processed
- Save and copy the **Webhook Secret**

**6. Update .env:**
```bash
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

**Note:** ngrok free URLs change every restart. For persistent URLs, upgrade to ngrok paid plan.

---

### Option 2: Cloudflare Tunnel (Free & Persistent)

**1. Install cloudflared:**
```bash
# Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

**2. Authenticate:**
```bash
cloudflared tunnel login
```

**3. Create tunnel:**
```bash
cloudflared tunnel create veil-webhooks
```

**4. Configure tunnel:**
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <TUNNEL-ID>
credentials-file: /home/shady/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: veil-webhooks.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

**5. Run tunnel:**
```bash
cloudflared tunnel run veil-webhooks
```

**6. Configure DNS and Razorpay webhook with the public URL**

---

### Option 3: Localhost.run (Quickest - No Installation)

**1. Start Platform API:**
```bash
cd /home/shady/Desktop/veil/packages/platform-api
bun run dev
```

**2. Create tunnel (single command):**
```bash
ssh -R 80:localhost:3000 localhost.run
```

**3. Copy the public URL shown:**
```
Connect to http://abc-123-45.localhost.run
```

**4. Configure in Razorpay:**
- Webhook URL: `http://abc-123-45.localhost.run/api/v1/payments/webhook/razorpay`

**Note:** URL changes on reconnect, not ideal for persistent setup.

---

### Option 4: Webhook.site (For Testing Only)

**1. Go to:** https://webhook.site
**2. Copy your unique URL**
**3. Configure in Razorpay temporarily**
**4. View incoming webhook payloads to debug**

This is only for inspecting webhook structure, not for actual development.

---

## Recommended Setup for Development

**Best approach: ngrok**

```bash
# Terminal 1: Start Platform API
cd /home/shady/Desktop/veil/packages/platform-api
bun run dev

# Terminal 2: Start ngrok tunnel
ngrok http 3000
# Copy the https URL

# Terminal 3: Start Caddy (when build works)
cd /home/shady/Desktop/veil/packages/caddy
make run
```

**Configure Razorpay:**
1. Dashboard → Settings → Webhooks → Add New Webhook
2. URL: `https://YOUR-NGROK-URL.ngrok.io/api/v1/payments/webhook/razorpay`
3. Copy webhook secret → Update `.env`

---

## Webhook Endpoint Details

**Your webhook handler is at:**
```
POST /api/v1/payments/webhook/razorpay
```

**Expected in platform-api routes:**
- File: `packages/platform-api/src/routes/payments.ts`
- Handler: `PaymentService.handleWebhook()`

**Signature verification:**
- Uses HMAC SHA256
- Validates with `RAZORPAY_WEBHOOK_SECRET`
- Implemented in `RazorpayProvider.validateWebhook()`

---

## Testing Webhooks

**After setup, test with Razorpay Dashboard:**
1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Select your webhook
3. Click "Send Test Webhook"
4. Check your Platform API logs for incoming events

**Expected log output:**
```
Webhook received: payment.captured
Payment completed: pay_xxxxxxx
```

---

## Production Setup

For production, you'll need a real domain:

```bash
# Production webhook URL
https://api.yourdomain.com/api/v1/payments/webhook/razorpay

# Generate production webhook secret in Razorpay Live Mode
# Update production .env:
RAZORPAY_WEBHOOK_SECRET=whsec_live_xxxxxxxxxx
```

---

## Current Status

- [x] Webhook handler implemented in PaymentService
- [x] Signature validation implemented (HMAC SHA256)
- [x] Environment variable configured in .env.example
- [ ] Public tunnel set up (ngrok/cloudflare)
- [ ] Webhook registered in Razorpay dashboard
- [ ] Webhook secret added to .env
- [ ] Webhook tested with Razorpay test events

---

## Quick Start Commands

```bash
# 1. Install ngrok
snap install ngrok
# or download from https://ngrok.com/download

# 2. Start services
cd /home/shady/Desktop/veil/packages/platform-api
bun run dev &

# 3. Start tunnel
ngrok http 3000

# 4. Configure Razorpay with the ngrok URL
# 5. Update .env with webhook secret
# 6. Test!
```
