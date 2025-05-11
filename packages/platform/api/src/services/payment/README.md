# Payment Service

This module handles payments using Razorpay as the payment gateway.

## Overview

The payment module provides functionality to:

- Create payment orders
- Process payments
- Process refunds
- Handle webhook notifications
- Manage payment attempts

## Environment Variables

Make sure these environment variables are set:

```
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## API Endpoints

### Payment Controller

- `POST /internal/payment/process` - Process a payment
- `GET /internal/payment/:paymentId` - Get payment details
- `GET /internal/payment/:paymentId/attempts` - Get payment attempt history
- `POST /internal/payment/:paymentId/refund` - Refund a payment
- `POST /internal/payment/capture` - Capture a payment after Razorpay checkout

### Webhook Controller

- `POST /webhooks/razorpay` - Handle Razorpay webhook events

## Flow Overview

### Payment Processing Flow

1. Frontend initiates a payment request to `/internal/payment/process`
2. Backend creates a Razorpay order and returns details
3. Frontend uses these details to show Razorpay checkout
4. After successful payment, frontend calls `/internal/payment/capture`
5. Backend captures the payment and adds credits to user's wallet

### Webhook Processing Flow

1. Razorpay sends events to `/webhooks/razorpay`
2. Backend verifies the webhook signature
3. Backend processes the event (e.g., payment success, failure, refund)
4. Backend updates payment status and related entities

## Integration Example

Frontend integration example:

```javascript
// 1. Create a payment through your API
const orderData = await api.post('/internal/payment/process', {
  userId: 'user-123',
  amount: 100,
  paymentMethodType: 'CARD',
  description: 'Credit top-up',
});

// 2. Initialize Razorpay checkout
const options = {
  key: 'rzp_test_your_key_id',
  amount: orderData.amount * 100, // Amount in smallest currency unit
  currency: 'INR',
  name: 'Veil Platform',
  description: 'Credit Purchase',
  order_id: orderData.payment_id,
  handler: async function (response) {
    // 3. Capture payment after successful checkout
    await api.post('/internal/payment/capture', {
      razorpayPaymentId: response.razorpay_payment_id,
      razorpayOrderId: response.razorpay_order_id,
      razorpaySignature: response.razorpay_signature,
      amount: orderData.amount,
    });
  },
};

const razorpay = new Razorpay(options);
razorpay.open();
```

## Webhook Configuration

To configure Razorpay webhooks:

1. Log in to Razorpay dashboard
2. Go to Settings > Webhooks
3. Add a webhook with URL: `https://your-api-domain.com/webhooks/razorpay`
4. Create a secret and add it to your `.env` file
5. Select events to track (`payment.captured`, `payment.failed`, `refund.processed`)
