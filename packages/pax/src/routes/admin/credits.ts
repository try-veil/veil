import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middleware/auth';
import { creditAccountService } from '../../services/credit-account-service';
import { creditTransactionService } from '../../services/credit-transaction-service';

// Admin routes for credit management
// TODO: Add admin authorization middleware
export const adminCreditRoutes = new Elysia({ prefix: '/api/v1/admin/credits' })
  .use(authMiddleware)
  .post('/adjust', async ({ body, user }) => {
    // TODO: Verify admin permissions
    const transaction = await creditTransactionService.adjustCredits(
      body.userId,
      body.amount,
      body.reason,
      user.id
    );

    return {
      success: true,
      data: transaction,
    };
  }, {
    body: t.Object({
      userId: t.Number(),
      amount: t.Number(),
      reason: t.String(),
    }),
    detail: {
      tags: ['Admin - Credits'],
      summary: 'Adjust user credits',
      description: 'Manually adjust a user\'s credit balance (admin only)',
    },
  })
  .get('/accounts', async ({ query }) => {
    // TODO: Implement account listing with pagination
    // For now, return empty array
    return {
      success: true,
      data: [],
      message: 'Not implemented yet',
    };
  }, {
    query: t.Object({
      search: t.Optional(t.String()),
      status: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Admin - Credits'],
      summary: 'List credit accounts',
      description: 'List all credit accounts with filters (admin only)',
    },
  })
  .get('/accounts/:userId', async ({ params }) => {
    const account = await creditAccountService.getAccount(params.userId);

    if (!account) {
      throw new Error('Account not found');
    }

    return {
      success: true,
      data: account,
    };
  }, {
    params: t.Object({
      userId: t.Number(),
    }),
    detail: {
      tags: ['Admin - Credits'],
      summary: 'Get user credit account',
      description: 'Get credit account details for a specific user (admin only)',
    },
  })
  .post('/suspend', async ({ body }) => {
    const account = await creditAccountService.suspendAccount(body.userId, body.reason);

    return {
      success: true,
      data: account,
    };
  }, {
    body: t.Object({
      userId: t.Number(),
      reason: t.String(),
    }),
    detail: {
      tags: ['Admin - Credits'],
      summary: 'Suspend credit account',
      description: 'Suspend a user\'s credit account (admin only)',
    },
  })
  .post('/unsuspend', async ({ body }) => {
    const account = await creditAccountService.unsuspendAccount(body.userId);

    return {
      success: true,
      data: account,
    };
  }, {
    body: t.Object({
      userId: t.Number(),
    }),
    detail: {
      tags: ['Admin - Credits'],
      summary: 'Unsuspend credit account',
      description: 'Unsuspend a user\'s credit account (admin only)',
    },
  });
