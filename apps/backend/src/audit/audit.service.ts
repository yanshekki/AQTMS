import { Injectable, Logger } from '@nestjs/common';

interface AuditEvent {
  action: string;
  userId: string;
  details?: any;
  timestamp: Date;
  ip?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private events: AuditEvent[] = []; // In production, persist to DB or external system

  logEvent(action: string, userId: string, details?: any, ip?: string) {
    const event: AuditEvent = {
      action,
      userId,
      details,
      timestamp: new Date(),
      ip,
    };

    this.events.push(event);
    this.logger.log(`[AUDIT] ${action} | User: ${userId} | Details: ${JSON.stringify(details || {})}`);

    // In production: save to Prisma AuditLog model or send to SIEM
    // await this.prisma.auditLog.create({ data: event });
  }

  getRecentEvents(limit = 100): AuditEvent[] {
    return this.events.slice(-limit);
  }
}
