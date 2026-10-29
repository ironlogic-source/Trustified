/**
 * @module trust-tier
 * @description Trust Tier Engine — computes, aggregates, and reports on the
 * progressive verification tiers of FDRs.
 *
 * Trust tiers map to FDR lifecycle stages:
 * - `submitted`         — FDR has been submitted but not yet validated
 * - `system_validated`  — Passed automated logic checks / under scrutiny
 * - `officer_verified`  — An officer has approved the FDR
 * - `bank_confirmed`    — The issuing bank has confirmed the FDR's authenticity
 */

import type { FDR, FDRStatus, TrustTier } from './types';

// ---------------------------------------------------------------------------
// Status → Trust Tier Mapping
// ---------------------------------------------------------------------------

/**
 * Maps every FDR status to its corresponding trust tier.
 *
 * Logic:
 * - submitted, rejected, discrepancy → `submitted`
 * - under_scrutiny, renewal_pending  → `system_validated`
 * - verified, renewed               → `officer_verified`
 * - active, expiring, matured, release_requested, released → `bank_confirmed`
 */
const STATUS_TO_TIER: Readonly<Record<FDRStatus, TrustTier>> = {
  submitted:          'submitted',
  rejected:           'submitted',
  discrepancy:        'submitted',
  under_scrutiny:     'system_validated',
  renewal_pending:    'system_validated',
  verified:           'officer_verified',
  renewed:            'officer_verified',
  active:             'bank_confirmed',
  expiring:           'bank_confirmed',
  matured:            'bank_confirmed',
  release_requested:  'bank_confirmed',
  released:           'bank_confirmed',
};

// ---------------------------------------------------------------------------
// Tier Metadata
// ---------------------------------------------------------------------------

const TIER_LABELS: Readonly<Record<TrustTier, string>> = {
  submitted:        'Submitted',
  system_validated: 'System Validated',
  officer_verified: 'Officer Verified',
  bank_confirmed:   'Bank Confirmed',
};

const TIER_PROGRESS: Readonly<Record<TrustTier, number>> = {
  submitted:        0,
  system_validated: 33,
  officer_verified: 66,
  bank_confirmed:   100,
};

// ---------------------------------------------------------------------------
// Terminal / non-counting statuses
// ---------------------------------------------------------------------------

/** Statuses that should NOT be counted towards claimed amounts. */
const EXCLUDED_FROM_CLAIMED: ReadonlySet<FDRStatus> = new Set([
  'rejected',
  'released',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derives the trust tier for a given FDR based on its current status.
 *
 * @param fdr - The FDR to evaluate.
 * @returns The trust tier.
 */
export function computeTrustTier(fdr: FDR): TrustTier {
  return STATUS_TO_TIER[fdr.status];
}

/**
 * Returns a human-readable label for a trust tier.
 *
 * @param tier - The trust tier.
 * @returns Display label.
 */
export function getTierLabel(tier: TrustTier): string {
  return TIER_LABELS[tier];
}

/**
 * Returns a progress percentage (0–100) for a trust tier.
 *
 * @param tier - The trust tier.
 * @returns Progress value.
 */
export function getTierProgress(tier: TrustTier): number {
  return TIER_PROGRESS[tier];
}

/**
 * Aggregates a list of FDRs by trust tier, returning count and total amount
 * for each tier that has at least one FDR.
 *
 * @param fdrs - Array of FDRs to aggregate.
 * @returns Array of tier summary objects, one per tier with FDRs present.
 */
export function aggregateTrustTiers(
  fdrs: FDR[],
): { tier: TrustTier; count: number; totalAmount: number }[] {
  const buckets = new Map<TrustTier, { count: number; totalAmount: number }>();

  for (const fdr of fdrs) {
    const tier = computeTrustTier(fdr);
    const existing = buckets.get(tier);
    if (existing) {
      existing.count += 1;
      existing.totalAmount += fdr.amount;
    } else {
      buckets.set(tier, { count: 1, totalAmount: fdr.amount });
    }
  }

  // Return in progression order
  const order: TrustTier[] = ['submitted', 'system_validated', 'officer_verified', 'bank_confirmed'];
  const results: { tier: TrustTier; count: number; totalAmount: number }[] = [];

  for (const tier of order) {
    const bucket = buckets.get(tier);
    if (bucket) {
      results.push({ tier, count: bucket.count, totalAmount: bucket.totalAmount });
    }
  }

  return results;
}

/**
 * Computes the total amount (in paise) of FDRs that have reached the
 * `bank_confirmed` trust tier. Only bank-confirmed FDRs are considered
 * genuinely secured.
 *
 * @param fdrs - Array of FDRs to evaluate.
 * @returns Total secured amount in paise.
 */
export function getSecuredAmount(fdrs: FDR[]): number {
  let total = 0;
  for (const fdr of fdrs) {
    if (computeTrustTier(fdr) === 'bank_confirmed') {
      total += fdr.amount;
    }
  }
  return total;
}

/**
 * Computes the total amount (in paise) of all FDRs that are not in a terminal
 * excluded state (rejected or released). This represents the total amount
 * claimed by the institution.
 *
 * @param fdrs - Array of FDRs to evaluate.
 * @returns Total claimed amount in paise.
 */
export function getClaimedAmount(fdrs: FDR[]): number {
  let total = 0;
  for (const fdr of fdrs) {
    if (!EXCLUDED_FROM_CLAIMED.has(fdr.status)) {
      total += fdr.amount;
    }
  }
  return total;
}
