# Razorpay Testing - Actual Flow

## 📋 Current System Architecture

### Available Routes:
- **Subscriptions:** `POST /api/v1/subscriptions`
- **Payments:** `POST /api/v1/payments` (create payment)
- **Webhook:** `POST /api/v1/payments/webhook/razorpay`

### Flow:
1. Create Subscription → 2. Create Payment → 3. Process Payment → 4. Webhook → 5. Payment Complete

---

## 🧪 Step-by-Step Testing

### Prerequisites:
```bash
# All services running:
✓ Platform API: http://localhost:3000
✓ ngrok: https://uncranked-meddlingly-ryland.ngrok-free.dev
✓ Caddy: running
✓ PostgreSQL: running
```

---

### Step 1: Create a Test API (if not exists)

First, check if APIs exist:
```bash
curl http://localhost:3000/api/v1/marketplace
```

If empty, you'll need to create an API through Caddy's management endpoint or database.

---

### Step 2: Create a Subscription

```bash
curl -X POST http://localhost:3000/api/v1/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "apiId": 1,
    "planType": "basic",
    "billingCycle": "monthly",
    "requestsLimit": 1000
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "uid": "abc-123-def-456",
    "status": "active",
    ...
  }
}
```

**Save the `uid` from response** - you'll need it for payment creation!

---

### Step 3: Create Payment with Razorpay

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionUid": "YOUR_SUBSCRIPTION_UID_HERE",
    "amount": 999,
    "currency": "INR",
    "paymentMethod": {
      "type": "card",
      "provider": "razorpay"
    },
    "description": "Test payment for basic plan"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "uid": "payment-uid-123",
    "status": "pending",
    "amount": "999.00",
    "currency": "INR",
    "providerPaymentId": "order_xxxxxxxxxxxxx",  ← Razorpay Order ID
    "metadata": {
      "clientSecret": "order_xxxxxxxxxxxxx",
      "orderId": "order_xxxxxxxxxxxxx"
    }
  }
}
```

**Save the `providerPaymentId`** - this is your Razorpay Order ID!

---

### Step 4: Simulate Razorpay Webhook

Since Razorpay dashboard doesn't have a "Send Test Webhook" button for all users, you need to:

#### Option A: Make a Real Payment (Test Mode)

1. **Use Razorpay's test checkout:**
   - Create an order using Razorpay SDK (already done in Step 3)
   - Open Razorpay checkout with the `order_id`
   - Use test card: `4111 1111 1111 1111`
   - Razorpay will automatically send webhook

#### Option B: Use Razorpay CLI (if available)

```bash
# Install Razorpay CLI
npm install -g razorpay-cli

# Send test webhook
razorpay webhooks:test \
  --url https://uncranked-meddlingly-ryland.ngrok-free.dev/api/v1/payments/webhook/razorpay \
  --event payment.captured
```

#### Option C: Manual Webhook Simulation (For Development)

Create a valid HMAC signature:

```bash
# Generate signature (Node.js)
node -e "
const crypto = require('crypto');
const secret = 'ngrok-testing-secret';
const payload = JSON.stringify({
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_test123',
        order_id: 'order_xxxxxxxxxxxxx', // Use your order ID from Step 3
        amount: 99900,
        currency: 'INR',
        status: 'captured',
        method: 'card'
      }
    }
  }
});
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('Signature:', signature);
console.log('Payload:', payload);
"
```

Then send:
```bash
curl -X POST https://uncranked-meddlingly-ryland.ngrok-free.dev/api/v1/payments/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: YOUR_GENERATED_SIGNATURE" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "order_id": "order_xxxxxxxxxxxxx",
          "amount": 99900,
          "currency": "INR",
          "status": "captured",
          "method": "card"
        }
      }
    }
  }'
