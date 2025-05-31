# CreditService

The CreditService is a core service responsible for managing credit balances, credit transactions, and enforcing credit-based access policies. It acts as the central repository for all credit-related data.

## Responsibilities

- Maintain credit balances for all users
- Process credit transactions (additions, deductions)
- Track credit usage history
- Provide interfaces for credit validation
- Support credit-based access control

## API Endpoints

This service primarily exposes internal APIs for service-to-service communication:

### Initialize Wallet

**Endpoint:** `POST /internal/wallet/initialize`

**Purpose:** Create a new credit wallet for a user

**Authentication:** Service authentication

**Request Body:**

```json
{
  "user_id": "string",
  "initial_balance": "number",
  "currency": "string", // Default: "CREDITS"
  "metadata": {
    "source": "string", // Source of the initial credits
    "notes": "string"
  }
}
```

**Response:**

```json
{
  "wallet_id": "string",
  "user_id": "string",
  "balance": "number",
  "status": "string",
  "created_at": "timestamp"
}
```

### Check Credits

**Endpoint:** `GET /internal/credits/check`

**Purpose:** Check if a user has sufficient credits for an operation

**Authentication:** Service authentication

**Request Parameters:**

- `user_id`: User ID or API key
- `endpoint_id`: Optional endpoint ID to check cost
- `amount`: Optional custom amount to check (default: endpoint cost or 1)

**Response:**

```json
{
  "has_sufficient_credits": "boolean",
  "current_balance": "number",
  "required_amount": "number",
  "remaining_if_used": "number"
}
```

### Deduct Credits

**Endpoint:** `POST /internal/credits/deduct`

**Purpose:** Deduct credits from a user's wallet

**Authentication:** Service authentication

**Request Body:**

```json
{
  "user_id": "string",
  "amount": "number",
  "reference_type": "string", // e.g., "API_CALL", "SUBSCRIPTION", etc.
  "reference_id": "string", // ID of the reference object
  "description": "string",
  "metadata": {} // Additional transaction metadata
}
```

**Response:**

```json
{
  "transaction_id": "string",
  "wallet_id": "string",
  "previous_balance": "number",
  "new_balance": "number",
  "status": "string",
  "timestamp": "timestamp"
}
```

### Add Credits

**Endpoint:** `POST /internal/credits/add`

**Purpose:** Add credits to a user's wallet

**Authentication:** Service authentication

**Request Body:**

```json
{
  "user_id": "string",
  "amount": "number",
  "reference_type": "string",
  "reference_id": "string",
  "description": "string",
  "expires_at": "timestamp", // Optional expiry time for the credits
  "metadata": {}
}
```

**Response:**

```json
{
  "transaction_id": "string",
  "wallet_id": "string",
  "previous_balance": "number",
  "new_balance": "number",
  "status": "string",
  "timestamp": "timestamp"
}
```

### Get Credit Balance

**Endpoint:** `GET /internal/credits/balance`

**Purpose:** Get current credit balance for a user

**Authentication:** Service authentication

**Request Parameters:**

- `user_id`: User ID or API key

**Response:**

```json
{
  "wallet_id": "string",
  "user_id": "string",
  "balance": "number",
  "available_balance": "number", // May differ if some credits are reserved
  "last_transaction_at": "timestamp"
}
```

### Get Credit Transactions

**Endpoint:** `GET /internal/credits/transactions`

**Purpose:** Get credit transaction history for a user

**Authentication:** Service authentication

**Request Parameters:**

- `user_id`: User ID
- `from_date`: Start date for transactions
- `to_date`: End date for transactions
- `types`: Transaction types to include (comma-separated)
- `page`: Pagination page
- `limit`: Results per page

**Response:**

```json
{
  "transactions": [
    {
      "transaction_id": "string",
      "wallet_id": "string",
      "type": "string", // "CREDIT" or "DEBIT"
      "amount": "number",
      "balance_after": "number",
      "reference_type": "string",
      "reference_id": "string",
      "description": "string",
      "created_at": "timestamp"
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number"
  }
}
```

## Implementation Notes

- Implement database transactions to ensure data consistency
- Create indexes on frequently queried fields for performance
- Implement proper locking to prevent race conditions
- Support batch operations for efficiency
- Provide detailed logging for all credit transactions
- Store credit costs for different API endpoints
- Consider implementing credit reservation for multi-step operations
- Support credit expiration and different credit types
- Implement periodic cleanup of expired credits
- Provide metrics for credit usage patterns

## Integration Points

- GatewayService: Credit checking during API calls
- CreditManagementService: Credit administration
- SubscriptionService: Credit allocation for subscriptions
