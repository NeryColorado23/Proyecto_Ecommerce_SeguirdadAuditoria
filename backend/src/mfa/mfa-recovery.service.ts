import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../supabase/supabase.service.js';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I/L
const CODES_PER_BATCH = 10;
const SALT_ROUNDS = 10;

function generateRecoveryCode(): string {
  const chars = Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]);
  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
}

@Injectable()
export class MfaRecoveryService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Genera un nuevo lote de códigos, invalidando los anteriores del usuario. */
  async generateCodes(userId: string): Promise<string[]> {
    await this.supabase.client.from('mfa_recovery_codes').delete().eq('user_id', userId);

    const codes = Array.from({ length: CODES_PER_BATCH }, () => generateRecoveryCode());
    const rows = await Promise.all(
      codes.map(async (code) => ({
        user_id: userId,
        code_hash: await bcrypt.hash(code, SALT_ROUNDS),
      })),
    );

    const { error } = await this.supabase.client.from('mfa_recovery_codes').insert(rows);
    if (error) {
      throw error;
    }

    return codes;
  }

  /**
   * Valida un código de recuperación. Si es válido, lo marca como usado y
   * elimina los factores MFA del usuario (perdió el dispositivo
   * autenticador), obligándolo a configurar uno nuevo en su próximo acceso.
   */
  async consumeCode(userId: string, submittedCode: string): Promise<boolean> {
    const { data: rows, error } = await this.supabase.client
      .from('mfa_recovery_codes')
      .select('id, code_hash')
      .eq('user_id', userId)
      .is('used_at', null);

    if (error || !rows) {
      return false;
    }

    const normalized = submittedCode.trim().toUpperCase();
    let matchedId: string | null = null;

    for (const row of rows) {
      if (await bcrypt.compare(normalized, row['code_hash'])) {
        matchedId = row['id'];
        break;
      }
    }

    if (!matchedId) {
      return false;
    }

    await this.supabase.client
      .from('mfa_recovery_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', matchedId);

    await this.supabase.client.rpc('admin_delete_all_mfa_factors', { target_user_id: userId });

    return true;
  }
}
