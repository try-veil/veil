import { ApprovalRepository, CreateApprovalData, UpdateApprovalData, ApprovalWithDetails, ApprovalFilters } from '../repositories/approval-repository';

export interface ApprovalRequest {
  type: 'api_submission' | 'provider_registration' | 'api_update' | 'subscription_upgrade' | 'refund_request' | 'account_deletion' | 'dispute_resolution' | 'content_moderation';
  entityId: string;
  entityType: 'api' | 'user' | 'subscription' | 'payment' | 'content';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, any>;
  reason: string;
  attachments?: string[];
  expectedResolution?: Date;
  tags?: string[];
}

export interface ApprovalDecisionRequest {
  decision: 'approved' | 'rejected' | 'pending_info' | 'escalated';
  comments: string;
  conditions?: string[];
  followUpRequired?: boolean;
  followUpDate?: Date;
  escalateTo?: number;
  internalNotes?: string;
  attachments?: string[];
}

export interface BulkApprovalRequest {
  approvalIds: string[];
  decision: 'approved' | 'rejected';
  comments: string;
  sendNotifications?: boolean;
}

export interface AssignmentRequest {
  assigneeId: number;
  reason?: string;
  dueDate?: Date;
}

export interface EscalationRequest {
  escalateTo: number;
  reason: string;
  priority?: 'medium' | 'high' | 'urgent';
  urgency?: 'normal' | 'high' | 'critical';
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  steps: Array<{
    id: string;
    name: string;
    assigneeRole: string;
    requiredApprovals: number;
    parallelApproval: boolean;
    autoApprove: boolean;
    timeoutHours?: number;
  }>;
  isActive: boolean;
}

export interface SLAConfiguration {
  type: string;
  priority: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
  businessHoursOnly: boolean;
  escalationRules: Array<{
    afterHours: number;
    escalateTo: string;
  }>;
}

export interface NotificationConfig {
  requestSubmitted: boolean;
  assignmentChanged: boolean;
  statusChanged: boolean;
  escalated: boolean;
  expired: boolean;
}

export class ApprovalService {
  private approvalRepository: ApprovalRepository;
  
  // Mock SLA configurations
  private slaConfigurations: Map<string, SLAConfiguration>;
  
  // Mock workflow configurations
  private workflows: Map<string, ApprovalWorkflow>;

  constructor() {
    this.approvalRepository = new ApprovalRepository();
    this.initializeSLAConfigurations();
    this.initializeWorkflows();
  }

  /**
   * Initialize default SLA configurations
   */
  private initializeSLAConfigurations(): void {
    this.slaConfigurations = new Map([
      ['api_submission_high', {
        type: 'api_submission',
        priority: 'high',
        responseTimeHours: 4,
        resolutionTimeHours: 24,
        businessHoursOnly: false,
        escalationRules: [
          { afterHours: 2, escalateTo: 'manager' },
          { afterHours: 12, escalateTo: 'senior_admin' }
        ]
      }],
      ['api_submission_medium', {
        type: 'api_submission',
        priority: 'medium',
        responseTimeHours: 8,
        resolutionTimeHours: 72,
        businessHoursOnly: true,
        escalationRules: [
          { afterHours: 24, escalateTo: 'manager' }
        ]
      }],
      ['refund_request_urgent', {
        type: 'refund_request',
        priority: 'urgent',
        responseTimeHours: 1,
        resolutionTimeHours: 8,
        businessHoursOnly: false,
        escalationRules: [
          { afterHours: 4, escalateTo: 'senior_admin' }
        ]
      }],
      ['provider_registration_medium', {
        type: 'provider_registration',
        priority: 'medium',
        responseTimeHours: 12,
        resolutionTimeHours: 96,
        businessHoursOnly: true,
        escalationRules: [
          { afterHours: 48, escalateTo: 'manager' }
        ]
      }]
    ]);
  }

