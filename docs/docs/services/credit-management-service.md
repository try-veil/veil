# CreditManagementService

The CreditManagementService handles all aspects of credit management for users, including credit initialization, balance checking, and credit-related administrative operations.

## Responsibilities

- Verify JWT tokens for user authentication
- Initialize credit wallets for new users
- Check and update credit balances
- Track credit usage history
- Manage credit replenishment

## API Endpoints

### Initialize User Credits

**Endpoint:** `POST /initialize`

**Purpose:** Initialize a credit wallet for a new user with default credits

**Authentication:** JWT token (Consumer role)

**Request Body:**

```json
{
  "initial_credits": "number" // Optional, defaults to system default (150)
}
```

**Response:**

```json
{
  "wallet_id": "string", // Unique wallet ID
  "credit_balance": "number", // Current credit balance
  "status": "string", // Status of the wallet
  "created_at": "timestamp"
}
```

**Status Codes:**

- 201: Wallet created successfully
- 400: Invalid request
- 401: Unauthorized (invalid token)
- 409: Wallet already exists for user

### Get Credit Balance

**Endpoint:** `GET /credits`

**Purpose:** Get the current credit balance for a user

**Authentication:** JWT token (any role)

**Response:**

```json
{
  "wallet_id": "string",
  "credit_balance": "number",
  "last_updated": "timestamp"
}
```

### Get Credit History

**Endpoint:** `GET /credits/history`

**Purpose:** Get credit usage history for a user

**Authentication:** JWT token (any role)

**Query Parameters:**

- `from_date`: Start date for history
- `to_date`: End date for history
- `page`: Pagination page number
- `limit`: Results per page

**Response:**

```json
{
  "transactions": [
    {
      "transaction_id": "string",
      "type": "string", // "DEBIT" or "CREDIT"
      "amount": "number",
      "balance_after": "number",
      "description": "string",
      "api_id": "string", // If related to an API call
      "timestamp": "timestamp"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

### Add Credits

**Endpoint:** `POST /credits/add`

**Purpose:** Add credits to a user's wallet

**Authentication:** JWT token (Admin role)

**Request Body:**

```json
{
  "user_id": "string", // Target user ID
  "amount": "number", // Amount to add
  "reason": "string", // Reason for credit addition
  "expiry_date": "timestamp" // Optional expiry date for credits
}
```

**Response:**

```json
{
  "wallet_id": "string",
  "previous_balance": "number",
  "added_amount": "number",
  "current_balance": "number",
  "transaction_id": "string"
}
```

### Deduct Credits

**Endpoint:** `POST /credits/deduct`

**Purpose:** Manually deduct credits from a user's wallet

**Authentication:** JWT token (Admin role)

**Request Body:**

```json
{
  "user_id": "string", // Target user ID
  "amount": "number", // Amount to deduct
  "reason": "string" // Reason for deduction
}
```

**Response:**

```json
{
  "wallet_id": "string",
  "previous_balance": "number",
  "deducted_amount": "number",
  "current_balance": "number",
  "transaction_id": "string"
}
```

## Internal API Endpoints

These endpoints are for internal service-to-service communication:

### Check Credits

**Endpoint:** `GET /internal/credits/check`

**Purpose:** Check if a user has sufficient credits for an API call

**Authentication:** Service authentication

**Request Parameters:**

- `api_key`: API key from the request
- `endpoint_id`: Target endpoint ID

**Response:**

```json
{
  "has_sufficient_credits": "boolean",
  "current_balance": "number",
  "cost": "number" // Cost of the API call
}
```

### Log Usage

**Endpoint:** `POST /internal/credits/log-usage`

**Purpose:** Log API usage and deduct credits

**Authentication:** Service authentication

**Request Body:**

```json
{
  "api_key": "string", // API key from the request
  "endpoint_id": "string", // Endpoint that was called
  "amount": "number", // Amount to deduct (default: 1)
  "metadata": {
    // Optional metadata about the call
    "status_code": "number",
    "response_time": "number"
  }
}
```

**Response:**

```json
{
  "transaction_id": "string",
  "previous_balance": "number",
  "current_balance": "number",
  "status": "string"
}
```

## Implementation Notes

- The service must verify JWT tokens using the JWKS URL from the AuthService
- For internal endpoints, implement secure service-to-service authentication
- Credit transactions should be atomic to prevent race conditions
- Implement proper logging for all credit operations
- Consider implementing credit expiration functionality
- Default credit allocation should be configurable
- API endpoint costs should be configurable per API
