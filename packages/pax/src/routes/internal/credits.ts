import { Elysia, t } from 'elysia';
import { creditReservationService } from '../../services/credit-reservation-service';

// Internal routes for service-to-service communication
// TODO: Add internal auth middleware for service-to-service calls
export const internalCreditRoutes = new Elysia({ prefix: '/internal/v1/credits' })
  .post('/reserve', async ({ body }) => {
    const reservation = await creditReservationService.reserveCredits(
      body.userId,
      body.amount,
      body.purpose,
      body.referenceType,
      body.referenceId,
      body.expiresInMinutes
    );

    return {
      success: true,
      data: {
        reservationUid: reservation.uid,
        amount: parseFloat(reservation.amount),
        expiresAt: reservation.expiresAt,
      },
    };
  }, {
    body: t.Object({
      userId: t.Number(),
      amount: t.Number({ minimum: 0 }),
      purpose: t.String(),
      referenceType: t.String(),
      referenceId: t.String(),
      expiresInMinutes: t.Optional(t.Number({ minimum: 1, maximum: 60 })),
    }),
    detail: {
      tags: ['Internal - Credits'],
      summary: 'Reserve credits',
      description: 'Reserve credits for an operation (internal use)',
    },
  })
  .post('/settle/:reservationUid', async ({ params, body }) => {
    const result = await creditReservationService.settleReservation(
      params.reservationUid,
      body.actualAmount
    );

    return {
      success: true,
      data: {
        settled: true,
        actualAmount: body.actualAmount,
        debitTransaction: result.debitTransaction?.uid,
        releaseTransaction: result.releaseTransaction?.uid,
      },
    };
  }, {
    params: t.Object({
      reservationUid: t.String(),
    }),
    body: t.Object({
      actualAmount: t.Number({ minimum: 0 }),
    }),
    detail: {
      tags: ['Internal - Credits'],
      summary: 'Settle reservation',
      description: 'Settle a credit reservation with actual amount used (internal use)',
    },
  })
  .post('/release/:reservationUid', async ({ params }) => {
    const transaction = await creditReservationService.releaseReservation(params.reservationUid);

    return {
      success: true,
      data: {
        released: true,
        releaseTransaction: transaction.uid,
      },
    };
  }, {
    params: t.Object({
      reservationUid: t.String(),
    }),
    detail: {
      tags: ['Internal - Credits'],
      summary: 'Release reservation',
      description: 'Release a credit reservation (cancel) (internal use)',
    },
  });