  /**
   * Initialize default workflows
   */
  private initializeWorkflows(): void {
    this.workflows = new Map([
      ['api_submission', {
        id: 'api_submission',
        name: 'API Submission Review',
        steps: [
          {
            id: 'initial_review',
            name: 'Initial Technical Review',
            assigneeRole: 'admin',
            requiredApprovals: 1,
            parallelApproval: false,
            autoApprove: false,
            timeoutHours: 24
          },
          {
            id: 'security_review',
            name: 'Security Assessment',
            assigneeRole: 'senior_admin',
            requiredApprovals: 1,
            parallelApproval: false,
            autoApprove: false,
            timeoutHours: 48
          },
          {
            id: 'final_approval',
            name: 'Final Approval',
            assigneeRole: 'manager',
            requiredApprovals: 1,
            parallelApproval: false,
            autoApprove: false,
            timeoutHours: 24
          }
        ],
        isActive: true
      }],
      ['refund_request', {
        id: 'refund_request',
        name: 'Refund Request Processing',
        steps: [
          {
            id: 'eligibility_check',
            name: 'Refund Eligibility Check',
            assigneeRole: 'admin',
            requiredApprovals: 1,
            parallelApproval: false,
            autoApprove: true, // Can be automated based on conditions
            timeoutHours: 4
          },
          {
            id: 'manager_approval',
            name: 'Manager Approval',
            assigneeRole: 'manager',
            requiredApprovals: 1,
            parallelApproval: false,
            autoApprove: false,
            timeoutHours: 12
          }
        ],
        isActive: true
      }]
    ]);
  }

  /**
   * Create a new approval request
   */
  async createApprovalRequest(
    userId: number,
    request: ApprovalRequest
  ): Promise<ApprovalWithDetails> {
    try {
      // Check if there's already a pending approval for this entity
      const hasPending = await this.approvalRepository.hasPendingApproval(
        request.entityType,
        request.entityId,
        userId
      );

      if (hasPending) {
        throw new Error('There is already a pending approval request for this entity');
      }

      // Determine priority and auto-assign based on type
      const priority = request.priority || this.getDefaultPriority(request.type);
      const assignedTo = await this.getDefaultAssignee(request.type, priority);
      
      // Calculate expected resolution based on SLA
      const expectedResolution = this.calculateExpectedResolution(request.type, priority);

      const approvalData: CreateApprovalData = {
        type: request.type,
        entityId: request.entityId,
        entityType: request.entityType,
        priority,
        requestedBy: userId,
        assignedTo,
        data: request.data,
        reason: request.reason,
        attachments: request.attachments,
        expectedResolution,
        tags: request.tags
      };

      const approval = await this.approvalRepository.create(approvalData);

      // Send notifications
      await this.sendNotification(approval, 'request_submitted');

      console.log(`Approval request created: ${approval.uid} for ${request.type}`);
      
      return approval;

    } catch (error) {
      console.error('Error creating approval request:', error);
      throw error;
    }
  }

  /**
   * Process an approval decision
   */
  async processDecision(
    approvalUid: string,
    adminUserId: number,
    decision: ApprovalDecisionRequest
  ): Promise<ApprovalWithDetails> {
    try {
      const approval = await this.approvalRepository.findByUid(approvalUid);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      if (approval.status !== 'pending') {
        throw new Error('Approval request is not in pending status');
      }

      // Process the decision
      const updatedApproval = await this.approvalRepository.processDecision(
        approval.id,
        decision.decision,
        adminUserId,
        decision.comments
      );

      if (!updatedApproval) {
        throw new Error('Failed to process approval decision');
      }

      // Handle escalation
      if (decision.decision === 'escalated' && decision.escalateTo) {
        await this.approvalRepository.escalate(
          approval.id,
          decision.escalateTo,
          adminUserId,
          decision.comments
        );
      }

      // Execute post-decision actions
      await this.executePostDecisionActions(updatedApproval, decision);

      // Send notifications
      await this.sendNotification(updatedApproval, 'status_changed');

      console.log(`Approval decision processed: ${approvalUid} - ${decision.decision}`);
      
      return updatedApproval;

    } catch (error) {
      console.error('Error processing approval decision:', error);
      throw error;
    }
  }

  /**
   * Get approval by UID
   */
  async getApproval(approvalUid: string, userId?: number): Promise<ApprovalWithDetails> {
    try {
      const approval = await this.approvalRepository.findByUid(approvalUid);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      // Check access permissions
      if (userId && !this.canUserAccessApproval(approval, userId)) {
        throw new Error('You do not have permission to access this approval request');
      }

      return approval;

    } catch (error) {
      console.error('Error fetching approval:', error);
      throw error;
    }
  }

