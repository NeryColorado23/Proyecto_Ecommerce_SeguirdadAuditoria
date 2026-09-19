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

export interface LoginLockStatus {
  locked: boolean;
  retryAfterSeconds: number;
}

// Umbral de bloqueo por cuenta: tras 5 intentos fallidos en 15 minutos, la
// cuenta queda bloqueada hasta 15 minutos después del último intento (el
// bloqueo se "extiende" si siguen llegando intentos fallidos mientras dura).
const LOCK_THRESHOLD = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

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

  /** Bloqueo por cuenta: N intentos fallidos recientes para el mismo correo. */
  async getLoginLockStatus(email: string): Promise<LoginLockStatus> {
    const cutoff = new Date(Date.now() - LOCK_WINDOW_MS).toISOString();

    const { data, error } = await this.supabase.client
      .from('audit_log')
      .select('created_at')
      .eq('action', 'login_failed')
      .eq('entity_id', email)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(LOCK_THRESHOLD);

    if (error || !data || data.length < LOCK_THRESHOLD) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    const mostRecentFailedAt = new Date(data[0]['created_at']).getTime();
    const retryAfterMs = mostRecentFailedAt + LOCK_WINDOW_MS - Date.now();

    if (retryAfterMs <= 0) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    return { locked: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  static extractIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }
}
