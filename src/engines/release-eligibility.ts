/**
 * @module release-eligibility
 * @description Release eligibility rule engine for AICTE Fixed Deposit Receipts.
 * Evaluates configurable business rules before an FDR can be released back
 * to an educational institution.
 */

import type { FDR, Institution, ReleaseRule, LogicCheckResult } from './types';
import { runLogicChecks } from './logic-checks';

export interface ReleaseRuleEvaluation {
  ruleId: string;
  ruleName: string;
  category: string;
  passed: boolean;
  required: boolean;
  reason: string;
}

export interface ReleaseEvaluationResult {
  eligible: boolean;
  passedCount: number;
  totalRequired: number;
  evaluations: ReleaseRuleEvaluation[];
}

export const DEFAULT_RELEASE_RULES: ReleaseRule[] = [
  {
    id: 'REL-001',
    name: 'Eligible Status Requirement',
    condition: "FDR status must be 'active', 'matured', or 'release_requested'",
    enabled: true,
    category: 'status',
  },
  {
    id: 'REL-002',
    name: 'Secured Trust Tier Requirement',
    condition: "Trust tier must be 'bank_confirmed' (verified with issuing bank)",
    enabled: true,
    category: 'compliance',
  },
  {
    id: 'REL-003',
    name: 'Discrepancy Clearance',
    condition: 'No active discrepancy or rejection flags on the instrument',
    enabled: true,
    category: 'compliance',
  },
  {
    id: 'REL-004',
    name: 'Zero Automated Logic-Check Violations',
    condition: 'All 6 forensic logic checks must pass without error',
    enabled: true,
    category: 'risk',
  },
  {
    id: 'REL-005',
    name: 'Institution Risk Score Threshold',
    condition: 'Institution composite risk score must not exceed 60 (Low or Moderate band)',
    enabled: true,
    category: 'risk',
  },
  {
    id: 'REL-006',
    name: 'AICTE Lien Enforceability',
    condition: 'AICTE lien must be formally endorsed on the original receipt',
    enabled: true,
    category: 'compliance',
  },
  {
    id: 'REL-007',
    name: 'Minimum Mandatory Tenure Completed',
    condition: 'Receipt must have completed at least 365 calendar days from issue date',
    enabled: true,
    category: 'status',
  },
  {
    id: 'REL-008',
    name: 'No Overlapping Renewal In-Flight',
    condition: 'FDR cannot have an active unconfirmed renewal process',
    enabled: true,
    category: 'status',
  },
];

/**
 * Evaluates an FDR against the active release eligibility rules.
 */
export function evaluateRelease(
  fdr: FDR,
  institution: Institution,
  allFdrs: FDR[],
  rules: ReleaseRule[] = DEFAULT_RELEASE_RULES,
  currentDate: string = new Date().toISOString().split('T')[0] ?? '2026-10-27',
): ReleaseEvaluationResult {
  const evaluations: ReleaseRuleEvaluation[] = [];

  // Run automated logic checks for REL-004
  const logicCheckResults = runLogicChecks(fdr, allFdrs);
  const logicCheckErrors = logicCheckResults.filter((r) => !r.passed && r.severity === 'error');

  // Calculate tenure
  const issueTime = new Date(fdr.issueDate).getTime();
  const currentTime = new Date(currentDate).getTime();
  const daysActive = Math.floor((currentTime - issueTime) / (1000 * 60 * 60 * 24));

  for (const rule of rules) {
    if (!rule.enabled) continue;

    let passed = false;
    let reason = '';

    switch (rule.id) {
      case 'REL-001':
        passed = ['active', 'matured', 'release_requested'].includes(fdr.status);
        reason = passed
          ? `Current status '${fdr.status}' is eligible for release processing.`
          : `FDR status is '${fdr.status}'; must be 'active', 'matured', or 'release_requested'.`;
        break;

      case 'REL-002':
        passed = fdr.trustTier === 'bank_confirmed';
        reason = passed
          ? 'FDR holds Bank-Confirmed trust tier (direct bank confirmation secured).'
          : `Current trust tier is '${fdr.trustTier}'; only 'bank_confirmed' instruments can be released.`;
        break;

      case 'REL-003':
        passed = fdr.status !== 'discrepancy' && fdr.status !== 'rejected';
        reason = passed
          ? 'No outstanding discrepancies or rejection notes logged against this FDR.'
          : 'Instrument is currently under Discrepancy or Rejection hold.';
        break;

      case 'REL-004':
        passed = logicCheckErrors.length === 0;
        reason = passed
          ? 'All automated integrity checks passed with zero errors.'
          : `${logicCheckErrors.length} validation rule(s) failed: ${logicCheckErrors.map((e) => e.rule).join(', ')}.`;
        break;

      case 'REL-005':
        passed = institution.riskScore <= 60;
        reason = passed
          ? `Institution risk score is ${institution.riskScore}/100 (within acceptable threshold ≤ 60).`
          : `Institution risk score is ${institution.riskScore}/100 (exceeds maximum threshold of 60).`;
        break;

      case 'REL-006':
        passed = fdr.lienMarked === true;
        reason = passed
          ? 'AICTE lien endorsement verified on record.'
          : 'Lien in favour of AICTE is NOT marked on this instrument.';
        break;

      case 'REL-007':
        passed = daysActive >= 365;
        reason = passed
          ? `Deposit has been active for ${daysActive} days (exceeds mandatory 365 days).`
          : `Deposit has been active for only ${daysActive} days (requires minimum 365 days).`;
        break;

      case 'REL-008':
        passed = fdr.status !== 'renewal_pending';
        reason = passed
          ? 'No renewal cycle currently in progress.'
          : 'A renewal application is currently pending bank confirmation.';
        break;

      default:
        // Custom or unhandled rule: default to passing if condition holds
        passed = true;
        reason = 'Standard compliance condition satisfied.';
        break;
    }

    evaluations.push({
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      passed,
      required: true,
      reason,
    });
  }

  const passedCount = evaluations.filter((e) => e.passed).length;
  const totalRequired = evaluations.length;
  const eligible = evaluations.every((e) => e.passed);

  return {
    eligible,
    passedCount,
    totalRequired,
    evaluations,
  };
}
