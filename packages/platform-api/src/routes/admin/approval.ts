import { Elysia, t } from 'elysia';
import { ApprovalService } from '../../services/approval-service';
import {
  approvalRequestSchema,
  approvalDecisionSchema,
  bulkApprovalSchema,
  approvalQuerySchema,
  approvalParamsSchema,
  assignmentSchema,
  escalationSchema,
  commentSchema,
  approvalAnalyticsSchema,
  type ApprovalRequestData,
  type ApprovalDecision,
  type BulkApprovalRequest,
  type ApprovalQuery,
  type ApprovalParams,
  type AssignmentRequest,
  type EscalationRequest,
  type CommentRequest,
  type ApprovalAnalyticsQuery
} from '../../validation/approval-validation';

const approvalService = new ApprovalService();

export const adminApprovalRoutes = new Elysia({ prefix: '/admin/approvals' })
  // Get all approval requests with filters
  .get('/', async ({ query, set }) => {
    try {
      // TODO: Verify admin permissions
      
      const validatedQuery = approvalQuerySchema.parse(query);
      
      const filters = {
        status: validatedQuery.status !== 'all' ? validatedQuery.status : undefined,
        type: validatedQuery.type !== 'all' ? validatedQuery.type : undefined,
        priority: validatedQuery.priority !== 'all' ? validatedQuery.priority : undefined,
        assignedTo: validatedQuery.assignedTo,
        requestedBy: validatedQuery.requestedBy,
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

      // Apply sorting if specified
      if (validatedQuery.sort_by && validatedQuery.sort_by !== 'created_at') {
        result.approvals.sort((a, b) => {
          let compareA, compareB;
          
          switch (validatedQuery.sort_by) {
            case 'updated_at':
              compareA = new Date(a.updatedAt).getTime();
              compareB = new Date(b.updatedAt).getTime();
              break;
            case 'priority':
              const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
              compareA = priorityOrder[a.priority as keyof typeof priorityOrder];
              compareB = priorityOrder[b.priority as keyof typeof priorityOrder];
              break;
            case 'type':
              compareA = a.type;
              compareB = b.type;
              break;
            case 'status':
              compareA = a.status;
              compareB = b.status;
              break;
            default:
              compareA = new Date(a.createdAt).getTime();
              compareB = new Date(b.createdAt).getTime();
          }

          if (validatedQuery.sort_order === 'desc') {
            return compareA > compareB ? -1 : compareA < compareB ? 1 : 0;
          } else {
            return compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
          }
        });
      }

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

  // Get pending approvals for current admin
  .get('/pending', async ({ set }) => {
    try {
      // TODO: Get adminId from JWT token - for now using placeholder
      const adminId = 2; // This should come from authenticated admin context
      
      const pendingApprovals = await approvalService.getUserPendingApprovals(adminId);

      return {
        success: true,
        data: pendingApprovals,
        meta: {
          timestamp: new Date().toISOString(),
          count: pendingApprovals.length,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch pending approvals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get overdue approvals
  .get('/overdue', async ({ set }) => {
    try {
      const overdueApprovals = await approvalService.getOverdueApprovals();

      return {
        success: true,
        data: overdueApprovals,
        meta: {
          timestamp: new Date().toISOString(),
          count: overdueApprovals.length,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch overdue approvals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get approval statistics
  .get('/stats', async ({ query, set }) => {
    try {
      const filters = {
        fromDate: query.from_date ? new Date(query.from_date as string) : undefined,
        toDate: query.to_date ? new Date(query.to_date as string) : undefined,
        assignedTo: query.assigned_to ? parseInt(query.assigned_to as string) : undefined,
        type: query.type as string,
      };

      const stats = await approvalService.getApprovalStats(filters);

      return {
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
          filters,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch approval statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get specific approval request
  .get('/:uid', async ({ params, set }) => {
    try {
      const { uid } = approvalParamsSchema.parse(params);
      const approval = await approvalService.getApproval(uid);

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
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch approval request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Process approval decision
  .post('/:uid/decision', async ({ params, body, set }) => {
    try {
      // TODO: Get adminId from JWT token - for now using placeholder
      const adminId = 2; // This should come from authenticated admin context
      
      const { uid } = approvalParamsSchema.parse(params);
      const validatedData = approvalDecisionSchema.parse(body);
      
      const approval = await approvalService.processDecision(uid, adminId, validatedData);

      return {
        success: true,
        message: 'Approval decision processed successfully',
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

        if (error.message === 'Approval request is not in pending status') {
          set.status = 400;
          return {
            success: false,
            message: 'Approval request is not in pending status'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to process approval decision',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      decision: t.Union([
        t.Literal('approved'),
        t.Literal('rejected'),
        t.Literal('pending_info'),
        t.Literal('escalated')
      ]),
      comments: t.String({ minLength: 1, maxLength: 2000 }),
      conditions: t.Optional(t.Array(t.String())),
      followUpRequired: t.Optional(t.Boolean()),
      followUpDate: t.Optional(t.String({ format: 'date-time' })),
      escalateTo: t.Optional(t.Integer({ minimum: 1 })),
      internalNotes: t.Optional(t.String({ maxLength: 1000 })),
      attachments: t.Optional(t.Array(t.String()))
    })
  })

  // Assign approval to admin
  .post('/:uid/assign', async ({ params, body, set }) => {
    try {
      // TODO: Get adminId from JWT token - for now using placeholder
      const adminId = 2; // This should come from authenticated admin context
      
      const { uid } = approvalParamsSchema.parse(params);
      const validatedData = assignmentSchema.parse(body);
      
      const approval = await approvalService.assignApproval(
        uid,
        validatedData.assigneeId,
        adminId,
        validatedData.reason
      );

      return {
        success: true,
        message: 'Approval assigned successfully',
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

        if (error.message === 'Cannot assign non-pending approval request') {
          set.status = 400;
          return {
            success: false,
            message: 'Cannot assign non-pending approval request'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to assign approval request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      assigneeId: t.Integer({ minimum: 1 }),
      reason: t.Optional(t.String({ maxLength: 500 })),
      dueDate: t.Optional(t.String({ format: 'date-time' }))
    })
  })

  // Escalate approval
  .post('/:uid/escalate', async ({ params, body, set }) => {
    try {
      // TODO: Get adminId from JWT token - for now using placeholder
      const adminId = 2; // This should come from authenticated admin context
      
      const { uid } = approvalParamsSchema.parse(params);
      const validatedData = escalationSchema.parse(body);
      
      const approval = await approvalService.escalateApproval(uid, validatedData, adminId);

      return {
        success: true,
        message: 'Approval escalated successfully',
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

        if (error.message === 'Cannot escalate non-pending approval request') {
          set.status = 400;
          return {
            success: false,
            message: 'Cannot escalate non-pending approval request'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to escalate approval request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      escalateTo: t.Integer({ minimum: 1 }),
      reason: t.String({ minLength: 1, maxLength: 1000 }),
      priority: t.Optional(t.Union([
        t.Literal('medium'),
        t.Literal('high'),
        t.Literal('urgent')
      ])),
      urgency: t.Optional(t.Union([
        t.Literal('normal'),
        t.Literal('high'),
        t.Literal('critical')
      ]))
    })
  })

  // Add comment to approval
  .post('/:uid/comments', async ({ params, body, set }) => {
    try {
      // TODO: Get adminId from JWT token - for now using placeholder
      const adminId = 2; // This should come from authenticated admin context
      
      const { uid } = approvalParamsSchema.parse(params);
      const validatedData = commentSchema.parse(body);
      
      const comment = await approvalService.addComment(
        uid,
        adminId,
        validatedData.content,
        validatedData.isInternal,
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
      isInternal: t.Optional(t.Boolean()),
      attachments: t.Optional(t.Array(t.String())),
      mentionedUsers: t.Optional(t.Array(t.Integer({ minimum: 1 })))
    })
  })

  // Get comments for approval
  .get('/:uid/comments', async ({ params, query, set }) => {
    try {
      // TODO: Get adminId from JWT token - for now using placeholder
      const adminId = 2; // This should come from authenticated admin context
      
      const { uid } = approvalParamsSchema.parse(params);
      const includeInternal = query.include_internal === 'true';
      
      const comments = await approvalService.getComments(uid, adminId, includeInternal);

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

  // Bulk process approvals
  .post('/bulk', async ({ body, set }) => {
    try {
      // TODO: Get adminId from JWT token - for now using placeholder
      const adminId = 2; // This should come from authenticated admin context
      
      const validatedData = bulkApprovalSchema.parse(body);
      
      const result = await approvalService.processBulkApprovals(validatedData, adminId);

      const statusCode = result.failed > 0 ? 207 : 200; // 207 Multi-Status if some failed
      set.status = statusCode;

      return {
        success: result.failed === 0,
        message: `Bulk ${validatedData.decision} operation completed`,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to process bulk approvals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      approvalIds: t.Array(t.String({ format: 'uuid' }), { minItems: 1, maxItems: 100 }),
      decision: t.Union([
        t.Literal('approved'),
        t.Literal('rejected')
      ]),
      comments: t.String({ minLength: 1, maxLength: 1000 }),
      sendNotifications: t.Optional(t.Boolean())
    })
  })

  // Create approval template (admin only)
  .post('/templates', async ({ body, set }) => {
    try {
      // TODO: Implement approval template creation
      // This would allow admins to create reusable approval workflows
      
      return {
        success: true,
        message: 'Approval template creation feature coming soon',
        data: {
          templateId: 'template_' + Date.now(),
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to create approval template',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get approval analytics
  .get('/analytics/overview', async ({ query, set }) => {
    try {
      const validatedQuery = approvalAnalyticsSchema.parse(query);
      
      // Mock analytics data - in real implementation, this would use the analytics service
      const analytics = {
        totalRequests: 1250,
        pendingRequests: 45,
        approvedRequests: 890,
        rejectedRequests: 285,
        escalatedRequests: 30,
        averageResolutionTime: 18.5, // hours
        slaCompliance: 92.3, // percentage
        topRequestTypes: [
          { type: 'api_submission', count: 450, percentage: 36 },
          { type: 'refund_request', count: 320, percentage: 25.6 },
          { type: 'provider_registration', count: 280, percentage: 22.4 },
          { type: 'account_deletion', count: 200, percentage: 16 }
        ],
        resolutionTrends: [
          { date: '2024-01-01', avgHours: 16.2 },
          { date: '2024-01-02', avgHours: 18.7 },
          { date: '2024-01-03', avgHours: 15.9 },
          { date: '2024-01-04', avgHours: 19.3 },
          { date: '2024-01-05', avgHours: 17.8 }
        ],
        workloadDistribution: [
          { assignee: 'Admin User 1', pending: 12, completed: 45, avgTime: 16.5 },
          { assignee: 'Admin User 2', pending: 18, completed: 38, avgTime: 20.2 },
          { assignee: 'Senior Admin', pending: 15, completed: 52, avgTime: 14.8 }
        ]
      };

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch approval analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get SLA performance
  .get('/sla/performance', async ({ query, set }) => {
    try {
      const fromDate = query.from_date ? new Date(query.from_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = query.to_date ? new Date(query.to_date as string) : new Date();
      
      // Mock SLA performance data
      const slaPerformance = {
        overall: {
          compliance: 92.3,
          breaches: 38,
          totalRequests: 492,
          averageResolutionTime: 18.5
        },
        byType: [
          { type: 'api_submission', compliance: 95.2, avgResolution: 16.8, breaches: 8 },
          { type: 'refund_request', compliance: 88.7, avgResolution: 12.3, breaches: 15 },
          { type: 'provider_registration', compliance: 90.1, avgResolution: 28.5, breaches: 12 },
          { type: 'account_deletion', compliance: 96.8, avgResolution: 22.1, breaches: 3 }
        ],
        byPriority: [
          { priority: 'urgent', compliance: 98.5, avgResolution: 2.8, breaches: 1 },
          { priority: 'high', compliance: 94.2, avgResolution: 8.5, breaches: 12 },
          { priority: 'medium', compliance: 91.8, avgResolution: 22.3, breaches: 20 },
          { priority: 'low', compliance: 88.9, avgResolution: 45.6, breaches: 5 }
        ],
        trends: [
          { date: '2024-01-01', compliance: 94.5 },
          { date: '2024-01-02', compliance: 91.2 },
          { date: '2024-01-03', compliance: 93.8 },
          { date: '2024-01-04', compliance: 89.6 },
          { date: '2024-01-05', compliance: 95.1 }
        ]
      };

      return {
        success: true,
        data: slaPerformance,
        meta: {
          timestamp: new Date().toISOString(),
          dateRange: { from: fromDate, to: toDate },
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch SLA performance data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Export is already done above at line 1