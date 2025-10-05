import { Elysia, t } from 'elysia';
import { walletService } from '../services/wallet-service';
import { ledgerService } from '../services/ledger-service';

export const walletRoutes = new Elysia({ prefix: '/wallet' })
  // Get wallet balance
  .get('/balance', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1; // Placeholder

      const wallet = await walletService.getWalletByUserId(userId);

      if (!wallet) {
        // Auto-create wallet if it doesn't exist
        await walletService.createWallet({ userId });
        const newWallet = await walletService.getWalletByUserId(userId);

        return {
          success: true,
          data: newWallet,
          meta: {
            timestamp: new Date().toISOString(),
          }
        };
      }

      return {
        success: true,
        data: wallet,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch wallet balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get wallet statistics
  .get('/statistics', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1; // Placeholder

      const fromDate = query.from_date ? new Date(query.from_date) : undefined;
      const toDate = query.to_date ? new Date(query.to_date) : undefined;

      const stats = await walletService.getWalletStatistics(userId, fromDate, toDate);

      if (!stats) {
        set.status = 404;
        return {
          success: false,
          message: 'Wallet not found'
        };
      }

      return {
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch wallet statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    query: t.Object({
      from_date: t.Optional(t.String()),
      to_date: t.Optional(t.String()),
    })
  })

  // Get transaction history
  .get('/transactions', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1; // Placeholder

      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '50');
      const fromDate = query.from_date ? new Date(query.from_date) : undefined;
      const toDate = query.to_date ? new Date(query.to_date) : undefined;
      const type = query.type;

      const history = await walletService.getTransactionHistory(
        userId,
        page,
        limit,
        fromDate,
        toDate,
        type
      );

      return {
        success: true,
        data: history.transactions,
        pagination: history.pagination,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch transaction history',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      from_date: t.Optional(t.String()),
      to_date: t.Optional(t.String()),
      type: t.Optional(t.Union([
        t.Literal('credit'),
        t.Literal('debit'),
        t.Literal('refund'),
        t.Literal('adjustment')
      ])),
    })
  })

  // Add credits (admin or via payment)
  .post('/credits/add', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1; // Placeholder
      const createdBy = userId; // In admin route, this would be admin's ID

      const result = await walletService.addCredits({
        userId: body.user_id || userId,
        amount: body.amount.toString(),
        description: body.description,
        referenceType: body.reference_type,
        referenceId: body.reference_id,
        createdBy,
        metadata: body.metadata,
      });

      return {
        success: true,
        message: 'Credits added successfully',
        data: {
          transaction: result.transaction,
          newBalance: result.newBalance,
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Wallet not found')) {
          set.status = 404;
          return {
            success: false,
            message: 'Wallet not found'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to add credits',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      user_id: t.Optional(t.Number()),
      amount: t.Number({ minimum: 0.01, maximum: 1000000 }),
      description: t.String({ minLength: 1, maxLength: 500 }),
      reference_type: t.Optional(t.String()),
      reference_id: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    })
  })

  // Deduct credits
  .post('/credits/deduct', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1; // Placeholder

      const result = await walletService.deductCredits({
        userId: body.user_id || userId,
        amount: body.amount.toString(),
        description: body.description,
        referenceType: body.reference_type,
        referenceId: body.reference_id,
        createdBy: userId,
        metadata: body.metadata,
      });

      return {
        success: true,
        message: 'Credits deducted successfully',
        data: {
          transaction: result.transaction,
          newBalance: result.newBalance,
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Wallet not found')) {
          set.status = 404;
          return {
            success: false,
            message: 'Wallet not found'
          };
        }

        if (error.message.includes('Insufficient balance')) {
          set.status = 400;
          return {
            success: false,
            message: error.message
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to deduct credits',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      user_id: t.Optional(t.Number()),
      amount: t.Number({ minimum: 0.01, maximum: 1000000 }),
      description: t.String({ minLength: 1, maxLength: 500 }),
      reference_type: t.Optional(t.String()),
      reference_id: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    })
  })

  // Lock credits
  .post('/credits/lock', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1; // Placeholder

      const result = await walletService.lockCredits(
        body.user_id || userId,
        body.amount.toString(),
        body.description
      );

      return {
        success: true,
        message: 'Credits locked successfully',
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Insufficient balance')) {
          set.status = 400;
          return {
            success: false,
            message: error.message
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to lock credits',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      user_id: t.Optional(t.Number()),
      amount: t.Number({ minimum: 0.01 }),
      description: t.String({ minLength: 1 }),
    })
  })

  // Unlock credits
  .post('/credits/unlock', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1; // Placeholder

      const result = await walletService.unlockCredits(
        body.user_id || userId,
        body.amount.toString()
      );

      return {
        success: true,
        message: 'Credits unlocked successfully',
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Cannot unlock more than locked amount')) {
          set.status = 400;
          return {
            success: false,
            message: error.message
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to unlock credits',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      user_id: t.Optional(t.Number()),
      amount: t.Number({ minimum: 0.01 }),
    })
  })

  // Purchase credits with payment
  .post('/credits/purchase', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1; // Placeholder

      // This would integrate with payment service to create a payment intent
      // for credit purchase, which would then add credits to wallet on success

      return {
        success: true,
        message: 'Credit purchase initiated',
        data: {
          paymentRequired: true,
          amount: body.amount,
          currency: body.currency || 'INR',
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to initiate credit purchase',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      amount: t.Number({ minimum: 1, maximum: 1000000 }),
      currency: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
      payment_method: t.Object({
        provider: t.Union([
          t.Literal('razorpay'),
          t.Literal('stripe'),
          t.Literal('paypal'),
        ]),
        type: t.String(),
      }),
    })
  });

