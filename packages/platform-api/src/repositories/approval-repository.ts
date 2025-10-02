import { db, users, approvals, approvalComments, approvalHistory } from '../db';
import { eq, and, desc, sql, gte, lte, like, or, isNull, inArray } from 'drizzle-orm';

export interface CreateApprovalData {
  type: string;
  entityId: string;
  entityType: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy: number;
  assignedTo?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  data?: Record<string, any>;
  reason: string;
  attachments?: string[];
  expectedResolution?: Date;
  tags?: string[];
}

export interface UpdateApprovalData {
  status?: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  assignedTo?: number | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, any>;
  expectedResolution?: Date | null;
  tags?: string[];
  processedAt?: Date;
  processedBy?: number;
}

export interface ApprovalWithDetails {
  id: number;
  uid: string;
  type: string;
  entityId: string;
  entityType: string;
  status: string;
  priority: string;
  requestedBy: number;
  assignedTo: number | null;
  data: Record<string, any> | null;
  reason: string;
  attachments: string[];
  expectedResolution: Date | null;
  tags: string[];
  processedAt: Date | null;
  processedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  requester: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignee: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  processor: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface ApprovalComment {
  id: number;
  uid: string;
  approvalId: number;
  userId: number;
  content: string;
  isInternal: boolean;
  attachments: string[];
  mentionedUsers: number[];
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ApprovalFilters {
  status?: string;
  type?: string;
  priority?: string;
  assignedTo?: number;
  requestedBy?: number;
  fromDate?: Date;
  toDate?: Date;
  tags?: string[];
  search?: string;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  expired: number;
  averageResolutionTime: number; // in hours
  slaCompliance: number; // percentage
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byAssignee: Array<{
    assigneeId: number;
    assigneeName: string;
    count: number;
    avgResolutionTime: number;
  }>;
}

export class ApprovalRepository {
  /**
   * Create a new approval request
   */
  async create(data: CreateApprovalData): Promise<ApprovalWithDetails> {
    const [approval] = await db.insert(approvals).values({
      type: data.type,
      entityId: data.entityId,
      entityType: data.entityType,
      status: data.status || 'pending',
      priority: data.priority,
      requestedBy: data.requestedBy,
      assignedTo: data.assignedTo,
      data: data.data ? JSON.stringify(data.data) : null,
      reason: data.reason,
      attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      expectedResolution: data.expectedResolution,
    }).returning();

    console.log(`Approval request created: ${approval.uid}`);

    // Fetch full details with relations
    const fullApproval = await this.findByUid(approval.uid);
    if (!fullApproval) {
      throw new Error('Failed to retrieve created approval');
    }

    return fullApproval;
  }

  /**
   * Find approval by ID
   */
  async findById(id: number): Promise<ApprovalWithDetails | null> {
    const result = await db.select({
      approval: approvals,
      requester: users,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.requestedBy, users.id))
    .where(eq(approvals.id, id))
    .limit(1);

    if (result.length === 0) return null;

    return this.mapToApprovalWithDetails(result[0]);
  }

  /**
   * Find approval by UID
   */
  async findByUid(uid: string): Promise<ApprovalWithDetails | null> {
    const result = await db.select({
      approval: approvals,
      requester: users,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.requestedBy, users.id))
    .where(eq(approvals.uid, uid))
    .limit(1);

    if (result.length === 0) return null;

    return this.mapToApprovalWithDetails(result[0]);
  }

  /**
   * Get approvals with filters
   */
  async findMany(filters?: ApprovalFilters, page: number = 1, limit: number = 20): Promise<{
    approvals: ApprovalWithDetails[];
    total: number;
  }> {
    // Build where conditions
    const conditions = [];

    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(approvals.status, filters.status));
    }

    if (filters?.type && filters.type !== 'all') {
      conditions.push(eq(approvals.type, filters.type));
    }

    if (filters?.priority && filters.priority !== 'all') {
      conditions.push(eq(approvals.priority, filters.priority));
    }

    if (filters?.assignedTo) {
      conditions.push(eq(approvals.assignedTo, filters.assignedTo));
    }

    if (filters?.requestedBy) {
      conditions.push(eq(approvals.requestedBy, filters.requestedBy));
    }

    if (filters?.fromDate) {
      conditions.push(gte(approvals.createdAt, filters.fromDate));
    }

    if (filters?.toDate) {
      conditions.push(lte(approvals.createdAt, filters.toDate));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(approvals.reason, `%${filters.search}%`),
          like(approvals.entityId, `%${filters.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(approvals)
      .where(whereClause);

    // Get paginated results
    const offset = (page - 1) * limit;
    const results = await db.select({
      approval: approvals,
      requester: users,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.requestedBy, users.id))
    .where(whereClause)
    .orderBy(desc(approvals.createdAt))
    .limit(limit)
    .offset(offset);

    const mappedApprovals = await Promise.all(
      results.map(r => this.mapToApprovalWithDetails(r))
    );

    return {
      approvals: mappedApprovals,
      total: count,
    };
  }

  /**
   * Update approval
   */
  async update(id: number, data: UpdateApprovalData): Promise<ApprovalWithDetails | null> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Serialize JSON fields
    if (data.data) {
      updateData.data = JSON.stringify(data.data);
    }
    if (data.tags) {
      updateData.tags = JSON.stringify(data.tags);
    }

    const [updated] = await db.update(approvals)
      .set(updateData)
      .where(eq(approvals.id, id))
      .returning();

    if (!updated) return null;

    return this.findById(id);
  }

  /**
   * Process approval decision
   */
  async processDecision(
    id: number,
    decision: 'approved' | 'rejected' | 'pending_info' | 'escalated',
    processedBy: number,
    comments?: string
  ): Promise<ApprovalWithDetails | null> {
    const approval = await this.update(id, {
      status: decision === 'pending_info' ? 'pending' : decision,
      processedAt: new Date(),
      processedBy
    });

    if (approval && comments) {
      await this.addComment(approval.id, processedBy, comments, false);
    }

    // Record in history
    await this.addHistory(id, 'status_changed', processedBy, {
      decision,
      comments
    });

    return approval;
  }

  /**
   * Assign approval to user
   */
  async assign(id: number, assigneeId: number, assignedBy: number): Promise<ApprovalWithDetails | null> {
    const approval = await this.update(id, {
      assignedTo: assigneeId
    });

    if (approval) {
      await this.addComment(
        approval.id,
        assignedBy,
        `Assigned to user ID ${assigneeId}`,
        true
      );

      await this.addHistory(id, 'assigned', assignedBy, {
        assigneeId
      });
    }

    return approval;
  }

  /**
   * Escalate approval
   */
  async escalate(
    id: number,
    escalatedTo: number,
    escalatedBy: number,
    reason: string
  ): Promise<ApprovalWithDetails | null> {
    const approval = await this.update(id, {
      status: 'escalated',
      assignedTo: escalatedTo,
      priority: 'urgent'
    });

    if (approval) {
      await this.addComment(
        approval.id,
        escalatedBy,
        `Escalated: ${reason}`,
        true
      );

      await this.addHistory(id, 'escalated', escalatedBy, {
        escalatedTo,
        reason
      });
    }

    return approval;
  }

  /**
   * Add comment to approval
   */
  async addComment(
    approvalId: number,
    userId: number,
    content: string,
    isInternal: boolean = false,
    attachments: string[] = [],
    mentionedUsers: number[] = []
  ): Promise<ApprovalComment> {
    const [comment] = await db.insert(approvalComments).values({
      approvalId,
      userId,
      content,
      isInternal,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
      mentionedUsers: mentionedUsers.length > 0 ? JSON.stringify(mentionedUsers) : null,
    }).returning();

    // Fetch with user details
    const [fullComment] = await db.select({
      comment: approvalComments,
      user: users,
    })
    .from(approvalComments)
    .leftJoin(users, eq(approvalComments.userId, users.id))
    .where(eq(approvalComments.id, comment.id));

    return this.mapToApprovalComment(fullComment);
  }

  /**
   * Get comments for approval
   */
  async getComments(approvalId: number, includeInternal: boolean = false): Promise<ApprovalComment[]> {
    const conditions = [eq(approvalComments.approvalId, approvalId)];

    if (!includeInternal) {
      conditions.push(eq(approvalComments.isInternal, false));
    }

    const results = await db.select({
      comment: approvalComments,
      user: users,
    })
    .from(approvalComments)
    .leftJoin(users, eq(approvalComments.userId, users.id))
    .where(and(...conditions))
    .orderBy(approvalComments.createdAt);

    return results.map(r => this.mapToApprovalComment(r));
  }

  /**
   * Add history entry
   */
  private async addHistory(
    approvalId: number,
    action: string,
    performedBy: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db.insert(approvalHistory).values({
      approvalId,
      action,
      performedBy,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  }

  /**
   * Get approval statistics
   */
  async getStats(filters?: {
    fromDate?: Date;
    toDate?: Date;
    assignedTo?: number;
    type?: string;
  }): Promise<ApprovalStats> {
    const conditions = [];

    if (filters?.fromDate) {
      conditions.push(gte(approvals.createdAt, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(approvals.createdAt, filters.toDate));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(approvals.assignedTo, filters.assignedTo));
    }
    if (filters?.type) {
      conditions.push(eq(approvals.type, filters.type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get counts by status
    const [statusCounts] = await db.select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${approvals.status} = 'pending')::int`,
      approved: sql<number>`count(*) filter (where ${approvals.status} = 'approved')::int`,
      rejected: sql<number>`count(*) filter (where ${approvals.status} = 'rejected')::int`,
      escalated: sql<number>`count(*) filter (where ${approvals.status} = 'escalated')::int`,
      expired: sql<number>`count(*) filter (where ${approvals.status} = 'expired')::int`,
    })
    .from(approvals)
    .where(whereClause);

    // Calculate average resolution time
    const [resolutionStats] = await db.select({
      avgResolutionHours: sql<number>`avg(extract(epoch from (${approvals.processedAt} - ${approvals.createdAt})) / 3600)`,
    })
    .from(approvals)
    .where(
      whereClause
        ? and(whereClause, sql`${approvals.processedAt} is not null`)
        : sql`${approvals.processedAt} is not null`
    );

    // Mock SLA compliance for now
    const slaCompliance = 80;

    return {
      total: statusCounts.total,
      pending: statusCounts.pending,
      approved: statusCounts.approved,
      rejected: statusCounts.rejected,
      escalated: statusCounts.escalated,
      expired: statusCounts.expired,
      averageResolutionTime: resolutionStats.avgResolutionHours || 0,
      slaCompliance,
      byType: {},
      byPriority: {},
      byAssignee: [],
    };
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingForUser(userId: number): Promise<ApprovalWithDetails[]> {
    const results = await db.select({
      approval: approvals,
      requester: users,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.requestedBy, users.id))
    .where(
      and(
        eq(approvals.assignedTo, userId),
        eq(approvals.status, 'pending')
      )
    )
    .orderBy(approvals.priority, approvals.createdAt);

    return Promise.all(results.map(r => this.mapToApprovalWithDetails(r)));
  }

  /**
   * Get overdue approvals
   */
  async getOverdueApprovals(): Promise<ApprovalWithDetails[]> {
    const now = new Date();
    const results = await db.select({
      approval: approvals,
      requester: users,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.requestedBy, users.id))
    .where(
      and(
        eq(approvals.status, 'pending'),
        sql`${approvals.expectedResolution} < ${now}`
      )
    )
    .orderBy(approvals.expectedResolution);

    return Promise.all(results.map(r => this.mapToApprovalWithDetails(r)));
  }

  /**
   * Bulk update approvals
   */
  async bulkUpdate(
    approvalIds: number[],
    updates: Partial<UpdateApprovalData>
  ): Promise<number> {
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.data) {
      updateData.data = JSON.stringify(updates.data);
    }
    if (updates.tags) {
      updateData.tags = JSON.stringify(updates.tags);
    }

    const result = await db.update(approvals)
      .set(updateData)
      .where(inArray(approvals.id, approvalIds));

    return approvalIds.length;
  }

