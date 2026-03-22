import { createAdminClient } from '@/lib/supabase/admin'

interface AuditParams {
  userId: string
  action: string
  tableName?: string
  recordId?: string
  details?: Record<string, unknown>
}

/**
 * Log an audit event for sensitive operations.
 * Uses admin client to bypass RLS for writing.
 * Fails silently to avoid blocking the main operation.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const adminClient = createAdminClient()
    await adminClient.from('audit_log').insert({
      user_id: params.userId,
      action: params.action,
      table_name: params.tableName || null,
      record_id: params.recordId || null,
      details: params.details || null,
    })
  } catch {
    // Audit logging should never block the main operation
  }
}
