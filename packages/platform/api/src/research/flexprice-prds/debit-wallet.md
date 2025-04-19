# Technical Requirements Document (TRD): Enhanced Wallet Debit Mechanism

## 1. Overview

This document details the enhancements required for our wallet system's debit logic. The new design will extend the existing wallet transaction entity to support tracking available amounts and expiry dates for credit transactions, enabling efficient debit operations that respect credit expiry rules.

## 2. Business Requirements

### Accurate Debit Accounting

- When a wallet is credited, the transaction is recorded with `credits_available` equal to the credit amount
- An optional expiry date can be provided at credit time (via the `WalletOperation` DTO)
- Credits are only valid until their expiry date (if specified)

### Priority-Based Debit Consumption

1. For any debit request, the system must ensure sufficient wallet balance exists
2. Debit operations should consume credit transactions in the following order:
   - **Expiry Validity**: Only use unexpired credit transactions
   - **Expiry Order**: Consume credits expiring soonest first
   - **Available Balance**: Within transactions meeting expiry criteria, use those with available balance
3. The debit algorithm should split debit amounts across multiple credit transactions as needed
   - Example: A $100 debit may consume $50 from a credit nearing expiry and $50 from another credit

### Handling Expiry-Triggered Debits

When a credit transaction reaches its expiry with remaining available amount, the system should generate a corresponding debit transaction to "expire" the remaining credit.

### Scalability & Concurrency Requirements

- Support high transaction throughput (target: 20K debits per minute)
- Implement proper concurrency controls to avoid race conditions
- Handle multiple concurrent debits attempting to consume the same credit entry

## 3. Current System Context

### Wallet & Transaction Model

The system uses Ent for database operations with the following key entities:
- `Wallet` entity (`wallet.go`) - Maintains overall balance and credit balance
- `WalletTransaction` entity (`transaction.go`) - Records credit/debit transactions

### Repository Operations

The wallet repository (`repository.go`) provides:
- `CreditWallet` and `DebitWallet` methods using `WalletOperation` struct
- Transaction management with proper isolation

### New Fields for WalletTransaction

```go
type WalletTransaction struct {
    // ... existing fields ...
    CreditsAvailable decimal.Decimal `json:"credits_available"`
    ExpiryDate      int            `json:"expiry_date"` // YYYYMMDD format
}
```

## 4. Core Implementation Details

### Enhanced WalletOperation

```go
type WalletOperation struct {
    // ... existing fields ...
    ExpiryDate      *int            `json:"expiry_date,omitempty"` // YYYYMMDD format
}
```

### Service Layer Implementation

