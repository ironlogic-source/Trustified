/**
 * @module escalation
 * @description Escalation ladder and alert engine for FDR-Kavach.
 * Recomputes expiry warnings and fires the 90/60/30/15/7-day escalation ladder
 * based on the simulated clock date.
 */

import type { FDR, Institution, Alert, AlertType } from './types';

export interface EscalationTier {
  thresholdDays: number;
  type: AlertType;
  severity: 'info' | 'caution' | 'warning' | 'critical';
  stageName: string;
  recipients: string[];
  channels: string[];
  actionRequired: string;
}

export const ESCALATION_TIERS: readonly EscalationTier[] = [
  {
    thresholdDays: 90,
    type: 'expiry_90',
    severity: 'info',
    stageName: 'Initial Expiry Advisory',
    recipients: ['Institution Nodal Officer'],
    channels: ['Email', 'Portal Notification'],
    actionRequired: 'Review renewal documents and initiate bank verification request.',
  },
  {
    thresholdDays: 60,
    type: 'expiry_60',
    severity: 'caution',
    stageName: 'First Bureau Reminder',
    recipients: ['Institution Nodal Officer', 'Bureau Scrutiny Officer'],
    channels: ['Email', 'SMS', 'Portal Notification'],
    actionRequired: 'Submit renewal advice or deposit replacement instrument.',
  },
  {
    thresholdDays: 30,
    type: 'expiry_30',
    severity: 'warning',
    stageName: 'Regional Escalation',
    recipients: ['Institution Nodal Officer', 'Bureau Scrutiny Officer', 'AICTE Regional Officer'],
    channels: ['Email', 'SMS', 'WhatsApp', 'Portal Notification'],
    actionRequired: 'Urgent renewal required. Non-renewal will trigger regulatory freeze notice.',
  },
  {
    thresholdDays: 15,
    type: 'expiry_15',
    severity: 'warning',
    stageName: 'Urgent Regulatory Notice',
    recipients: ['Institution Nodal Officer', 'Bureau Scrutiny Officer', 'AICTE Regional Officer'],
    channels: ['Email', 'SMS', 'WhatsApp', 'Portal Notice'],
    actionRequired: 'Show cause notice pending for non-compliance with FDR maintenance norms.',
  },
  {
    thresholdDays: 7,
    type: 'expiry_7',
    severity: 'critical',
    stageName: 'Bureau Head Executive Intervention',
    recipients: ['Institution Head', 'AICTE Regional Officer', 'Regulation Bureau Head', 'Council Secretary'],
    channels: ['Urgent SMS', 'WhatsApp', 'Direct Postal Notice', 'Portal Executive Banner'],
    actionRequired: 'Imminent encashment order under AICTE lien enforcement protocol.',
  },
] as const;

/**
 * Calculates calendar days between two ISO date strings (target - current).
 */
export function getDaysDifference(currentDate: string, targetDate: string): number {
  const current = new Date(currentDate.split('T')[0] ?? currentDate);
  const target = new Date(targetDate.split('T')[0] ?? targetDate);
  const diffTime = target.getTime() - current.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determines the escalation tier for an FDR based on days until maturity.
 */
export function getEscalationLevel(daysToMaturity: number): EscalationTier | null {
  if (daysToMaturity < 0) {
    // Already matured
    return {
      thresholdDays: 0,
      type: 'expiry_7',
      severity: 'critical',
      stageName: 'FDR Matured & Encashment Default',
      recipients: ['Regulation Bureau Head', 'AICTE Legal Cell', 'Institution Head'],
      channels: ['Urgent Legal Notice', 'Portal Executive Banner'],
      actionRequired: 'Immediate lien invocation and institution show cause proceeding.',
    };
  }

  // Find the tightest threshold that applies
  // E.g. if 5 days remain, it hits 7 days tier
  if (daysToMaturity <= 7) return ESCALATION_TIERS[4] ?? null;
  if (daysToMaturity <= 15) return ESCALATION_TIERS[3] ?? null;
  if (daysToMaturity <= 30) return ESCALATION_TIERS[2] ?? null;
  if (daysToMaturity <= 60) return ESCALATION_TIERS[1] ?? null;
  if (daysToMaturity <= 90) return ESCALATION_TIERS[0] ?? null;

  return null;
}

/**
 * Computes all active escalation alerts across the portfolio for a given "today" date.
 */
export function computeAlerts(
  fdrs: FDR[],
  institutions: Institution[],
  currentDate: string,
): Alert[] {
  const instMap = new Map(institutions.map((i) => [i.id, i]));
  const alerts: Alert[] = [];

  for (const fdr of fdrs) {
    // Only active or expiring FDRs generate maturity alerts
    if (fdr.status === 'released' || fdr.status === 'rejected') continue;

    const daysRemaining = getDaysDifference(currentDate, fdr.maturityDate);
    const tier = getEscalationLevel(daysRemaining);

    if (tier) {
      const inst = instMap.get(fdr.institutionId);
      const instName = inst ? inst.name : (fdr.institutionName ?? fdr.institutionId);
      const state = inst ? inst.state : '';

      alerts.push({
        id: `ALT-${fdr.id}-${tier.type}`,
        fdrId: fdr.id,
        institutionId: fdr.institutionId,
        type: tier.type,
        severity: tier.severity,
        message: `${tier.stageName}: FDR ${fdr.fdrNumber} (${instName}) matures in ${daysRemaining} day(s). Action: ${tier.actionRequired}`,
        recipients: [...tier.recipients, inst ? `${inst.nodalOfficer} (${inst.email})` : 'Nodal Officer'],
        channels: tier.channels,
        createdAt: new Date().toISOString(),
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
      });
    }
  }

  // Sort by urgency: least days remaining first
  return alerts.sort((a, b) => {
    const fdrA = fdrs.find((f) => f.id === a.fdrId);
    const fdrB = fdrs.find((f) => f.id === b.fdrId);
    const daysA = fdrA ? getDaysDifference(currentDate, fdrA.maturityDate) : 999;
    const daysB = fdrB ? getDaysDifference(currentDate, fdrB.maturityDate) : 999;
    return daysA - daysB;
  });
}
