import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middleware/auth';
import { creditTransactionService } from '../../services/credit-transaction-service';
import { creditAccountService } from '../../services/credit-account-service';

export const creditTransactionRoutes = new Elysia({ prefix: '/api/v1/credits' })
  .use(authMiddleware)
  .get('/transactions', async ({ user, query }) => {
    const filters: any = {};

    if (query.type) filters.type = query.type;
    if (query.referenceType) filters.referenceType = query.referenceType;
    if (query.fromDate) filters.fromDate = new Date(query.fromDate);
    if (query.toDate) filters.toDate = new Date(query.toDate);
    if (query.limit) filters.limit = parseInt(query.limit);
    if (query.offset) filters.offset = parseInt(query.offset);

    const transactions = await creditTransactionService.getTransactions(user.id, filters);

    return {
      success: true,
      data: transactions,
    };
  }, {
    query: t.Object({
      type: t.Optional(t.String()),
      referenceType: t.Optional(t.String()),
      fromDate: t.Optional(t.String()),
      toDate: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Credits'],
      summary: 'List credit transactions',
      description: 'Get transaction history with optional filters',
    },
  })
  .get('/transactions/:uid', async ({ params, user }) => {
    const transaction = await creditTransactionService.getTransaction(params.uid);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Verify ownership through account
    const account = await creditAccountService.getAccount(user.id);
    if (!account || transaction.creditAccountId !== account.id) {
      throw new Error('Unauthorized');
    }

    return {
      success: true,
      data: transaction,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Credits'],
      summary: 'Get transaction details',
      description: 'Get details of a specific credit transaction',
    },
  })
  .get('/transactions/summary', async ({ user, query }) => {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (query.fromDate) fromDate = new Date(query.fromDate);
    if (query.toDate) toDate = new Date(query.toDate);

    const summary = await creditTransactionService.getSummary(user.id, fromDate, toDate);

    return {
      success: true,
      data: summary,
    };
  }, {
    query: t.Object({
      fromDate: t.Optional(t.String()),
      toDate: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Credits'],
      summary: 'Get transaction summary',
      description: 'Get aggregated transaction statistics',
    },
  });
