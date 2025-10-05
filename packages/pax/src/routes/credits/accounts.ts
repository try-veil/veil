import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middleware/auth';
import { creditAccountService } from '../../services/credit-account-service';

export const creditAccountRoutes = new Elysia({ prefix: '/api/v1/credits' })
  .use(authMiddleware)
  .get('/account', async ({ user }) => {
    const account = await creditAccountService.getOrCreateAccount(user.id);
    return {
      success: true,
      data: account,
    };
  }, {
    detail: {
      tags: ['Credits'],
      summary: 'Get credit account details',
      description: 'Get the authenticated user\'s credit account information',
    },
  })
  .get('/balance', async ({ user }) => {
    const balance = await creditAccountService.getBalance(user.id);
    return {
      success: true,
      data: balance,
    };
  }, {
    detail: {
      tags: ['Credits'],
      summary: 'Get credit balance',
      description: 'Get the authenticated user\'s current credit balance',
    },
  })
  .put('/account/settings', async ({ user, body }) => {
    const updated = await creditAccountService.updateSettings(user.id, body);
    return {
      success: true,
      data: updated,
    };
  }, {
    body: t.Object({
      lowBalanceThreshold: t.Optional(t.Number()),
      autoRechargeEnabled: t.Optional(t.Boolean()),
      autoRechargeAmount: t.Optional(t.Number()),
      autoRechargeThreshold: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['Credits'],
      summary: 'Update account settings',
      description: 'Update credit account settings like low balance threshold and auto-recharge',
    },
  })
  .get('/account/stats', async ({ user }) => {
    const account = await creditAccountService.getAccount(user.id);
    if (!account) {
      throw new Error('Account not found');
    }

    return {
      success: true,
      data: {
        totalCredits: parseFloat(account.totalCredits),
        totalSpent: parseFloat(account.totalSpent),
        balance: parseFloat(account.balance),
        reservedBalance: parseFloat(account.reservedBalance),
        currency: account.currency,
        lastTransactionAt: account.lastTransactionAt,
        createdAt: account.createdAt,
      },
    };
  }, {
    detail: {
      tags: ['Credits'],
      summary: 'Get account statistics',
      description: 'Get lifetime statistics for the credit account',
    },
  });
