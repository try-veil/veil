import { z } from 'zod';

// Base approval request schema
export const approvalRequestSchema = z.object({
  type: z.enum([
    'api_submission',
    'provider_registration',
    'api_update',
    'subscription_upgrade',
    'refund_request',
    'account_deletion',
    'dispute_resolution',
    'content_moderation'
  ]),
  entityId: z.string().min(1, 'Entity ID is required'),
  entityType: z.enum(['api', 'user', 'subscription', 'payment', 'content']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  requestedBy: z.number().int().positive('Requested by user ID must be positive'),
  data: z.record(z.string(), z.any()).optional(),
  reason: z.string()
    .min(1, 'Reason is required')
    .max(1000, 'Reason must be less than 1000 characters'),
  attachments: z.array(z.string()).optional(),
  expectedResolution: z.string()
    .datetime('Expected resolution must be a valid ISO datetime')
    .optional(),
  tags: z.array(z.string()).optional(),
});

// Approval decision schema
export const approvalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'pending_info', 'escalated']),
  comments: z.string()
    .min(1, 'Comments are required for approval decisions')
    .max(2000, 'Comments must be less than 2000 characters'),
  conditions: z.array(z.string()).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string()
    .datetime('Follow-up date must be a valid ISO datetime')
    .optional(),
  escalateTo: z.number().int().positive().optional(),
  internalNotes: z.string()
    .max(1000, 'Internal notes must be less than 1000 characters')
    .optional(),
  attachments: z.array(z.string()).optional(),
});

// Bulk approval schema
export const bulkApprovalSchema = z.object({
  approvalIds: z.array(z.string().uuid())
    .min(1, 'At least one approval ID is required')
    .max(100, 'Cannot process more than 100 approvals at once'),
  decision: z.enum(['approved', 'rejected']),
  comments: z.string()
    .min(1, 'Comments are required for bulk approval')
    .max(1000, 'Comments must be less than 1000 characters'),
  sendNotifications: z.boolean().default(true),
});

// Approval query schema
export const approvalQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string()
    .optional()
    .transform((val) => val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20),
  status: z.enum(['pending', 'approved', 'rejected', 'escalated', 'expired', 'all'])
    .default('pending')
    .optional(),
  type: z.enum([
    'api_submission',
    'provider_registration', 
    'api_update',
    'subscription_upgrade',
    'refund_request',
    'account_deletion',
    'dispute_resolution',
    'content_moderation',
    'all'
  ])
    .default('all')
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'all'])
    .default('all')
    .optional(),
  assignedTo: z.string()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .optional(),
  requestedBy: z.string()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .optional(),
  from_date: z.string()
    .datetime('From date must be a valid ISO datetime')
    .optional(),
  to_date: z.string()
    .datetime('To date must be a valid ISO datetime')
    .optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'priority', 'type', 'status'])
    .default('created_at')
    .optional(),
  sort_order: z.enum(['asc', 'desc'])
    .default('desc')
    .optional(),
});

// Approval parameters schema
export const approvalParamsSchema = z.object({
  uid: z.string().uuid('Approval UID must be a valid UUID'),
});

// Assignment schema
export const assignmentSchema = z.object({
  assigneeId: z.number().int().positive('Assignee ID must be positive'),
  reason: z.string()
    .max(500, 'Assignment reason must be less than 500 characters')
    .optional(),
  dueDate: z.string()
    .datetime('Due date must be a valid ISO datetime')
    .optional(),
});

// Escalation schema
export const escalationSchema = z.object({
  escalateTo: z.number().int().positive('Escalation target ID must be positive'),
  reason: z.string()
    .min(1, 'Escalation reason is required')
    .max(1000, 'Escalation reason must be less than 1000 characters'),
  priority: z.enum(['medium', 'high', 'urgent']).default('high'),
  urgency: z.enum(['normal', 'high', 'critical']).default('normal'),
});

// Comment schema
export const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2000 characters'),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.string()).optional(),
  mentionedUsers: z.array(z.number().int().positive()).optional(),
});

