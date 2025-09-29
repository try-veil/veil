import { db, users } from '../db';
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

// Mock database tables - in real implementation, these would be actual Drizzle tables
const mockApprovals: ApprovalWithDetails[] = [];
const mockComments: ApprovalComment[] = [];

export class ApprovalRepository {
  /**
   * Create a new approval request
   */
  async create(data: CreateApprovalData): Promise<ApprovalWithDetails> {
    // Mock implementation - in real app, this would use Drizzle
    const approval: ApprovalWithDetails = {
      id: Date.now(),
      uid: `approval_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: data.type,
      entityId: data.entityId,
      entityType: data.entityType,
      status: data.status || 'pending',
      priority: data.priority,
      requestedBy: data.requestedBy,
      assignedTo: data.assignedTo || null,
      data: data.data || {},
      reason: data.reason,
      attachments: data.attachments || [],
      expectedResolution: data.expectedResolution || null,
      tags: data.tags || [],
      processedAt: null,
      processedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      requester: {
        id: data.requestedBy,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      },
      assignee: data.assignedTo ? {
        id: data.assignedTo,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com'
      } : null,
      processor: null
    };

    mockApprovals.push(approval);
    console.log(`Approval request created: ${approval.uid}`);
    
    return approval;
  }

  /**
   * Find approval by ID
   */
  async findById(id: number): Promise<ApprovalWithDetails | null> {
    return mockApprovals.find(a => a.id === id) || null;
  }

  /**
   * Find approval by UID
   */
  async findByUid(uid: string): Promise<ApprovalWithDetails | null> {
    return mockApprovals.find(a => a.uid === uid) || null;
  }

  /**
   * Get approvals with filters
   */
  async findMany(filters?: ApprovalFilters, page: number = 1, limit: number = 20): Promise<{
    approvals: ApprovalWithDetails[];
    total: number;
  }> {
    let filteredApprovals = [...mockApprovals];

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      filteredApprovals = filteredApprovals.filter(a => a.status === filters.status);
    }

    if (filters?.type && filters.type !== 'all') {
      filteredApprovals = filteredApprovals.filter(a => a.type === filters.type);
    }

    if (filters?.priority && filters.priority !== 'all') {
      filteredApprovals = filteredApprovals.filter(a => a.priority === filters.priority);
    }

    if (filters?.assignedTo) {
      filteredApprovals = filteredApprovals.filter(a => a.assignedTo === filters.assignedTo);
    }

    if (filters?.requestedBy) {
      filteredApprovals = filteredApprovals.filter(a => a.requestedBy === filters.requestedBy);
    }

    if (filters?.fromDate) {
      filteredApprovals = filteredApprovals.filter(a => a.createdAt >= filters.fromDate!);
    }

    if (filters?.toDate) {
      filteredApprovals = filteredApprovals.filter(a => a.createdAt <= filters.toDate!);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredApprovals = filteredApprovals.filter(a => 
        a.reason.toLowerCase().includes(searchLower) ||
        a.type.toLowerCase().includes(searchLower) ||
        a.entityId.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      filteredApprovals = filteredApprovals.filter(a => 
        filters.tags!.some(tag => a.tags.includes(tag))
      );
    }

    // Sort by creation date (newest first)
    filteredApprovals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filteredApprovals.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedApprovals = filteredApprovals.slice(startIndex, endIndex);

    return {
      approvals: paginatedApprovals,
      total
    };
  }

  /**
   * Update approval
   */
  async update(id: number, data: UpdateApprovalData): Promise<ApprovalWithDetails | null> {
    const approvalIndex = mockApprovals.findIndex(a => a.id === id);
    if (approvalIndex === -1) return null;

    const approval = mockApprovals[approvalIndex];
    
    mockApprovals[approvalIndex] = {
      ...approval,
      ...data,
      updatedAt: new Date(),
      // Update assignee info if assignedTo changed
      assignee: data.assignedTo ? {
        id: data.assignedTo,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com'
      } : data.assignedTo === null ? null : approval.assignee,
      // Update processor info if processedBy is set
      processor: data.processedBy ? {
        id: data.processedBy,
        firstName: 'Processor',
        lastName: 'Admin',
        email: 'processor@example.com'
      } : approval.processor
    };

    return mockApprovals[approvalIndex];
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
        `Assigned to ${approval.assignee?.firstName} ${approval.assignee?.lastName}`,
        true
      );
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
    const comment: ApprovalComment = {
      id: Date.now(),
      uid: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      approvalId,
      userId,
      content,
      isInternal,
      attachments,
      mentionedUsers,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: userId,
        firstName: 'User',
        lastName: 'Name',
        email: 'user@example.com'
      }
    };

    mockComments.push(comment);
    return comment;
  }

  /**
   * Get comments for approval
   */
  async getComments(approvalId: number, includeInternal: boolean = false): Promise<ApprovalComment[]> {
    let comments = mockComments.filter(c => c.approvalId === approvalId);
    
    if (!includeInternal) {
      comments = comments.filter(c => !c.isInternal);
    }

    return comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
    let approvals = [...mockApprovals];

    // Apply filters
    if (filters?.fromDate) {
      approvals = approvals.filter(a => a.createdAt >= filters.fromDate!);
    }

    if (filters?.toDate) {
      approvals = approvals.filter(a => a.createdAt <= filters.toDate!);
    }

    if (filters?.assignedTo) {
      approvals = approvals.filter(a => a.assignedTo === filters.assignedTo);
    }

    if (filters?.type) {
      approvals = approvals.filter(a => a.type === filters.type);
    }

    const total = approvals.length;
    const pending = approvals.filter(a => a.status === 'pending').length;
    const approved = approvals.filter(a => a.status === 'approved').length;
    const rejected = approvals.filter(a => a.status === 'rejected').length;
    const escalated = approvals.filter(a => a.status === 'escalated').length;
    const expired = approvals.filter(a => a.status === 'expired').length;

    // Calculate average resolution time
    const resolvedApprovals = approvals.filter(a => a.processedAt);
    const totalResolutionTime = resolvedApprovals.reduce((sum, a) => {
      const resolutionTime = a.processedAt!.getTime() - a.createdAt.getTime();
      return sum + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
    }, 0);
    const averageResolutionTime = resolvedApprovals.length > 0 ? totalResolutionTime / resolvedApprovals.length : 0;

    // Calculate SLA compliance (mock - 80% compliance)
    const slaCompliance = 80;

    // Group by type
    const byType = approvals.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by priority
    const byPriority = approvals.reduce((acc, a) => {
      acc[a.priority] = (acc[a.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by assignee
    const assigneeGroups = approvals.reduce((acc, a) => {
      if (a.assignedTo) {
        if (!acc[a.assignedTo]) {
          acc[a.assignedTo] = {
            assigneeId: a.assignedTo,
            assigneeName: `${a.assignee?.firstName} ${a.assignee?.lastName}`,
            approvals: []
          };
        }
        acc[a.assignedTo].approvals.push(a);
      }
      return acc;
    }, {} as Record<number, any>);

    const byAssignee = Object.values(assigneeGroups).map((group: any) => ({
      assigneeId: group.assigneeId,
      assigneeName: group.assigneeName,
      count: group.approvals.length,
      avgResolutionTime: group.approvals.filter((a: any) => a.processedAt).length > 0 ?
        group.approvals.filter((a: any) => a.processedAt).reduce((sum: number, a: any) => {
          const resolutionTime = a.processedAt.getTime() - a.createdAt.getTime();
          return sum + (resolutionTime / (1000 * 60 * 60));
        }, 0) / group.approvals.filter((a: any) => a.processedAt).length : 0
    }));

    return {
      total,
      pending,
      approved,
      rejected,
      escalated,
      expired,
      averageResolutionTime,
      slaCompliance,
      byType,
      byPriority,
      byAssignee
    };
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingForUser(userId: number): Promise<ApprovalWithDetails[]> {
    return mockApprovals.filter(a => 
      a.assignedTo === userId && a.status === 'pending'
    ).sort((a, b) => {
      // Sort by priority then by creation date
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Get overdue approvals
   */
  async getOverdueApprovals(): Promise<ApprovalWithDetails[]> {
    const now = new Date();
    return mockApprovals.filter(a => 
      a.status === 'pending' && 
      a.expectedResolution && 
      a.expectedResolution < now
    );
  }

  /**
   * Bulk update approvals
   */
  async bulkUpdate(
    approvalIds: number[],
    updates: Partial<UpdateApprovalData>
  ): Promise<number> {
    let updated = 0;
    
    for (const id of approvalIds) {
      const result = await this.update(id, updates);
      if (result) updated++;
    }
    
    return updated;
  }

  /**
   * Delete approval (soft delete)
   */
  async delete(id: number): Promise<boolean> {
    const approvalIndex = mockApprovals.findIndex(a => a.id === id);
    if (approvalIndex === -1) return false;
    
    // In real implementation, this would be a soft delete
    mockApprovals.splice(approvalIndex, 1);
    return true;
  }

  /**
   * Get approvals by entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<ApprovalWithDetails[]> {
    return mockApprovals.filter(a => 
      a.entityType === entityType && a.entityId === entityId
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Check if user has pending approval for entity
   */
  async hasPendingApproval(entityType: string, entityId: string, userId?: number): Promise<boolean> {
    const conditions = (a: ApprovalWithDetails) => 
      a.entityType === entityType && 
      a.entityId === entityId && 
      a.status === 'pending' &&
      (!userId || a.requestedBy === userId);
    
    return mockApprovals.some(conditions);
  }
}