/**
 * @module audit-log
 * @description Hash-chained audit log engine using SHA-256 via Web Crypto (`crypto.subtle`).
 *
 * Every audit entry's hash is computed as:
 *   SHA-256(previousHash + '|' + timestamp + '|' + action + '|' + actorId + '|' + entityId + '|' + details)
 *
 * This forms a tamper-evident chain: modifying any entry invalidates every
 * subsequent hash.
 */

import type { AuditLogEntry, UserRole } from './types';

export const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes SHA-256 hash using crypto.subtle (available in browser and Node 19+).
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(buffer);

  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Builds the canonical pre-image string for an audit entry's hash.
 */
export function buildPreImage(
  previousHash: string,
  timestamp: string,
  action: string,
  actorId: string,
  entityId: string,
  details: string,
): string {
  return `${previousHash}|${timestamp}|${action}|${actorId}|${entityId}|${details}`;
}

/**
 * Creates a new hash-chained audit log entry.
 */
export async function createAuditEntry(
  action: string,
  actor: { id: string; role: UserRole },
  entity: { type: string; id: string },
  details: string,
  previousHash: string = GENESIS_PREV_HASH,
): Promise<AuditLogEntry> {
  const timestamp = new Date().toISOString();
  const prev = previousHash || GENESIS_PREV_HASH;
  const preImage = buildPreImage(prev, timestamp, action, actor.id, entity.id, details);
  const hash = await sha256(preImage);
  const id = `AUD-${timestamp.replace(/[^\d]/g, '').slice(0, 14)}-${hash.slice(0, 6)}`;

  return {
    id,
    timestamp,
    action,
    actorId: actor.id,
    actorRole: actor.role,
    entityType: entity.type,
    entityId: entity.id,
    details,
    hash,
    previousHash: prev,
  };
}

/**
 * Verifies the integrity of a hash-chained audit log.
 * Walks the chain and flags any tampered entry.
 */
export async function verifyChain(
  entries: AuditLogEntry[],
): Promise<{ valid: boolean; brokenAt?: number; entry?: AuditLogEntry }> {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;

    // 1. Verify previousHash linkage
    if (i === 0) {
      if (entry.previousHash !== '' && entry.previousHash !== GENESIS_PREV_HASH) {
        return { valid: false, brokenAt: i, entry };
      }
    } else {
      const prevEntry = entries[i - 1];
      const expectedPreviousHash = prevEntry ? prevEntry.hash : '';
      if (entry.previousHash !== expectedPreviousHash) {
        return { valid: false, brokenAt: i, entry };
      }
    }

    // 2. Verify the entry's own hash
    const preImage = buildPreImage(
      entry.previousHash,
      entry.timestamp,
      entry.action,
      entry.actorId,
      entry.entityId,
      entry.details,
    );
    const expectedHash = await sha256(preImage);

    if (entry.hash !== expectedHash) {
      return { valid: false, brokenAt: i, entry };
    }
  }

  return { valid: true };
}