  /**
   * Get approvals with filters
   */
  async getApprovals(
    filters?: ApprovalFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    approvals: ApprovalWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const result = await this.approvalRepository.findMany(filters, page, limit);
      
      const totalPages = Math.ceil(result.total / limit);

      return {
        approvals: result.approvals,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      };

    } catch (error) {
      console.error('Error fetching approvals:', error);
      throw new Error('Failed to fetch approval requests');
    }
  }

  /**
   * Get pending approvals for a user
   */
  async getUserPendingApprovals(userId: number): Promise<ApprovalWithDetails[]> {
    try {
      return await this.approvalRepository.getPendingForUser(userId);
    } catch (error) {
      console.error('Error fetching user pending approvals:', error);
      throw error;
    }
  }

  /**
   * Assign approval to user
   */
  async assignApproval(
    approvalUid: string,
    assigneeId: number,
    assignedBy: number,
    reason?: string
  ): Promise<ApprovalWithDetails> {
    try {
      const approval = await this.approvalRepository.findByUid(approvalUid);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      if (approval.status !== 'pending') {
        throw new Error('Cannot assign non-pending approval request');
      }

      const updatedApproval = await this.approvalRepository.assign(
        approval.id,
        assigneeId,
        assignedBy
      );

      if (!updatedApproval) {
        throw new Error('Failed to assign approval request');
      }

      // Send notification
      await this.sendNotification(updatedApproval, 'assignment_changed');

      console.log(`Approval assigned: ${approvalUid} to user ${assigneeId}`);
      
      return updatedApproval;

    } catch (error) {
      console.error('Error assigning approval:', error);
      throw error;
    }
  }

  /**
   * Escalate approval
   */
  async escalateApproval(
    approvalUid: string,
    escalationRequest: EscalationRequest,
    escalatedBy: number
  ): Promise<ApprovalWithDetails> {
    try {
      const approval = await this.approvalRepository.findByUid(approvalUid);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      if (approval.status !== 'pending') {
        throw new Error('Cannot escalate non-pending approval request');
      }

      const updatedApproval = await this.approvalRepository.escalate(
        approval.id,
        escalationRequest.escalateTo,
        escalatedBy,
        escalationRequest.reason
      );

      if (!updatedApproval) {
        throw new Error('Failed to escalate approval request');
      }

      // Send notification
      await this.sendNotification(updatedApproval, 'escalated');

      console.log(`Approval escalated: ${approvalUid} to user ${escalationRequest.escalateTo}`);
      
      return updatedApproval;

    } catch (error) {
      console.error('Error escalating approval:', error);
      throw error;
    }
  }

  /**
   * Add comment to approval
   */
  async addComment(
    approvalUid: string,
    userId: number,
    content: string,
    isInternal: boolean = false,
    attachments: string[] = [],
    mentionedUsers: number[] = []
  ) {
    try {
      const approval = await this.approvalRepository.findByUid(approvalUid);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      if (!this.canUserAccessApproval(approval, userId)) {
        throw new Error('You do not have permission to comment on this approval request');
      }

      const comment = await this.approvalRepository.addComment(
        approval.id,
        userId,
        content,
        isInternal,
        attachments,
        mentionedUsers
      );

      // Send notifications to mentioned users
      if (mentionedUsers.length > 0) {
        await this.sendMentionNotifications(approval, comment, mentionedUsers);
      }

      return comment;

    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for approval
   */
  async getComments(approvalUid: string, userId: number, includeInternal: boolean = false) {
    try {
      const approval = await this.approvalRepository.findByUid(approvalUid);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      if (!this.canUserAccessApproval(approval, userId)) {
        throw new Error('You do not have permission to view comments for this approval request');
      }

      // Only allow internal comments if user is admin
      const canViewInternal = this.isAdmin(userId);
      
      return await this.approvalRepository.getComments(
        approval.id,
        includeInternal && canViewInternal
      );

    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  /**
   * Process bulk approvals
   */
  async processBulkApprovals(
    request: BulkApprovalRequest,
    adminUserId: number
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{
      approvalUid: string;
      error: string;
    }>;
  }> {
    const result = {
      processed: request.approvalIds.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ approvalUid: string; error: string; }>
    };

    for (const approvalUid of request.approvalIds) {
      try {
        await this.processDecision(approvalUid, adminUserId, {
          decision: request.decision,
          comments: request.comments
        });
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          approvalUid,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(filters?: {
    fromDate?: Date;
    toDate?: Date;
    assignedTo?: number;
    type?: string;
  }) {
    try {
      return await this.approvalRepository.getStats(filters);
    } catch (error) {
      console.error('Error fetching approval stats:', error);
      throw error;
    }
  }

  /**
   * Get overdue approvals
   */
  async getOverdueApprovals(): Promise<ApprovalWithDetails[]> {
    try {
      return await this.approvalRepository.getOverdueApprovals();
    } catch (error) {
      console.error('Error fetching overdue approvals:', error);
      throw error;
    }
  }

  /**
   * Cancel approval request
   */
  async cancelApprovalRequest(
    approvalUid: string,
    userId: number,
    reason: string
  ): Promise<ApprovalWithDetails> {
    try {
      const approval = await this.approvalRepository.findByUid(approvalUid);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      if (approval.requestedBy !== userId && !this.isAdmin(userId)) {
        throw new Error('You can only cancel your own approval requests');
      }

      if (approval.status !== 'pending') {
        throw new Error('Cannot cancel non-pending approval request');
      }

      const updatedApproval = await this.approvalRepository.update(approval.id, {
        status: 'rejected'
      });

      if (!updatedApproval) {
        throw new Error('Failed to cancel approval request');
      }

      // Add cancellation comment
      await this.approvalRepository.addComment(
        approval.id,
        userId,
        `Cancelled by requester: ${reason}`,
        false
      );

      return updatedApproval;

    } catch (error) {
      console.error('Error cancelling approval request:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private getDefaultPriority(type: string): 'low' | 'medium' | 'high' | 'urgent' {
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
      'api_submission': 'medium',
      'provider_registration': 'medium',
      'api_update': 'low',
      'subscription_upgrade': 'low',
      'refund_request': 'high',
      'account_deletion': 'medium',
      'dispute_resolution': 'high',
      'content_moderation': 'urgent'
    };

    return priorityMap[type] || 'medium';
  }

  private async getDefaultAssignee(type: string, priority: string): Promise<number | undefined> {
    // Mock assignment logic - in real app, this would query admin users
    const assignmentMap: Record<string, number> = {
      'api_submission': 2, // Admin user ID
      'provider_registration': 2,
      'refund_request': 3, // Senior admin user ID
      'content_moderation': 3
    };

    return assignmentMap[type];
  }

  private calculateExpectedResolution(type: string, priority: string): Date {
    const slaKey = `${type}_${priority}`;
    const sla = this.slaConfigurations.get(slaKey);
    
    if (sla) {
      const now = new Date();
      const resolutionDate = new Date(now.getTime() + (sla.resolutionTimeHours * 60 * 60 * 1000));
      return resolutionDate;
    }

    // Default to 72 hours
    const now = new Date();
    return new Date(now.getTime() + (72 * 60 * 60 * 1000));
  }

  private canUserAccessApproval(approval: ApprovalWithDetails, userId: number): boolean {
    return (
      approval.requestedBy === userId ||
      approval.assignedTo === userId ||
      this.isAdmin(userId)
    );
  }

  private isAdmin(userId: number): boolean {
    // Mock admin check - in real app, this would check user roles
    return userId === 2 || userId === 3;
  }

  private async executePostDecisionActions(
    approval: ApprovalWithDetails,
    decision: ApprovalDecisionRequest
  ): Promise<void> {
    try {
      if (decision.decision === 'approved') {
        await this.executeApprovalActions(approval);
      } else if (decision.decision === 'rejected') {
        await this.executeRejectionActions(approval);
      }
    } catch (error) {
      console.error('Error executing post-decision actions:', error);
      // Don't throw - this shouldn't fail the approval process
    }
  }

  private async executeApprovalActions(approval: ApprovalWithDetails): Promise<void> {
    switch (approval.type) {
      case 'api_submission':
        // Activate API, notify provider
        console.log(`Activating API: ${approval.entityId}`);
        break;
      case 'provider_registration':
        // Activate provider account
        console.log(`Activating provider account: ${approval.entityId}`);
        break;
      case 'refund_request':
        // Process refund
        console.log(`Processing refund: ${approval.entityId}`);
        break;
    }
  }

  private async executeRejectionActions(approval: ApprovalWithDetails): Promise<void> {
    switch (approval.type) {
      case 'api_submission':
        // Notify provider of rejection
        console.log(`API submission rejected: ${approval.entityId}`);
        break;
      case 'provider_registration':
        // Notify user of rejection
        console.log(`Provider registration rejected: ${approval.entityId}`);
        break;
    }
  }

  private async sendNotification(approval: ApprovalWithDetails, type: string): Promise<void> {
    // Mock notification sending
    console.log(`Sending notification: ${type} for approval ${approval.uid}`);
  }

  private async sendMentionNotifications(
    approval: ApprovalWithDetails,
    comment: any,
    mentionedUsers: number[]
  ): Promise<void> {
    // Mock mention notifications
    console.log(`Sending mention notifications for approval ${approval.uid} to users: ${mentionedUsers.join(', ')}`);
  }
}