// SLA configuration schema
export const slaConfigSchema = z.object({
  type: z.enum([
    'api_submission',
    'provider_registration',
    'api_update', 
    'subscription_upgrade',
    'refund_request',
    'account_deletion',
    'dispute_resolution',
    'content_moderation'
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  responseTime: z.object({
    hours: z.number().int().min(1).max(720), // 1 hour to 30 days
    businessHoursOnly: z.boolean().default(false),
  }),
  resolutionTime: z.object({
    hours: z.number().int().min(1).max(720),
    businessHoursOnly: z.boolean().default(false),
  }),
  escalationRules: z.array(z.object({
    afterHours: z.number().int().min(1),
    escalateTo: z.enum(['manager', 'senior_admin', 'executive']),
  })).optional(),
  autoApprovalRules: z.object({
    enabled: z.boolean().default(false),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'ne', 'gt', 'lt', 'contains']),
      value: z.any(),
    })).optional(),
  }).optional(),
});

// Approval template schema
export const approvalTemplateSchema = z.object({
  name: z.string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be less than 100 characters'),
  type: z.enum([
    'api_submission',
    'provider_registration',
    'api_update',
    'subscription_upgrade', 
    'refund_request',
    'account_deletion',
    'dispute_resolution',
    'content_moderation'
  ]),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  workflow: z.array(z.object({
    step: z.number().int().positive(),
    name: z.string(),
    assigneeRole: z.enum(['admin', 'manager', 'senior_admin', 'executive']),
    requiredApprovals: z.number().int().min(1).default(1),
    parallelApproval: z.boolean().default(false),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'ne', 'gt', 'lt', 'contains']),
      value: z.any(),
    })).optional(),
    autoApprove: z.boolean().default(false),
    timeoutHours: z.number().int().min(1).optional(),
  })),
  notifications: z.object({
    requestSubmitted: z.boolean().default(true),
    assignmentChanged: z.boolean().default(true),
    statusChanged: z.boolean().default(true),
    escalated: z.boolean().default(true),
    expired: z.boolean().default(true),
  }).optional(),
  isActive: z.boolean().default(true),
});

// Approval analytics schema
export const approvalAnalyticsSchema = z.object({
  from_date: z.string()
    .datetime('From date must be a valid ISO datetime')
    .optional(),
  to_date: z.string()
    .datetime('To date must be a valid ISO datetime')
    .optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month'])
    .default('day')
    .optional(),
  group_by: z.enum(['type', 'status', 'assignee', 'priority'])
    .optional(),
  metrics: z.array(z.enum([
    'total_requests',
    'approved_requests',
    'rejected_requests',
    'pending_requests',
    'average_response_time',
    'average_resolution_time',
    'sla_compliance',
    'escalation_rate',
    'auto_approval_rate'
  ]))
    .default(['total_requests', 'average_resolution_time'])
    .optional(),
});

// Workflow configuration schema
export const workflowConfigSchema = z.object({
  name: z.string()
    .min(1, 'Workflow name is required')
    .max(100, 'Workflow name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  triggerType: z.enum(['manual', 'automatic', 'scheduled']),
  triggerConditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in']),
    value: z.any(),
  })).optional(),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['approval', 'notification', 'action', 'condition']),
    config: z.record(z.string(), z.any()),
    dependencies: z.array(z.string()).optional(),
    timeout: z.number().int().min(1).optional(),
  })),
  isActive: z.boolean().default(true),
});

// Type exports
export type ApprovalRequestData = z.infer<typeof approvalRequestSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type BulkApprovalRequest = z.infer<typeof bulkApprovalSchema>;
export type ApprovalQuery = z.infer<typeof approvalQuerySchema>;
export type ApprovalParams = z.infer<typeof approvalParamsSchema>;
export type AssignmentRequest = z.infer<typeof assignmentSchema>;
export type EscalationRequest = z.infer<typeof escalationSchema>;
export type CommentRequest = z.infer<typeof commentSchema>;
export type SLAConfig = z.infer<typeof slaConfigSchema>;
export type ApprovalTemplate = z.infer<typeof approvalTemplateSchema>;
export type ApprovalAnalyticsQuery = z.infer<typeof approvalAnalyticsSchema>;
export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;