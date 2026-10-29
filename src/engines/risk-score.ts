/**
 * @module risk-score
 * @description Institution Risk Score Engine — computes a composite risk score
 * (0–100) for an institution based on weighted factors derived from its FDR
 * portfolio and compliance history.
 *
 * Weight allocation (total = 100):
 * | Factor                    | Weight |
 * |---------------------------|--------|
 * | Trust tier of FDRs        |   25   |
 * | Logic-check failures      |   20   |
 * | Document reuse flags      |   15   |
 * | Renewal compliance        |   15   |
 * | Historical discrepancies  |   10   |
 * | FDR concentration risk    |   10   |
 * | Data completeness         |    5   |
 */

import type { FDR, Institution, RiskFactor } from './types';
import { computeTrustTier } from './trust-tier';
import { runLogicChecks } from './logic-checks';

// ---------------------------------------------------------------------------
// Risk Bands
// ---------------------------------------------------------------------------

/**
 * Returns the risk band label for a given score.
 *
 * | Range  | Band     | Colour |
 * |--------|----------|--------|
 * | 0–30   | low      | green  |
 * | 31–60  | moderate | ochre  |
 * | 61–100 | high     | brick  |
 *
 * @param score - Risk score (0–100).
 * @returns Risk band label.
 */
export function getRiskBand(score: number): 'low' | 'moderate' | 'high' {
  if (score <= 30) return 'low';
  if (score <= 60) return 'moderate';
  return 'high';
}

// ---------------------------------------------------------------------------
// Factor Computation Helpers
// ---------------------------------------------------------------------------

/**
 * Factor 1: Trust tier of FDRs (weight 25).
 *
 * Higher tiers = lower risk. Scoring:
 * - bank_confirmed  → 0 (no risk contribution)
 * - officer_verified → 0.33
 * - system_validated → 0.66
 * - submitted        → 1.0
 *
 * Score = average risk across all FDRs × maxScore.
 */
function scoreTrustTier(fdrs: FDR[]): RiskFactor {
  const weight = 25;
  const maxScore = 100;

  if (fdrs.length === 0) {
    return {
      name: 'trust_tier',
      weight,
      score: maxScore, // No FDRs = maximum uncertainty
      maxScore,
      description: 'No FDRs on file; trust tier cannot be assessed.',
    };
  }

  const tierRisk: Record<string, number> = {
    bank_confirmed: 0,
    officer_verified: 0.33,
    system_validated: 0.66,
    submitted: 1.0,
  };

  let totalRisk = 0;
  for (const fdr of fdrs) {
    const tier = computeTrustTier(fdr);
    totalRisk += tierRisk[tier] ?? 1.0;
  }

  const avgRisk = totalRisk / fdrs.length;
  const score = Math.round(avgRisk * maxScore);

  return {
    name: 'trust_tier',
    weight,
    score,
    maxScore,
    description: `Average trust-tier risk across ${fdrs.length} FDR(s).`,
  };
}

/**
 * Factor 2: Logic-check failures (weight 20).
 *
 * Runs logic checks on every FDR and counts total failures.
 * Score scales linearly with the failure ratio (failures / total checks).
 */
function scoreLogicCheckFailures(fdrs: FDR[], allFdrs: FDR[]): RiskFactor {
  const weight = 20;
  const maxScore = 100;

  if (fdrs.length === 0) {
    return {
      name: 'logic_check_failures',
      weight,
      score: 0,
      maxScore,
      description: 'No FDRs to run logic checks on.',
    };
  }

  let totalChecks = 0;
  let totalFailures = 0;

  for (const fdr of fdrs) {
    const results = runLogicChecks(fdr, allFdrs);
    totalChecks += results.length;
    totalFailures += results.filter((r) => !r.passed).length;
  }

  const failureRatio = totalChecks > 0 ? totalFailures / totalChecks : 0;
  const score = Math.round(failureRatio * maxScore);

  return {
    name: 'logic_check_failures',
    weight,
    score,
    maxScore,
    description: `${totalFailures} failure(s) out of ${totalChecks} logic check(s).`,
  };
}

