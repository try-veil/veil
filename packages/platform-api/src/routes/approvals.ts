import { Elysia, t } from 'elysia';
import { ApprovalService } from '../services/approval-service';
import {
  approvalRequestSchema,
  approvalQuerySchema,
  approvalParamsSchema,
  commentSchema,
  type ApprovalRequestData,
  type ApprovalQuery,
  type ApprovalParams,
  type CommentRequest
} from '../validation/approval-validation';

const approvalService = new ApprovalService();

export const approvalRoutes = new Elysia({ prefix: '/approvals' })
  // Submit new approval request
  .post('/', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedData = approvalRequestSchema.parse(body);
      
      const approval = await approvalService.createApprovalRequest(userId, {
        type: validatedData.type,
        entityId: validatedData.entityId,
        entityType: validatedData.entityType,
        priority: validatedData.priority,
        data: validatedData.data,
        reason: validatedData.reason,
        attachments: validatedData.attachments,
        expectedResolution: validatedData.expectedResolution ? new Date(validatedData.expectedResolution) : undefined,
        tags: validatedData.tags
      });

      set.status = 201;
      return {
        success: true,
        message: 'Approval request submitted successfully',
        data: approval,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already a pending approval')) {
          set.status = 409;
          return {
            success: false,
            message: 'There is already a pending approval request for this entity'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to submit approval request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      type: t.Union([
        t.Literal('api_submission'),
        t.Literal('provider_registration'),
        t.Literal('api_update'),
        t.Literal('subscription_upgrade'),
        t.Literal('refund_request'),
        t.Literal('account_deletion'),
        t.Literal('dispute_resolution'),
        t.Literal('content_moderation')
      ]),
      entityId: t.String({ minLength: 1 }),
      entityType: t.Union([
        t.Literal('api'),
        t.Literal('user'),
        t.Literal('subscription'),
        t.Literal('payment'),
        t.Literal('content')
      ]),
      priority: t.Optional(t.Union([
        t.Literal('low'),
        t.Literal('medium'),
        t.Literal('high'),
        t.Literal('urgent')
      ])),
      data: t.Optional(t.Record(t.String(), t.Any())),
      reason: t.String({ minLength: 1, maxLength: 1000 }),
      attachments: t.Optional(t.Array(t.String())),
      expectedResolution: t.Optional(t.String({ format: 'date-time' })),
      tags: t.Optional(t.Array(t.String()))
    })
  })

  // Get user's approval requests
  .get('/', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedQuery = approvalQuerySchema.parse(query);
      
      const filters = {
        status: validatedQuery.status !== 'all' ? validatedQuery.status : undefined,
        type: validatedQuery.type !== 'all' ? validatedQuery.type : undefined,
        priority: validatedQuery.priority !== 'all' ? validatedQuery.priority : undefined,
        requestedBy: userId, // Only show user's own requests
        fromDate: validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined,
        toDate: validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined,
        tags: validatedQuery.tags,
        search: validatedQuery.search,
      };

      const result = await approvalService.getApprovals(
        filters,
        validatedQuery.page,
        validatedQuery.limit
      );

      return {
        success: true,
        data: {
          approvals: result.approvals,
          pagination: result.pagination
        },
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch approval requests',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get specific approval request
  .get('/:uid', async ({ params, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = approvalParamsSchema.parse(params);
      const approval = await approvalService.getApproval(uid, userId);

      return {
        success: true,
        data: approval,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Approval request not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Approval request not found'
          };
        }

        if (error.message.includes('permission')) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only access your own approval requests'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch approval request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Cancel approval request
  .post('/:uid/cancel', async ({ params, body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = approvalParamsSchema.parse(params);
      const { reason } = body as { reason: string };
      
      if (!reason || reason.trim().length === 0) {
        set.status = 400;
        return {
          success: false,
          message: 'Cancellation reason is required'
        };
      }

      const approval = await approvalService.cancelApprovalRequest(uid, userId, reason);

      return {
        success: true,
        message: 'Approval request cancelled successfully',
        data: approval,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Approval request not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Approval request not found'
          };
        }

        if (error.message.includes('only cancel your own')) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only cancel your own approval requests'
          };
        }

        if (error.message.includes('Cannot cancel non-pending')) {
          set.status = 400;
          return {
            success: false,
            message: 'Cannot cancel non-pending approval request'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to cancel approval request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      reason: t.String({ minLength: 1, maxLength: 500 })
    })
  })

  // Add comment to approval request
  .post('/:uid/comments', async ({ params, body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = approvalParamsSchema.parse(params);
      const validatedData = commentSchema.parse(body);
      
      const comment = await approvalService.addComment(
        uid,
        userId,
        validatedData.content,
        false, // Users can't add internal comments
        validatedData.attachments,
        validatedData.mentionedUsers
      );

      return {
        success: true,
        message: 'Comment added successfully',
        data: comment,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Approval request not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Approval request not found'
          };
        }

        if (error.message.includes('permission')) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You do not have permission to comment on this approval'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to add comment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      content: t.String({ minLength: 1, maxLength: 2000 }),
      attachments: t.Optional(t.Array(t.String())),
      mentionedUsers: t.Optional(t.Array(t.Integer({ minimum: 1 })))
    })
  })

  // Get comments for approval request
  .get('/:uid/comments', async ({ params, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = approvalParamsSchema.parse(params);
      
      const comments = await approvalService.getComments(uid, userId, false); // No internal comments for users

      return {
        success: true,
        data: comments,
        meta: {
          timestamp: new Date().toISOString(),
          count: comments.length,
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Approval request not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Approval request not found'
          };
        }

        if (error.message.includes('permission')) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You do not have permission to view comments'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch comments',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get approval request status
  .get('/:uid/status', async ({ params, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = approvalParamsSchema.parse(params);
      const approval = await approvalService.getApproval(uid, userId);

      const statusInfo = {
        uid: approval.uid,
        status: approval.status,
        priority: approval.priority,
        type: approval.type,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
        expectedResolution: approval.expectedResolution,
        processedAt: approval.processedAt,
        assignedTo: approval.assignee ? {
          name: `${approval.assignee.firstName} ${approval.assignee.lastName}`,
          email: approval.assignee.email
        } : null,
        canCancel: approval.status === 'pending',
        canComment: ['pending', 'escalated'].includes(approval.status),
        statusDescription: this.getStatusDescription(approval.status),
        nextSteps: this.getNextSteps(approval.status, approval.type)
      };

      return {
        success: true,
        data: statusInfo,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Approval request not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Approval request not found'
          };
        }

        if (error.message.includes('permission')) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only check status of your own approval requests'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch approval status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get approval templates/types available for submission
  .get('/templates', async ({ set }) => {
    try {
      // Mock approval templates - in real implementation, this would come from database
      const templates = [
        {
          type: 'api_submission',
          name: 'API Submission',
          description: 'Submit a new API for review and approval',
          requiredFields: ['entityId', 'reason'],
          optionalFields: ['data.documentation', 'data.testEndpoints', 'attachments'],
          estimatedTimeHours: 48,
          approvalSteps: ['Technical Review', 'Security Assessment', 'Final Approval'],
          priority: 'medium'
        },
        {
          type: 'provider_registration',
          name: 'Provider Registration',
          description: 'Register as an API provider on the marketplace',
          requiredFields: ['entityId', 'reason', 'data.companyInfo'],
          optionalFields: ['data.businessDocuments', 'attachments'],
          estimatedTimeHours: 72,
          approvalSteps: ['Identity Verification', 'Business Validation', 'Account Approval'],
          priority: 'medium'
        },
        {
          type: 'refund_request',
          name: 'Refund Request',
          description: 'Request a refund for a payment or subscription',
          requiredFields: ['entityId', 'reason'],
          optionalFields: ['data.refundAmount', 'attachments'],
          estimatedTimeHours: 24,
          approvalSteps: ['Eligibility Check', 'Manager Approval'],
          priority: 'high'
        },
        {
          type: 'account_deletion',
          name: 'Account Deletion',
          description: 'Request permanent deletion of your account',
          requiredFields: ['entityId', 'reason'],
          optionalFields: ['data.dataExport'],
          estimatedTimeHours: 48,
          approvalSteps: ['Data Export', 'Final Confirmation'],
          priority: 'medium'
        },
        {
          type: 'dispute_resolution',
          name: 'Dispute Resolution',
          description: 'File a dispute for payment, service, or policy issues',
          requiredFields: ['entityId', 'reason', 'data.disputeDetails'],
          optionalFields: ['attachments', 'data.evidenceDocuments'],
          estimatedTimeHours: 96,
          approvalSteps: ['Initial Review', 'Investigation', 'Resolution'],
          priority: 'high'
        }
      ];

      return {
        success: true,
        data: templates,
        meta: {
          timestamp: new Date().toISOString(),
          count: templates.length,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch approval templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Helper method to get status description
  .derive(() => ({
    getStatusDescription: (status: string): string => {
      const descriptions: Record<string, string> = {
        'pending': 'Your request is being reviewed by our team',
        'approved': 'Your request has been approved and processed',
        'rejected': 'Your request has been rejected. Please check comments for details',
        'escalated': 'Your request has been escalated to a senior administrator',
        'expired': 'Your request has expired due to no response'
      };
      return descriptions[status] || 'Unknown status';
    },

    getNextSteps: (status: string, type: string): string[] => {
      const nextSteps: Record<string, string[]> = {
        'pending': [
          'Your request is in the review queue',
          'You will be notified of any updates',
          'You can add comments or additional information if needed'
        ],
        'approved': [
          'Your request has been processed',
          'Check your email for confirmation details',
          'You can now proceed with the approved action'
        ],
        'rejected': [
          'Review the rejection comments',
          'Address the concerns mentioned',
          'You may submit a new request if appropriate'
        ],
        'escalated': [
          'Your request is being reviewed by senior staff',
          'This may take longer than the standard timeframe',
          'You will be contacted if additional information is needed'
        ],
        'expired': [
          'This request has expired',
          'You can submit a new request if still needed'
        ]
      };
      return nextSteps[status] || [];
    }
  }));

// Export is already done above at line 16