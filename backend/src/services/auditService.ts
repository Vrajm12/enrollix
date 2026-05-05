import { prisma } from '../prisma.js';

/**
 * Audit Logging
 * Tracks all data access and modifications for compliance
 * GDPR, CCPA, etc.
 */

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE'
}

export interface AuditLog {
  userId: number;
  action: AuditAction;
  resourceType: string; // 'User', 'Lead', 'Tenant', etc.
  resourceId?: number;
  tenantId: number;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE';
  reason?: string;
}

export class AuditService {
  /**
   * Log an action for compliance tracking
   */
  static async log(auditLog: AuditLog): Promise<void> {
    try {
      console.log(`[AUDIT] ${new Date().toISOString()}`, {
        action: auditLog.action,
        user: auditLog.userId,
        resource: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        tenant: auditLog.tenantId,
        status: auditLog.status,
        ip: auditLog.ipAddress
      });

      // Persist to database
      await prisma.securityEvent.create({
        data: {
          tenantId: auditLog.tenantId,
          userId: auditLog.userId || null,
          action: auditLog.action,
          resource: auditLog.resourceType,
          resourceId: auditLog.resourceId || null,
          status: auditLog.status,
          details: {
            reason: auditLog.reason,
            changes: auditLog.changes,
            userAgent: auditLog.userAgent
          },
          ipAddress: auditLog.ipAddress,
          userAgent: auditLog.userAgent || null
        }
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
      // Don't throw - audit failures shouldn't break the app
    }
  }

  /**
   * Log sensitive data access
   */
  static async logDataAccess(
    userId: number,
    tenantId: number,
    dataType: string,
    itemCount: number,
    ipAddress: string
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.READ,
      resourceType: dataType,
      tenantId,
      status: 'SUCCESS',
      ipAddress
    });
  }

  /**
   * Log failed access attempts
   */
  static async logFailedAccess(
    userId: number,
    tenantId: number,
    resourceType: string,
    ipAddress: string,
    reason: string
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.READ,
      resourceType,
      tenantId,
      status: 'FAILURE',
      reason,
      ipAddress
    });
  }

  /**
   * Log user authentication
   */
  static async logLogin(
    userId: number,
    tenantId: number,
    ipAddress: string,
    success: boolean
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.LOGIN,
      resourceType: 'User',
      resourceId: userId,
      tenantId,
      status: success ? 'SUCCESS' : 'FAILURE',
      ipAddress
    });
  }

  /**
   * Log data modifications
   */
  static async logModification(
    userId: number,
    tenantId: number,
    action: AuditAction.CREATE | AuditAction.UPDATE | AuditAction.DELETE,
    resourceType: string,
    resourceId: number,
    changes?: Record<string, { old: any; new: any }>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType,
      resourceId,
      tenantId,
      changes,
      status: 'SUCCESS',
      ipAddress: ipAddress || 'UNKNOWN'
    });
  }
}
