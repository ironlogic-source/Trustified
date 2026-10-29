/**
 * @module formatters
 * @description Indian formatting utilities for currency, dates, IFSC codes, and hashes.
 * All monetary inputs are in paise (1 INR = 100 paise).
 */

// ---------------------------------------------------------------------------
// Currency Formatting
// ---------------------------------------------------------------------------

/**
 * Formats an amount in paise to INR with Indian digit grouping.
 * Indian grouping: last 3 digits, then groups of 2.
 * Example: 12500000000 paise → "₹ 12,50,00,000.00"
 *          125000000   paise → "₹ 1,25,00,000.00"
 *
 * @param paise - Amount in paise (integer).
 * @returns Formatted string with ₹ symbol and Indian grouping.
 */
export function formatINR(paise: number): string {
  const negative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const fractional = absPaise % 100;

  const rupeesStr = rupees.toString();
  const grouped = applyIndianGrouping(rupeesStr);
  const paiseStr = fractional.toString().padStart(2, '0');

  return `${negative ? '-' : ''}₹ ${grouped}.${paiseStr}`;
}

/**
 * Formats paise into crore notation.
 * 1 Crore = 10,000,000 rupees = 1,000,000,000 paise.
 * Example: 41260000000000 paise → "₹ 412.6 Cr"
 *
 * @param paise - Amount in paise (integer).
 * @returns Compact crore string.
 */
export function formatCrore(paise: number): string {
  const rupees = paise / 100;
  const crore = rupees / 1_00_00_000;
  const rounded = parseFloat(crore.toFixed(1));
  return `₹ ${rounded} Cr`;
}

/**
 * Formats paise into lakh notation.
 * 1 Lakh = 100,000 rupees = 10,000,000 paise.
 * Example: 52500000 paise → "₹ 5.25 L"
 *
 * @param paise - Amount in paise (integer).
 * @returns Compact lakh string.
 */
export function formatLakh(paise: number): string {
  const rupees = paise / 100;
  const lakh = rupees / 1_00_000;
  const rounded = parseFloat(lakh.toFixed(2));
  return `₹ ${rounded} L`;
}

/**
 * Automatically chooses the most readable compact format:
 * - >= 1 Cr  → crore notation
 * - >= 1 L   → lakh notation
 * - >= 1 K   → thousands notation
 * - otherwise → plain INR
 *
 * @param paise - Amount in paise (integer).
 * @returns Compact formatted string.
 */
export function formatCompact(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const sign = paise < 0 ? '-' : '';

  if (rupees >= 1_00_00_000) {
    // Crore
    const crore = rupees / 1_00_00_000;
    const rounded = parseFloat(crore.toFixed(1));
    return `${sign}₹ ${rounded} Cr`;
  }
  if (rupees >= 1_00_000) {
    // Lakh
    const lakh = rupees / 1_00_000;
    const rounded = parseFloat(lakh.toFixed(2));
    return `${sign}₹ ${rounded} L`;
  }
  if (rupees >= 1_000) {
    // Thousands
    const k = rupees / 1_000;
    const rounded = parseFloat(k.toFixed(1));
    return `${sign}₹ ${rounded} K`;
  }

  return formatINR(paise);
}

// ---------------------------------------------------------------------------
// Date Formatting
// ---------------------------------------------------------------------------

const MONTH_ABBR: readonly string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Formats an ISO 8601 date string to "DD MMM YYYY".
 * Example: "2026-03-15T00:00:00Z" → "15 Mar 2026"
 *
 * @param iso - ISO 8601 date string.
 * @returns Formatted date string.
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = MONTH_ABBR[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

// ---------------------------------------------------------------------------
// IFSC Formatting & Validation
// ---------------------------------------------------------------------------

/**
 * Validates and formats an IFSC code.
 * IFSC codes follow the pattern: 4 letters (bank) + 0 + 6 alphanumeric (branch).
 * Returns the uppercase code if valid, or throws on invalid input.
 *
 * @param code - Raw IFSC code string.
 * @returns Uppercase, validated IFSC code.
 * @throws Error if the code is not a valid IFSC format.
 */
export function formatIFSC(code: string): string {
  const trimmed = code.trim().toUpperCase();
  const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  if (!ifscPattern.test(trimmed)) {
    throw new Error(
      `Invalid IFSC code: "${code}". Expected format: 4 letters + "0" + 6 alphanumeric characters.`
    );
  }

  return trimmed;
}

// ---------------------------------------------------------------------------
// Hash Truncation
// ---------------------------------------------------------------------------

/**
 * Truncates a hash string for display, keeping a prefix and suffix separated
 * by an ellipsis.
 *
 * @param hash - Full hash string.
 * @param len  - Total visible character count (default 12).
 * @returns Truncated hash string, e.g. "a1b2c3…x7y8z9".
 */
export function truncateHash(hash: string, len: number = 12): string {
  if (hash.length <= len) {
    return hash;
  }
  const half = Math.floor(len / 2);
  return `${hash.slice(0, half)}…${hash.slice(-half)}`;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Applies Indian digit grouping to a whole-number string.
 * The rightmost 3 digits form the first group, then every 2 digits after that.
 *
 * @param numStr - Non-negative integer as a string.
 * @returns Grouped string.
 */
function applyIndianGrouping(numStr: string): string {
  if (numStr.length <= 3) {
    return numStr;
  }

  // Last 3 digits
  const last3 = numStr.slice(-3);
  let remaining = numStr.slice(0, -3);

  // Group remaining in pairs from the right
  const groups: string[] = [];
  while (remaining.length > 2) {
    groups.unshift(remaining.slice(-2));
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) {
    groups.unshift(remaining);
  }

  return `${groups.join(',')},${last3}`;
}
