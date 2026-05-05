import { prisma } from '../prisma.js';

/**
 * Persistent Audit Logging
 * Stores all security-relevant events to database
 * Required for: Compliance, incident response, forensics
 */

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_BRUTE_FORCE = 'LOGIN_BRUTE_FORCE',
  TOKEN_VALIDATION_FAILED = 'TOKEN_VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  DATA_DELETION = 'DATA_DELETION',
  ROLE_CHANGE = 'ROLE_CHANGE',
  CROSS_TENANT_ACCESS_ATTEMPT = 'CROSS_TENANT_ACCESS_ATTEMPT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_HEADER_VIOLATION = 'SECURITY_HEADER_VIOLATION',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT'
}

export enum EventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface SecurityEvent {
  eventType: SecurityEventType;
  userId?: number;
  tenantId?: number;
  ipAddress: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: number;
  details?: string;
  severity: EventSeverity;
  timestamp: Date;
}

export class PersistentAuditService {
  /**
   * Log security event to database
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const auditStatus = event.severity;

      console.log('[SECURITY_EVENT]', {
        type: event.eventType,
        severity: event.severity,
        user: event.userId,
        tenant: event.tenantId,
        ip: event.ipAddress,
        resource: event.resourceType,
        details: event.details,
        timestamp: event.timestamp
      });

      await prisma.securityEvent.create({
        data: {
          tenantId: event.tenantId ?? 0,
          userId: event.userId ?? null,
          action: event.eventType,
          resource: event.resourceType ?? 'SECURITY',
          resourceId: event.resourceId ?? null,
          status: auditStatus,
          details: {
            eventType: event.eventType,
            severity: event.severity,
            details: event.details ?? null,
            userAgent: event.userAgent ?? null
          },
          ipAddress: event.ipAddress,
          userAgent: event.userAgent ?? null,
          timestamp: event.timestamp
        }
      });
      
      // Alert on critical events
      if (event.severity === EventSeverity.CRITICAL) {
        this.alertCriticalEvent(event);
      }
    } catch (error) {
      console.error('[AUDIT_ERROR] Failed to log security event:', error);
    }
  }

  /**
   * Log failed login attempt with IP tracking
   */
  static async logFailedLogin(
    emailAttempted: string,
    ipAddress: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_FAILED,
      ipAddress,
      userAgent,
      severity: EventSeverity.WARNING,
      details: `Failed login for ${emailAttempted}: ${reason || 'Invalid credentials'}`,
      timestamp: new Date()
    });
  }

  /**
   * Log successful login
   */
  static async logSuccessfulLogin(
    userId: number,
    tenantId: number,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      userId,
      tenantId,
      ipAddress,
      userAgent,
      severity: EventSeverity.INFO,
      timestamp: new Date()
    });
  }

  /**
   * Log brute force attempt
   */
  static async logBruteForceAttempt(
    ipAddress: string,
    attemptCount: number,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_BRUTE_FORCE,
      ipAddress,
      userAgent,
      severity: EventSeverity.CRITICAL,
      details: `Brute force detected: ${attemptCount} failed attempts`,
      timestamp: new Date()
    });
  }

  /**
   * Log unauthorized access attempt
   */
  static async logUnauthorizedAccess(
    userId: number,
    tenantId: number,
    ipAddress: string,
    resourceType: string,
    resourceId: number
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      userId,
      tenantId,
      ipAddress,
      resourceType,
      resourceId,
      severity: EventSeverity.WARNING,
      details: `Unauthorized access to ${resourceType} ${resourceId}`,
      timestamp: new Date()
    });
  }

  /**
   * Log cross-tenant access attempt (CRITICAL)
   */
  static async logCrossTenantAccessAttempt(
    userId: number,
    userTenantId: number,
    targetTenantId: number,
    ipAddress: string,
    resourceType: string,
    details?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.CROSS_TENANT_ACCESS_ATTEMPT,
      userId,
      tenantId: userTenantId,
      ipAddress,
      resourceType,
      severity: EventSeverity.CRITICAL,
      details: `Attempted cross-tenant access from tenant ${userTenantId} to ${targetTenantId}: ${details}`,
      timestamp: new Date()
    });
  }

  /**
   * Log data access (for compliance tracking)
   */
  static async logDataAccess(
    userId: number,
    tenantId: number,
    resourceType: string,
    recordCount: number,
    ipAddress: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.DATA_ACCESS,
      userId,
      tenantId,
      ipAddress,
      resourceType,
      severity: EventSeverity.INFO,
      details: `Accessed ${recordCount} ${resourceType} records`,
      timestamp: new Date()
    });
  }

  /**
   * Log XSS attempt
   */
  static async logXSSAttempt(
    ipAddress: string,
    payload: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.XSS_ATTEMPT,
      ipAddress,
      userAgent,
      severity: EventSeverity.CRITICAL,
      details: `XSS payload detected: ${payload.substring(0, 100)}...`,
      timestamp: new Date()
    });
  }

  /**
   * Log SQL injection attempt
   */
  static async logSQLInjectionAttempt(
    ipAddress: string,
    payload: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.SQL_INJECTION_ATTEMPT,
      ipAddress,
      userAgent,
      severity: EventSeverity.CRITICAL,
      details: `SQL injection attempt: ${payload.substring(0, 100)}...`,
      timestamp: new Date()
    });
  }

  /**
   * Alert on critical security events
   */
  private static alertCriticalEvent(event: SecurityEvent): void {
    console.error('[SECURITY_ALERT]', {
      type: event.eventType,
      severity: 'CRITICAL',
      ip: event.ipAddress,
      time: event.timestamp,
      details: event.details
    });

    // TODO: Implement email/SMS alerts to security team
    // TODO: Send to centralized logging system (Datadog, ELK, etc.)
  }

  /**
   * Query suspicious events
   */
  static async getSuspiciousEvents(
    tenantId: number,
    hoursBack: number = 24
  ): Promise<any[]> {
    const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    return prisma.securityEvent.findMany({
      where: {
        tenantId,
        timestamp: { gte: timeThreshold },
        OR: [
          { status: { in: ['WARNING', 'CRITICAL', 'FAILURE'] } },
          {
            action: {
              in: [
                SecurityEventType.LOGIN_FAILED,
                SecurityEventType.LOGIN_BRUTE_FORCE,
                SecurityEventType.UNAUTHORIZED_ACCESS,
                SecurityEventType.CROSS_TENANT_ACCESS_ATTEMPT,
                SecurityEventType.XSS_ATTEMPT,
                SecurityEventType.SQL_INJECTION_ATTEMPT
              ]
            }
          }
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
  }
}
