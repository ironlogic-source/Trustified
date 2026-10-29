/**
 * @module state-machine
 * @description FDR lifecycle state machine with role-gated transitions.
 *
 * The state machine enforces the exact transition graph specified in the
 * FDR-Kavach plan. Every transition requires a valid (status, action) pair
 * AND the actor must hold a role that is permitted to execute the action.
 */

import type { FDR, FDRStatus, UserRole } from './types';

// ---------------------------------------------------------------------------
// Transition Map
// ---------------------------------------------------------------------------

/** A transition maps a (fromStatus, action) pair to a target status. */
interface Transition {
  readonly from: FDRStatus;
  readonly action: string;
  readonly to: FDRStatus;
}

/**
 * Canonical list of every valid state transition in the FDR lifecycle.
 * This is the single source of truth — every other function derives from it.
 */
const TRANSITIONS: readonly Transition[] = [
  { from: 'submitted',         action: 'assign_officer',              to: 'under_scrutiny' },
  { from: 'under_scrutiny',    action: 'officer_approve',             to: 'verified' },
  { from: 'under_scrutiny',    action: 'officer_flag',                to: 'discrepancy' },
  { from: 'under_scrutiny',    action: 'officer_reject',              to: 'rejected' },
  { from: 'discrepancy',       action: 'institution_respond',         to: 'under_scrutiny' },
  { from: 'discrepancy',       action: 'officer_reject',              to: 'rejected' },
  { from: 'verified',          action: 'bank_confirm',                to: 'active' },
  { from: 'active',            action: 'clock_trigger',               to: 'expiring' },
  { from: 'expiring',          action: 'institution_renew',           to: 'renewal_pending' },
  { from: 'renewal_pending',   action: 'officer_approve_renewal',     to: 'renewed' },
  { from: 'renewed',           action: 'bank_confirm_renewal',        to: 'active' },
  { from: 'active',            action: 'institution_request_release', to: 'release_requested' },
  { from: 'expiring',          action: 'institution_request_release', to: 'release_requested' },
  { from: 'release_requested', action: 'authority_approve',           to: 'released' },
  { from: 'active',            action: 'clock_trigger',               to: 'matured' },
  { from: 'expiring',          action: 'clock_trigger',               to: 'matured' },
] as const;

// ---------------------------------------------------------------------------
// Role → Action Mapping
// ---------------------------------------------------------------------------

/**
 * Maps each role to the set of actions it may perform.
 * The `admin` role is granted every action implicitly.
 */
const ROLE_ACTIONS: Readonly<Record<UserRole, readonly string[]>> = {
  institution:       ['institution_respond', 'institution_renew', 'institution_request_release'],
  scrutiny_officer:  ['assign_officer', 'officer_approve', 'officer_flag', 'officer_reject', 'officer_approve_renewal'],
  regional_officer:  ['officer_approve', 'officer_flag', 'officer_reject'],
  bank_verifier:     ['bank_confirm', 'bank_confirm_renewal'],
  authority:         ['authority_approve'],
  admin:             [], // handled specially — admin can do everything
} as const;

/** All distinct action names across all transitions. */
const ALL_ACTIONS: readonly string[] = Array.from(
  new Set(TRANSITIONS.map((t) => t.action))
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determines whether the given action is a valid transition from the given status.
 *
 * Note: For 'active' + 'clock_trigger', two target states exist (expiring & matured).
 * The function returns `true` if at least one matching transition exists.
 *
 * @param from   - Current FDR status.
 * @param action - The action to attempt.
 * @returns `true` if a transition exists for (from, action).
 */
export function canTransition(from: FDRStatus, action: string): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.action === action);
}

/**
 * Returns the target status for a (from, action) pair, or `null` if no
 * transition exists.
 *
 * When multiple transitions share the same (from, action) — currently only
 * `active` + `clock_trigger` — the *first* match in the canonical list is
 * returned. Callers that need to disambiguate (e.g. deciding between
 * `expiring` and `matured`) should use domain logic to pick the correct one.
 *
 * @param from   - Current FDR status.
 * @param action - The action to attempt.
 * @returns Target status, or `null`.
 */
export function getNextState(from: FDRStatus, action: string): FDRStatus | null {
  const match = TRANSITIONS.find((t) => t.from === from && t.action === action);
  return match ? match.to : null;
}

/**
 * Lists every action available to a given role in a given status.
 *
 * @param status - Current FDR status.
 * @param role   - The actor's role.
 * @returns Array of action strings the role may perform on an FDR in this status.
 */
export function getAvailableActions(status: FDRStatus, role: UserRole): string[] {
  const validActionsForStatus = TRANSITIONS
    .filter((t) => t.from === status)
    .map((t) => t.action);

  // Deduplicate (active + clock_trigger appears twice)
  const unique = Array.from(new Set(validActionsForStatus));

  if (role === 'admin') {
    return unique;
  }

  const permitted = ROLE_ACTIONS[role];
  return unique.filter((a) => permitted.includes(a));
}

/**
 * Attempts to transition an FDR to its next state.
 *
 * Returns a new FDR object (immutable update) together with a validity flag.
 * If the transition is invalid (wrong status, wrong role, or no matching
 * transition), the original FDR is returned unmodified with `valid: false`
 * and an error message.
 *
 * For `clock_trigger` on `active` status, the caller must determine whether
 * the FDR should move to `expiring` or `matured` based on the maturity date.
 * This function defaults to the first matching transition (`expiring`).
 * To force `matured`, use `transitionWithTarget` or set the action to
 * `clock_trigger` when the maturity date has passed (the function does not
 * inspect dates — it is a pure state machine).
 *
 * @param fdr    - The FDR to transition.
 * @param action - The action being performed.
 * @param actor  - The actor performing the action.
 * @returns Result object with the (possibly updated) FDR, validity flag, and optional error.
 */
export function transition(
  fdr: FDR,
  action: string,
  actor: { id: string; role: UserRole },
): { fdr: FDR; valid: boolean; error?: string } {
  // 1. Check role permission
  if (actor.role !== 'admin') {
    const permitted = ROLE_ACTIONS[actor.role];
    if (!permitted.includes(action)) {
      return {
        fdr,
        valid: false,
        error: `Role "${actor.role}" is not permitted to perform action "${action}".`,
      };
    }
  }

  // 2. Find matching transition
  const match = TRANSITIONS.find((t) => t.from === fdr.status && t.action === action);
  if (!match) {
    return {
      fdr,
      valid: false,
      error: `No valid transition from "${fdr.status}" via action "${action}".`,
    };
  }

  // 3. Produce the updated FDR
  const updatedFdr: FDR = {
    ...fdr,
    status: match.to,
    updatedAt: new Date().toISOString(),
  };

  return { fdr: updatedFdr, valid: true };
}