```

---

### Step 5: Verify Payment Status

```bash
curl http://localhost:3000/api/v1/payments/YOUR_PAYMENT_UID
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "uid": "payment-uid-123",
    "status": "completed",  ← Should be "completed" now!
    ...
  }
}
```

---

## 🔍 Monitoring & Debugging

### Watch Platform API Logs:

Your running terminal should show:
```
Webhook received from razorpay
Event type: payment.captured
Processing payment: pay_test123
✓ Signature validated
✓ Payment order_xxxxxxxxxxxxx found
✓ Payment marked as completed
```

### Watch ngrok Inspector:

Open: http://127.0.0.1:4040

Look for:
- POST `/api/v1/payments/webhook/razorpay`
- Check request body
- Check `X-Razorpay-Signature` header
- Check response (should be 200 OK)

---

## 🎯 Real Razorpay Integration Test

### Using Razorpay Standard Checkout:

**1. Create HTML test page:**
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
    <button id="rzp-button">Pay with Razorpay</button>
    <script>
        const options = {
            "key": "rzp_test_RPKLANvY0lxQKK", // Your test key
            "amount": "99900", // 999 INR in paise
            "currency": "INR",
            "name": "Veil SaaS",
            "description": "API Subscription Payment",
            "order_id": "order_xxxxxxxxxxxxx", // From Step 3
            "handler": function (response){
                alert('Payment successful: ' + response.razorpay_payment_id);
                // Razorpay will automatically send webhook to your configured URL
            },
            "theme": {
                "color": "#3399cc"
            }
        };

        const rzp = new Razorpay(options);
        document.getElementById('rzp-button').onclick = function(e){
            rzp.open();
            e.preventDefault();
        }
    </script>
</body>
</html>
```

**2. Open in browser and pay with test card:**
- Card: `4111 1111 1111 1111`
- CVV: `123`
- Expiry: Any future date
- OTP: `123456`

**3. Razorpay will send webhook automatically!**

---

## 📱 Alternative: Use Swagger UI

Access Swagger docs:
```
http://localhost:3000/swagger
```

1. Find `POST /api/v1/subscriptions`
2. Find `POST /api/v1/payments`
3. Test directly from browser

---

## ✅ Success Indicators

### Payment Created Successfully:
- ✓ Status: `pending`
- ✓ `providerPaymentId` exists (Razorpay order ID)
- ✓ No errors in logs

### Webhook Received:
- ✓ Platform API logs show "Webhook received"
- ✓ ngrok shows POST request with 200 status
- ✓ Signature validation passes

### Payment Completed:
- ✓ Payment status changed to `completed`
- ✓ Subscription remains active
- ✓ Database updated

---

## 🐛 Common Issues & Solutions

### Issue: "Subscription not found"
**Solution:** Create subscription first (Step 2)

### Issue: "Payment provider 'razorpay' not supported"
**Solution:** Check RazorpayProvider is initialized (should see in logs: "Razorpay provider initialized")

### Issue: "Invalid webhook signature"
**Solution:**
- Check `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
- Verify raw body is used for signature (not parsed JSON)

### Issue: "Payment not found for provider ID"
**Solution:**
- Create payment first (Step 3)
- Use correct `order_id` in webhook payload

---

## 🔐 Razorpay Webhook Configuration

**Configure in Razorpay Dashboard:**
1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Click "Create Webhook" or edit existing
3. **Webhook URL:** `https://uncranked-meddlingly-ryland.ngrok-free.dev/api/v1/payments/webhook/razorpay`
4. **Secret:** Copy the secret shown
5. **Events:** Select:
   - ✓ payment.authorized
   - ✓ payment.captured
   - ✓ payment.failed
   - ✓ subscription.charged (if using subscriptions)
6. **Active:** ✓ Enabled
7. Save

**Update .env:**
```bash
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Restart Platform API:**
```bash
# Stop current (Ctrl+C in terminal)
bun run dev
```

---

## 🎯 Quick Test Script

Save as `test-razorpay.sh`:
```bash
#!/bin/bash

echo "1. Creating subscription..."
SUB_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"apiId": 1, "planType": "basic", "billingCycle": "monthly", "requestsLimit": 1000}')

SUB_UID=$(echo $SUB_RESPONSE | jq -r '.data.uid')
echo "Subscription UID: $SUB_UID"

echo "\n2. Creating payment..."
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d "{\"subscriptionUid\": \"$SUB_UID\", \"amount\": 999, \"currency\": \"INR\", \"paymentMethod\": {\"type\": \"card\", \"provider\": \"razorpay\"}}")

echo $PAYMENT_RESPONSE | jq '.'

ORDER_ID=$(echo $PAYMENT_RESPONSE | jq -r '.data.providerPaymentId')
echo "Razorpay Order ID: $ORDER_ID"

echo "\nNow complete payment with Razorpay checkout using order ID: $ORDER_ID"
```

---

**Your current config:**
- Webhook URL: `https://uncranked-meddlingly-ryland.ngrok-free.dev/api/v1/payments/webhook/razorpay`
- Webhook Secret: `ngrok-testing-secret`
- Razorpay Key: `rzp_test_RPKLANvY0lxQKK`

**Ready to test! 🚀**