  /**
   * Delete approval (soft delete by setting status to expired)
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await db.update(approvals)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(approvals.id, id))
      .returning();

    return !!result;
  }

  /**
   * Get approvals by entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<ApprovalWithDetails[]> {
    const results = await db.select({
      approval: approvals,
      requester: users,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.requestedBy, users.id))
    .where(
      and(
        eq(approvals.entityType, entityType),
        eq(approvals.entityId, entityId)
      )
    )
    .orderBy(desc(approvals.createdAt));

    return Promise.all(results.map(r => this.mapToApprovalWithDetails(r)));
  }

  /**
   * Check if user has pending approval for entity
   */
  async hasPendingApproval(entityType: string, entityId: string, userId?: number): Promise<boolean> {
    const conditions = [
      eq(approvals.entityType, entityType),
      eq(approvals.entityId, entityId),
      eq(approvals.status, 'pending')
    ];

    if (userId) {
      conditions.push(eq(approvals.requestedBy, userId));
    }

    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(approvals)
      .where(and(...conditions));

    return result.count > 0;
  }

  /**
   * Helper: Map database result to ApprovalWithDetails
   */
  private async mapToApprovalWithDetails(result: any): Promise<ApprovalWithDetails> {
    const approval = result.approval;
    const requester = result.requester;

    // Fetch assignee if exists
    let assignee = null;
    if (approval.assignedTo) {
      const [assigneeUser] = await db.select()
        .from(users)
        .where(eq(users.id, approval.assignedTo))
        .limit(1);
      if (assigneeUser) {
        assignee = {
          id: assigneeUser.id,
          firstName: assigneeUser.firstName,
          lastName: assigneeUser.lastName,
          email: assigneeUser.email,
        };
      }
    }

    // Fetch processor if exists
    let processor = null;
    if (approval.processedBy) {
      const [processorUser] = await db.select()
        .from(users)
        .where(eq(users.id, approval.processedBy))
        .limit(1);
      if (processorUser) {
        processor = {
          id: processorUser.id,
          firstName: processorUser.firstName,
          lastName: processorUser.lastName,
          email: processorUser.email,
        };
      }
    }

    return {
      id: approval.id,
      uid: approval.uid,
      type: approval.type,
      entityId: approval.entityId,
      entityType: approval.entityType,
      status: approval.status,
      priority: approval.priority,
      requestedBy: approval.requestedBy,
      assignedTo: approval.assignedTo,
      data: approval.data ? JSON.parse(approval.data) : null,
      reason: approval.reason,
      attachments: approval.attachments ? JSON.parse(approval.attachments) : [],
      expectedResolution: approval.expectedResolution,
      tags: approval.tags ? JSON.parse(approval.tags) : [],
      processedAt: approval.processedAt,
      processedBy: approval.processedBy,
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
      requester: {
        id: requester.id,
        firstName: requester.firstName,
        lastName: requester.lastName,
        email: requester.email,
      },
      assignee,
      processor,
    };
  }

  /**
   * Helper: Map database result to ApprovalComment
   */
  private mapToApprovalComment(result: any): ApprovalComment {
    const comment = result.comment;
    const user = result.user;

    return {
      id: comment.id,
      uid: comment.uid,
      approvalId: comment.approvalId,
      userId: comment.userId,
      content: comment.content,
      isInternal: comment.isInternal,
      attachments: comment.attachments ? JSON.parse(comment.attachments) : [],
      mentionedUsers: comment.mentionedUsers ? JSON.parse(comment.mentionedUsers) : [],
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };
  }
}
