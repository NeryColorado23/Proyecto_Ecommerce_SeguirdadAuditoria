import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface AuditEntry {
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly supabase: SupabaseService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.supabase.client.from('audit_log').insert({
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      ip_address: entry.ipAddress ?? null,
      metadata: entry.metadata ?? null,
    });
  }

  async list(limit = 50) {
    const { data, error } = await this.supabase.client
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }
    return data;
  }

  static extractIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }
}
