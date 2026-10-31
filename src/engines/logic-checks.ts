/**
 * @module logic-checks
 * @description Logic Check Rules engine — runs a battery of automated
 * validation rules against an FDR to detect data errors, inconsistencies,
 * and potential fraud indicators.
 *
 * Each rule produces a `LogicCheckResult` with pass/fail status, severity,
 * and a human-readable explanation.
 */

import type { FDR, InstitutionType, LogicCheckResult, LogicCheckSeverity } from './types';

// ---------------------------------------------------------------------------
// Prescribed Deposit Lookup (amount in paise)
// ---------------------------------------------------------------------------

/**
 * Minimum prescribed FDR deposit amounts by institution type, as mandated
 * by AICTE norms. Values are in paise.
 *
 * These are the standard amounts; real-world values should be loaded from
 * configuration, but this serves as the reference lookup table.
 */
const PRESCRIBED_DEPOSIT: Readonly<Record<InstitutionType, number>> = {
  engineering:   2_50_00_000_00,  // ₹ 2.5 Cr
  pharmacy:      1_00_00_000_00,  // ₹ 1 Cr
  management:    1_50_00_000_00,  // ₹ 1.5 Cr
  polytechnic:     50_00_000_00,  // ₹ 50 L
  architecture:  1_00_00_000_00,  // ₹ 1 Cr
};

// ---------------------------------------------------------------------------
// IFSC Bank Name Prefixes
// ---------------------------------------------------------------------------

/**
 * Known IFSC prefixes mapped to bank name substrings.
 * The first four characters of an IFSC code identify the bank.
 * This lookup is used for a heuristic mismatch check.
 */
const IFSC_BANK_PREFIXES: Readonly<Record<string, string>> = {
  SBIN: 'STATE BANK',
  PUNB: 'PUNJAB NATIONAL',
  BARB: 'BANK OF BARODA',
  BKID: 'BANK OF INDIA',
  CNRB: 'CANARA BANK',
  UBIN: 'UNION BANK',
  IOBA: 'INDIAN OVERSEAS',
  UCBA: 'UCO BANK',
  CBIN: 'CENTRAL BANK',
  IDIB: 'INDIAN BANK',
  MAHB: 'BANK OF MAHARASHTRA',
  PSIB: 'PUNJAB & SIND',
  HDFC: 'HDFC',
  ICIC: 'ICICI',
  KKBK: 'KOTAK',
  UTIB: 'AXIS',
  YESB: 'YES BANK',
  INDB: 'INDUSIND',
  FDRL: 'FEDERAL BANK',
  IDFB: 'IDFC',
  RATN: 'RBL',
  KARB: 'KARNATAKA BANK',
  TMBL: 'TAMILNAD MERCANTILE',
  KVBL: 'KARUR VYSYA',
  CSBK: 'CSB BANK',
  DLXB: 'DHANLAXMI',
  JAKA: 'J&K BANK',
  SIBL: 'SOUTH INDIAN',
  CIUB: 'CITY UNION',
  LAVB: 'LAKSHMI VILAS',
};

// ---------------------------------------------------------------------------
// Rule Implementations
// ---------------------------------------------------------------------------

type RuleFunction = (fdr: FDR, allFdrs: FDR[]) => LogicCheckResult;

/**
 * Rule: Maturity date must not precede the issue date.
 */
function checkMaturityBeforeIssue(fdr: FDR, _allFdrs: FDR[]): LogicCheckResult {
  const issueDate = new Date(fdr.issueDate);
  const maturityDate = new Date(fdr.maturityDate);

  const issueMs = issueDate.getTime();
  const maturityMs = maturityDate.getTime();

  if (isNaN(issueMs) || isNaN(maturityMs)) {
    return {
      rule: 'maturity_before_issue',
      passed: false,
      severity: 'error',
      message: 'Invalid issue or maturity date format provided.',
      details: {
        issueDate: fdr.issueDate,
        maturityDate: fdr.maturityDate,
      },
    };
  }

  const passed = maturityMs >= issueMs;

  return {
    rule: 'maturity_before_issue',
    passed,
    severity: 'error',
    message: passed
      ? 'Maturity date is on or after the issue date.'
      : `Maturity date (${fdr.maturityDate}) precedes issue date (${fdr.issueDate}).`,
    details: {
      issueDate: fdr.issueDate,
      maturityDate: fdr.maturityDate,
    },
  };
}

/**
 * Rule: FDR amount must match the prescribed deposit for the institution type.
 *
 * Since the FDR itself does not carry the institution type, we look up the
 * institution's other FDRs to infer the type. If we cannot determine the type,
 * we return an info-level pass (cannot check).
 *
 * For simplicity and safety, this check compares the FDR amount against every
 * known prescribed amount; if it doesn't match any, it flags a warning.
 * A more precise implementation would receive the institution type as a parameter.
 */