/**
 * Factor 3: Document reuse flags (weight 15).
 *
 * Counts FDRs whose document hash appears on at least one other FDR
 * (cross-institution or not). Higher reuse = higher risk.
 */
function scoreDocumentReuse(fdrs: FDR[], allFdrs: FDR[]): RiskFactor {
  const weight = 15;
  const maxScore = 100;

  if (fdrs.length === 0) {
    return {
      name: 'document_reuse',
      weight,
      score: 0,
      maxScore,
      description: 'No FDRs to check for document reuse.',
    };
  }

  let reuseCount = 0;

  for (const fdr of fdrs) {
    if (!fdr.documentHash || fdr.documentHash.trim() === '') continue;

    const hasReuse = allFdrs.some(
      (other) => other.id !== fdr.id && other.documentHash === fdr.documentHash
    );
    if (hasReuse) {
      reuseCount += 1;
    }
  }

  const reuseRatio = reuseCount / fdrs.length;
  const score = Math.round(reuseRatio * maxScore);

  return {
    name: 'document_reuse',
    weight,
    score,
    maxScore,
    description: `${reuseCount} of ${fdrs.length} FDR(s) have reused document hashes.`,
  };
}

/**
 * Factor 4: Renewal compliance (weight 15).
 *
 * Checks how many FDRs in 'expiring' or 'matured' status have NOT been
 * renewed. Higher non-renewal = higher risk.
 */
function scoreRenewalCompliance(fdrs: FDR[]): RiskFactor {
  const weight = 15;
  const maxScore = 100;

  const renewalNeeded = fdrs.filter(
    (f) => f.status === 'expiring' || f.status === 'matured'
  );

  if (renewalNeeded.length === 0) {
    return {
      name: 'renewal_compliance',
      weight,
      score: 0,
      maxScore,
      description: 'No FDRs currently require renewal.',
    };
  }

  // FDRs that are expiring/matured and haven't entered renewal_pending or beyond
  // are considered non-compliant
  const nonCompliantCount = renewalNeeded.length;
  const ratio = nonCompliantCount / fdrs.length;
  const score = Math.round(Math.min(ratio * maxScore, maxScore));

  return {
    name: 'renewal_compliance',
    weight,
    score,
    maxScore,
    description: `${nonCompliantCount} FDR(s) expiring/matured without renewal action.`,
  };
}

/**
 * Factor 5: Historical discrepancies (weight 10).
 *
 * Counts FDRs that are currently in 'discrepancy' or 'rejected' status.
 */
function scoreHistoricalDiscrepancies(fdrs: FDR[]): RiskFactor {
  const weight = 10;
  const maxScore = 100;

  if (fdrs.length === 0) {
    return {
      name: 'historical_discrepancies',
      weight,
      score: 0,
      maxScore,
      description: 'No FDRs to evaluate discrepancy history.',
    };
  }

  const discrepancyCount = fdrs.filter(
    (f) => f.status === 'discrepancy' || f.status === 'rejected'
  ).length;

  const ratio = discrepancyCount / fdrs.length;
  const score = Math.round(ratio * maxScore);

  return {
    name: 'historical_discrepancies',
    weight,
    score,
    maxScore,
    description: `${discrepancyCount} of ${fdrs.length} FDR(s) have discrepancy or rejection history.`,
  };
}

/**
 * Factor 6: FDR concentration risk (weight 10).
 *
 * Measures how concentrated the institution's FDRs are across banks.
 * All FDRs from one bank = high concentration risk.
 * Uses a simple Herfindahl-Hirschman-style index.
 */