// Admin routes for ledger management
export const ledgerRoutes = new Elysia({ prefix: '/ledger' })
  // Get trial balance
  .get('/trial-balance', async ({ query, set }) => {
    try {
      const asOfDate = query.as_of_date ? new Date(query.as_of_date) : new Date();
      const trialBalance = await ledgerService.getTrialBalance(asOfDate);

      return {
        success: true,
        data: trialBalance,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch trial balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    query: t.Object({
      as_of_date: t.Optional(t.String()),
    })
  })

  // Get account balance
  .get('/accounts/:code/balance', async ({ params, query, set }) => {
    try {
      const account = await ledgerService.getAccountByCode(params.code);
      if (!account) {
        set.status = 404;
        return {
          success: false,
          message: 'Account not found'
        };
      }

      const asOfDate = query.as_of_date ? new Date(query.as_of_date) : undefined;
      const balance = await ledgerService.getAccountBalance(account.id, asOfDate);

      return {
        success: true,
        data: balance,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch account balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    query: t.Object({
      as_of_date: t.Optional(t.String()),
    })
  })

  // Get account ledger
  .get('/accounts/:code/ledger', async ({ params, query, set }) => {
    try {
      const account = await ledgerService.getAccountByCode(params.code);
      if (!account) {
        set.status = 404;
        return {
          success: false,
          message: 'Account not found'
        };
      }

      const fromDate = query.from_date ? new Date(query.from_date) : undefined;
      const toDate = query.to_date ? new Date(query.to_date) : undefined;
      const limit = query.limit ? parseInt(query.limit) : 100;

      const ledger = await ledgerService.getAccountLedger(
        account.id,
        fromDate,
        toDate,
        limit
      );

      return {
        success: true,
        data: ledger,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch account ledger',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    query: t.Object({
      from_date: t.Optional(t.String()),
      to_date: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    })
  })

  // Get all accounts
  .get('/accounts', async ({ query, set }) => {
    try {
      const accounts = await ledgerService.getAllAccounts(query.type);

      return {
        success: true,
        data: accounts,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch accounts',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    query: t.Object({
      type: t.Optional(t.Union([
        t.Literal('asset'),
        t.Literal('liability'),
        t.Literal('equity'),
        t.Literal('revenue'),
        t.Literal('expense'),
      ])),
    })
  })

  // Initialize system accounts (admin only, one-time setup)
  .post('/initialize-accounts', async ({ set }) => {
    try {
      const accounts = await ledgerService.initializeSystemAccounts();

      return {
        success: true,
        message: 'System accounts initialized',
        data: {
          accountsCreated: accounts.length,
          accounts,
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to initialize system accounts',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