```go
type WalletService struct {
    repo    Repository
    logger  *logger.Logger
}

// ProcessDebit handles the debit request with proper credit selection
func (s *WalletService) ProcessDebit(ctx context.Context, req *WalletOperation) error {
    if req.Type != types.TransactionTypeDebit {
        return fmt.Errorf("invalid transaction type")
    }

    return s.repo.WithTx(ctx, func(tx *ent.Tx) error {
        // 1. Get valid credits with optimized query
        credits, err := tx.WalletTransaction.Query().
            Where(
                wallettransaction.WalletID(req.WalletID),
                wallettransaction.Type(string(types.TransactionTypeCredit)),
                wallettransaction.CreditsAvailableGT(0),
                wallettransaction.Or(
                    wallettransaction.ExpiryDateIsNil(),
                    wallettransaction.ExpiryDateGTE(time.Now().Format("20060102")),
                ),
            ).
            Order(ent.Asc(wallettransaction.FieldExpiryDate)).
            Limit(100). // Fetch in batches to avoid loading too many records
            All(ctx)

        if err != nil {
            return fmt.Errorf("query valid credits: %w", err)
        }

        // 2. Calculate total available balance
        var totalAvailable decimal.Decimal
        for _, c := range credits {
            totalAvailable = totalAvailable.Add(c.CreditsAvailable)
            if totalAvailable.GreaterThanOrEqual(req.Amount) {
                break
            }
        }

        if totalAvailable.LessThan(req.Amount) {
            return ErrInsufficientBalance
        }

        // 3. Process debit across credits
        remainingAmount := req.Amount
        for _, credit := range credits {
            if remainingAmount.IsZero() {
                break
            }

            toConsume := decimal.Min(remainingAmount, credit.CreditsAvailable)
            newAvailable := credit.CreditsAvailable.Sub(toConsume)

            // Update credit's available amount
            err := tx.WalletTransaction.UpdateOne(credit).
                SetCreditsAvailable(newAvailable).
                Exec(ctx)

            if err != nil {
                return fmt.Errorf("update credit available amount: %w", err)
            }

            remainingAmount = remainingAmount.Sub(toConsume)
        }

        // 4. Create debit transaction
        _, err = tx.WalletTransaction.Create().
            SetID(types.GenerateUUIDWithPrefix("wtx")).
            SetWalletID(req.WalletID).
            SetType(string(types.TransactionTypeDebit)).
            SetAmount(req.Amount).
            SetCreditsAvailable(decimal.Zero).
            SetStatus(string(types.StatusPublished)).
            SetTransactionStatus(string(types.TransactionStatusCompleted)).
            Exec(ctx)

        return err
    })
}

// ExpireCredits handles expiration of credits
func (s *WalletService) ExpireCredits(ctx context.Context) error {
    currentDate := time.Now().Format("20060102")
    
    // Find expired credits with available balance
    expiredCredits, err := s.repo.Client().WalletTransaction.Query().
        Where(
            wallettransaction.Type(string(types.TransactionTypeCredit)),
            wallettransaction.CreditsAvailableGT(0),
            wallettransaction.ExpiryDateLT(currentDate),
        ).
        All(ctx)

    if err != nil {
        return fmt.Errorf("query expired credits: %w", err)
    }

    for _, credit := range expiredCredits {
        // Process each expiry in its own transaction
        err := s.ProcessDebit(ctx, &WalletOperation{
            WalletID:          credit.WalletID,
            Type:             types.TransactionTypeDebit,
            Amount:           credit.CreditsAvailable,
            TransactionReason: types.TransactionReasonExpiry,
            Description:      fmt.Sprintf("Credit expiry: %s", credit.ID),
        })

        if err != nil {
            s.logger.Error("process credit expiry",
                "credit_id", credit.ID,
                "error", err)
        }
    }

    return nil
}
```

## 5. Scalability Improvements

### Optimized Credit Selection
- Use indexed queries on `wallet_id`, `credits_available`, and `expiry_date`
- Fetch credits in batches with LIMIT clause
- Early exit when sufficient balance is found
- Use database-level sorting for expiry order

### Transaction Management
- Use Ent's transaction support for atomic operations
- Proper isolation level (Serializable) for consistency
- Optimistic locking for concurrent modifications

### Database Optimization
- Indexes on frequently queried fields:
  ```sql
  CREATE INDEX idx_wallet_txn_available ON wallet_transactions (
      wallet_id,
      type,
      credits_available,
      expiry_date
  ) WHERE type = 'credit' AND credits_available > 0;
  ```

## 6. Performance Targets

### Latency Goals
- P95 debit processing time: < 100ms
- P99 debit processing time: < 250ms

### Throughput
Target: 20K debits per minute, achieved through:
- Efficient credit selection with early exit
- Batch processing for credit fetching
- Proper database indexing

## 7. Monitoring & Observability

### Key Metrics
- Debit processing latency
- Transaction success/failure rates
- Lock contention rates
- Credit expiry processing stats

### Alerts
- Processing time exceeding thresholds
- High transaction failure rates
- Expiry processing delays

## 8. Conclusion

The implementation leverages existing codebase structures while adding:
- Efficient credit tracking with `credits_available`
- Optimized credit selection with batched queries
- Proper transaction isolation using Ent
- Clear separation of debit and expiry processing

These improvements provide a solid foundation for handling high-volume debit operations while maintaining data consistency.