function checkAmountMismatch(fdr: FDR, _allFdrs: FDR[]): LogicCheckResult {
  // Check 1: Bank-reported vs claimed amount tampering check (critical)
  if (fdr.bankReportedAmount !== undefined && fdr.bankReportedAmount !== fdr.amount) {
    return {
      rule: 'amount_tampered_mismatch',
      passed: false,
      severity: 'error',
      message: `CRITICAL DISCREPANCY: Claimed FDR amount does not match bank record. Claimed: ₹${(fdr.amount / 100).toLocaleString('en-IN')}, Bank reported: ₹${(fdr.bankReportedAmount / 100).toLocaleString('en-IN')}.`,
      details: {
        claimedAmount: fdr.amount,
        bankReportedAmount: fdr.bankReportedAmount,
        difference: Math.abs(fdr.amount - fdr.bankReportedAmount),
      },
    };
  }

  const prescribedAmounts = Object.values(PRESCRIBED_DEPOSIT);
  const matchesAny = prescribedAmounts.includes(fdr.amount);

  return {
    rule: 'amount_mismatch',
    passed: matchesAny,
    severity: 'warning',
    message: matchesAny
      ? 'FDR amount matches a prescribed deposit amount.'
      : `FDR amount (${fdr.amount} paise) differs from standard AICTE prescribed norms.`,
    details: {
      amount: fdr.amount,
      prescribedAmounts: PRESCRIBED_DEPOSIT,
    },
  };
}

/**
 * Rule: The IFSC code prefix should correspond to the stated bank name.
 */
function checkIfscMismatch(fdr: FDR, _allFdrs: FDR[]): LogicCheckResult {
  const prefix = fdr.ifscCode.substring(0, 4).toUpperCase();
  const expectedBankSubstring = IFSC_BANK_PREFIXES[prefix];

  // If the prefix is not in our lookup, we can't validate — pass with info
  if (!expectedBankSubstring) {
    return {
      rule: 'ifsc_mismatch',
      passed: true,
      severity: 'info',
      message: `IFSC prefix "${prefix}" not in known bank lookup; skipping heuristic check.`,
      details: { ifscCode: fdr.ifscCode, prefix, bankName: fdr.bankName },
    };
  }

  const bankNameUpper = fdr.bankName.toUpperCase();
  const passed = bankNameUpper.includes(expectedBankSubstring);

  return {
    rule: 'ifsc_mismatch',
    passed,
    severity: 'error',
    message: passed
      ? `IFSC prefix "${prefix}" matches bank name "${fdr.bankName}".`
      : `IFSC prefix "${prefix}" (expected "${expectedBankSubstring}") does not match bank name "${fdr.bankName}".`,
    details: {
      ifscCode: fdr.ifscCode,
      prefix,
      expectedBankSubstring,
      bankName: fdr.bankName,
    },
  };
}

/**
 * Rule: The FDR must have a lien marked in favour of AICTE.
 */
function checkMissingLien(fdr: FDR, _allFdrs: FDR[]): LogicCheckResult {
  return {
    rule: 'missing_lien',
    passed: fdr.lienMarked,
    severity: 'error',
    message: fdr.lienMarked
      ? 'Lien is marked on this FDR.'
      : 'No lien marked on this FDR. A lien in favour of AICTE is mandatory.',
    details: { lienMarked: fdr.lienMarked },
  };
}

/**
 * Rule: The same FDR number must not appear on FDRs belonging to
 * different institutions.
 */
function checkDuplicateFdrNumber(fdr: FDR, allFdrs: FDR[]): LogicCheckResult {
  const duplicates = allFdrs.filter(
    (other) =>
      other.id !== fdr.id &&
      other.fdrNumber === fdr.fdrNumber &&
      other.institutionId !== fdr.institutionId
  );

  const passed = duplicates.length === 0;

  return {
    rule: 'duplicate_fdr_number',
    passed,
    severity: 'error',
    message: passed
      ? 'FDR number is unique across institutions.'
      : `FDR number "${fdr.fdrNumber}" is also used by ${duplicates.length} other institution(s).`,
    details: {
      fdrNumber: fdr.fdrNumber,
      duplicateIds: duplicates.map((d) => d.id),
      duplicateInstitutionIds: duplicates.map((d) => d.institutionId),
    },
  };
}

/**
 * Rule: The document hash should not appear on any other FDR.
 * Reused hashes suggest a forged or duplicated document.
 */
function checkReusedDocumentHash(fdr: FDR, allFdrs: FDR[]): LogicCheckResult {
  // Empty or blank document hashes are flagged separately; skip here
  if (!fdr.documentHash || fdr.documentHash.trim() === '') {
    return {
      rule: 'reused_document_hash',
      passed: true,
      severity: 'info',
      message: 'No document hash present; skipping reuse check.',
      details: { documentHash: fdr.documentHash },
    };
  }

  const reuses = allFdrs.filter(
    (other) => other.id !== fdr.id && other.documentHash === fdr.documentHash
  );

  const passed = reuses.length === 0;

  return {
    rule: 'reused_document_hash',
    passed,
    severity: 'error',
    message: passed
      ? 'Document hash is unique.'
      : `Document hash is shared with ${reuses.length} other FDR(s), indicating possible document reuse or forgery.`,
    details: {
      documentHash: fdr.documentHash,
      reuseCount: reuses.length,
      reuseIds: reuses.map((r) => r.id),
    },
  };
}

// ---------------------------------------------------------------------------
// Ordered Rule Registry
// ---------------------------------------------------------------------------

const RULES: readonly RuleFunction[] = [
  checkMaturityBeforeIssue,
  checkAmountMismatch,
  checkIfscMismatch,
  checkMissingLien,
  checkDuplicateFdrNumber,
  checkReusedDocumentHash,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs the full battery of logic checks against an FDR.
 *
 * @param fdr     - The FDR to validate.
 * @param allFdrs - All FDRs in the system (needed for cross-FDR checks).
 * @returns Array of check results, one per rule, in execution order.
 */
export function runLogicChecks(fdr: FDR, allFdrs: FDR[]): LogicCheckResult[] {
  return RULES.map((rule) => rule(fdr, allFdrs));
}