function scoreConcentrationRisk(fdrs: FDR[]): RiskFactor {
  const weight = 10;
  const maxScore = 100;

  if (fdrs.length <= 1) {
    return {
      name: 'concentration_risk',
      weight,
      score: fdrs.length === 1 ? maxScore : 0,
      maxScore,
      description:
        fdrs.length === 1
          ? 'Only one FDR — fully concentrated in a single bank.'
          : 'No FDRs to assess concentration.',
    };
  }

  // Count FDRs per bank
  const bankCounts = new Map<string, number>();
  for (const fdr of fdrs) {
    const key = fdr.bankName.toUpperCase();
    bankCounts.set(key, (bankCounts.get(key) ?? 0) + 1);
  }

  // HHI: sum of (share²) — ranges from 1/n (perfectly diverse) to 1 (single bank)
  let hhi = 0;
  for (const count of bankCounts.values()) {
    const share = count / fdrs.length;
    hhi += share * share;
  }

  // Normalise HHI: 0 = perfectly diverse, 1 = single bank
  // Minimum HHI = 1/n, so normalise to [0, 1]
  const n = bankCounts.size;
  const minHHI = 1 / n;
  const normalised = n > 1 ? (hhi - minHHI) / (1 - minHHI) : 1;
  const score = Math.round(normalised * maxScore);

  return {
    name: 'concentration_risk',
    weight,
    score,
    maxScore,
    description: `FDRs spread across ${n} bank(s). HHI-normalised concentration: ${(normalised * 100).toFixed(1)}%.`,
  };
}

/**
 * Factor 7: Data completeness (weight 5).
 *
 * Checks that key fields on the institution and its FDRs are populated.
 * Missing or empty fields increase the score.
 */
function scoreDataCompleteness(institution: Institution, fdrs: FDR[]): RiskFactor {
  const weight = 5;
  const maxScore = 100;

  let totalFields = 0;
  let missingFields = 0;

  // Institution-level fields
  const instFields = [
    institution.name,
    institution.aicteId,
    institution.state,
    institution.district,
    institution.nodalOfficer,
    institution.email,
    institution.phone,
  ];
  totalFields += instFields.length;
  missingFields += instFields.filter((f) => !f || f.trim() === '').length;

  // FDR-level fields
  for (const fdr of fdrs) {
    const fdrFields = [
      fdr.fdrNumber,
      fdr.bankName,
      fdr.branchName,
      fdr.ifscCode,
      fdr.issueDate,
      fdr.maturityDate,
      fdr.documentHash,
    ];
    totalFields += fdrFields.length;
    missingFields += fdrFields.filter((f) => !f || f.trim() === '').length;
  }

  const missingRatio = totalFields > 0 ? missingFields / totalFields : 0;
  const score = Math.round(missingRatio * maxScore);

  return {
    name: 'data_completeness',
    weight,
    score,
    maxScore,
    description: `${missingFields} of ${totalFields} field(s) are missing or empty.`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculates the composite risk score for an institution.
 *
 * The composite score is the weighted sum of individual factor scores,
 * normalised to the 0–100 range.
 *
 * @param institution - The institution to score.
 * @param fdrs        - FDRs belonging to this institution.
 * @param allFdrs     - All FDRs in the system (for cross-checks).
 * @returns Composite score and individual factor breakdowns.
 */
export function calculateRiskScore(
  institution: Institution,
  fdrs: FDR[],
  allFdrs: FDR[],
): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [
    scoreTrustTier(fdrs),
    scoreLogicCheckFailures(fdrs, allFdrs),
    scoreDocumentReuse(fdrs, allFdrs),
    scoreRenewalCompliance(fdrs),
    scoreHistoricalDiscrepancies(fdrs),
    scoreConcentrationRisk(fdrs),
    scoreDataCompleteness(institution, fdrs),
  ];

  // Weighted composite: Σ (factor.score / factor.maxScore × factor.weight)
  let composite = 0;
  for (const factor of factors) {
    composite += (factor.score / factor.maxScore) * factor.weight;
  }

  // The total weight sums to 100, so `composite` is already in [0, 100]
  const score = Math.round(Math.min(Math.max(composite, 0), 100));

  return { score, factors };
}
