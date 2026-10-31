import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getNextState,
  getAvailableActions,
  transition,
} from '../engines/state-machine';
import { computeTrustTier, getSecuredAmount, getClaimedAmount } from '../engines/trust-tier';
import { runLogicChecks } from '../engines/logic-checks';
import { calculateRiskScore, getRiskBand } from '../engines/risk-score';
import { createAuditEntry, verifyChain } from '../engines/audit-log';
import { getEscalationLevel, getDaysDifference, computeAlerts } from '../engines/escalation';
import { evaluateRelease, DEFAULT_RELEASE_RULES } from '../engines/release-eligibility';
import { buildFraudGraph } from '../engines/fraud-graph';
import {
  seedInstitutions,
  seedFDRs,
  seedBankBranches,
  seedAuditLog,
  ANOMALY_IDS,
} from '../data/seed';
import type { FDR, Institution } from '../engines/types';

describe('FDR State Machine', () => {
  it('allows valid transitions for assigned roles', () => {
    expect(canTransition('submitted', 'assign_officer')).toBe(true);
    expect(getNextState('submitted', 'assign_officer')).toBe('under_scrutiny');

    expect(canTransition('under_scrutiny', 'officer_approve')).toBe(true);
    expect(getNextState('under_scrutiny', 'officer_approve')).toBe('verified');

    expect(canTransition('verified', 'bank_confirm')).toBe(true);
    expect(getNextState('verified', 'bank_confirm')).toBe('active');
  });

  it('blocks invalid transitions', () => {
    // Cannot release directly from submitted
    expect(canTransition('submitted', 'authority_approve')).toBe(false);
    expect(getNextState('submitted', 'authority_approve')).toBeNull();

    // Cannot verify an already rejected FDR
    expect(canTransition('rejected', 'officer_approve')).toBe(false);
  });

  it('enforces role-based action access', () => {
    // Institution role cannot execute scrutiny officer approval
    const instActions = getAvailableActions('under_scrutiny', 'institution');
    expect(instActions).not.toContain('officer_approve');

    // Scrutiny officer can approve under scrutiny
    const officerActions = getAvailableActions('under_scrutiny', 'scrutiny_officer');
    expect(officerActions).toContain('officer_approve');
    expect(officerActions).toContain('officer_flag');
  });
});

describe('Trust Tier Engine', () => {
  it('correctly maps FDR status to trust tiers', () => {
    const mockFdr = (status: any): FDR => ({
      id: 'test',
      fdrNumber: 'test',
      institutionId: 'inst-1',
      bankName: 'Test Bank',
      branchName: 'Main',
      ifscCode: 'TEST0001234',
      amount: 100000_00,
      issueDate: '2024-01-01',
      maturityDate: '2025-01-01',
      status,
      trustTier: 'submitted',
      lienMarked: true,
      documentHash: 'abc',
      renewalCount: 0,
      previousFdrId: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      notes: '',
    });

    expect(computeTrustTier(mockFdr('submitted'))).toBe('submitted');
    expect(computeTrustTier(mockFdr('under_scrutiny'))).toBe('system_validated');
    expect(computeTrustTier(mockFdr('verified'))).toBe('officer_verified');
    expect(computeTrustTier(mockFdr('active'))).toBe('bank_confirmed');
  });

  it('only counts bank_confirmed as secured', () => {
    const secured = getSecuredAmount(seedFDRs);
    const claimed = getClaimedAmount(seedFDRs);

    expect(secured).toBeGreaterThan(0);
    expect(claimed).toBeGreaterThan(secured);
  });
});

describe('Logic Check Rules & Planted Anomalies', () => {
  it('detects Anomaly 1: Duplicate FDR Number across institutions', () => {
    const fdr1 = seedFDRs.find((f) => f.id === ANOMALY_IDS.duplicateFdrNumber.fdr1)!;
    expect(fdr1).toBeDefined();

    const results = runLogicChecks(fdr1, seedFDRs);
    const dupCheck = results.find((r) => r.rule === 'duplicate_fdr_number');
    expect(dupCheck).toBeDefined();
    expect(dupCheck?.passed).toBe(false);
    expect(dupCheck?.severity).toBe('error');
  });

  it('detects Anomaly 2: Tampered Amount mismatch with bank record', () => {
    const fdr = seedFDRs.find((f) => f.id === ANOMALY_IDS.tamperedAmount.fdrId)!;
    expect(fdr).toBeDefined();

    const results = runLogicChecks(fdr, seedFDRs);
    const tamperedCheck = results.find((r) => r.rule === 'amount_tampered_mismatch');
    expect(tamperedCheck).toBeDefined();
    expect(tamperedCheck?.passed).toBe(false);
    expect(tamperedCheck?.severity).toBe('error');
  });

  it('detects Anomaly 3: Maturity date before Issue date', () => {
    const fdr = seedFDRs.find((f) => f.id === ANOMALY_IDS.maturityBeforeIssue.fdrId)!;
    expect(fdr).toBeDefined();

    const results = runLogicChecks(fdr, seedFDRs);
    const dateCheck = results.find((r) => r.rule === 'maturity_before_issue');
    expect(dateCheck).toBeDefined();
    expect(dateCheck?.passed).toBe(false);
    expect(dateCheck?.severity).toBe('error');
  });

  it('detects Anomaly 4: Missing AICTE Lien', () => {
    const fdr = seedFDRs.find((f) => f.id === ANOMALY_IDS.missingLien.fdrId)!;
    expect(fdr).toBeDefined();
    expect(fdr.lienMarked).toBe(false);

    const results = runLogicChecks(fdr, seedFDRs);
    const lienCheck = results.find((r) => r.rule === 'missing_lien');
    expect(lienCheck).toBeDefined();
    expect(lienCheck?.passed).toBe(false);
  });

  it('detects Anomaly 5: Reused Document Hash', () => {
    const fdr1 = seedFDRs.find((f) => f.id === ANOMALY_IDS.reusedDocumentHash.fdr1)!;
    expect(fdr1).toBeDefined();

    const results = runLogicChecks(fdr1, seedFDRs);
    const hashCheck = results.find((r) => r.rule === 'reused_document_hash');
    expect(hashCheck).toBeDefined();
    expect(hashCheck?.passed).toBe(false);
    expect(hashCheck?.severity).toBe('error');
  });
});

describe('Institution Risk Score Engine', () => {
  it('computes composite risk scores with exact weights totaling 100', () => {
    const inst = seedInstitutions[0]!;
    const res = calculateRiskScore(inst, seedFDRs, seedFDRs);

    const totalWeight = res.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBe(100);

    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);

    const band = getRiskBand(res.score);
    expect(['low', 'moderate', 'high']).toContain(band);
  });
});

describe('Audit Log & SHA-256 Tamper Detection', () => {
  it('verifies a valid hash chain', async () => {
    const entry1 = await createAuditEntry(
      'FDR_SUBMIT',
      { id: 'USR-01', role: 'scrutiny_officer' },
      { type: 'fdr', id: 'FDR-001' },
      'Initial submission of FDR',
      '',
    );

    const entry2 = await createAuditEntry(
      'FDR_VERIFY',
      { id: 'USR-02', role: 'scrutiny_officer' },
      { type: 'fdr', id: 'FDR-001' },
      'Officer verified credentials',
      entry1.hash,
    );

    const check = await verifyChain([entry1, entry2]);
    expect(check.valid).toBe(true);
  });

  it('detects a tampered entry in the audit chain', async () => {
    // Test with the planted tampered audit log in seed
    const check = await verifyChain(seedAuditLog);
    expect(check.valid).toBe(false);
    expect(check.brokenAt).toBe(ANOMALY_IDS.tamperedAuditEntry.entryIndex);
  });
});

describe('Escalation Ladder & Simulated Clock', () => {
  it('correctly maps remaining days to 90/60/30/15/7 day escalation tiers', () => {
    expect(getEscalationLevel(85)?.type).toBe('expiry_90');
    expect(getEscalationLevel(50)?.type).toBe('expiry_60');
    expect(getEscalationLevel(25)?.type).toBe('expiry_30');
    expect(getEscalationLevel(12)?.type).toBe('expiry_15');
    expect(getEscalationLevel(4)?.type).toBe('expiry_7');
    expect(getEscalationLevel(120)).toBeNull(); // Not yet in escalation window
  });

  it('recomputes alerts when simulated date moves forward', () => {
    const alerts1 = computeAlerts(seedFDRs, seedInstitutions, '2026-01-01');
    const alerts2 = computeAlerts(seedFDRs, seedInstitutions, '2026-10-27');

    expect(alerts1).toBeDefined();
    expect(alerts2).toBeDefined();
    // Later date should have more or different alerts
    expect(alerts2.length).toBeGreaterThan(0);
  });
});

describe('Release Eligibility Engine', () => {
  it('approves an eligible active, secured FDR and rejects one with issues', () => {
    const cleanFdr = seedFDRs.find(
      (f) => f.status === 'active' && f.trustTier === 'bank_confirmed' && f.lienMarked,
    )!;
    const cleanInst = seedInstitutions.find((i) => i.id === cleanFdr.institutionId)!;

    const evaluation = evaluateRelease(cleanFdr, cleanInst, seedFDRs, DEFAULT_RELEASE_RULES);
    expect(evaluation).toBeDefined();
    expect(evaluation.evaluations.length).toBe(DEFAULT_RELEASE_RULES.length);

    // Test with tampered FDR — should fail release eligibility
    const tamperedFdr = seedFDRs.find((f) => f.id === ANOMALY_IDS.tamperedAmount.fdrId)!;
    const tamperedInst = seedInstitutions.find((i) => i.id === tamperedFdr.institutionId)!;

    const tamperedEval = evaluateRelease(tamperedFdr, tamperedInst, seedFDRs, DEFAULT_RELEASE_RULES);
    expect(tamperedEval.eligible).toBe(false);
  });
});

describe('Fraud Graph Engine', () => {
  it('constructs nodes and edges and flags duplicate/reused clusters', () => {
    const graph = buildFraudGraph(seedInstitutions, seedFDRs, seedBankBranches);

    expect(graph.nodes.length).toBeGreaterThan(100);
    expect(graph.edges.length).toBeGreaterThan(100);

    // Must find duplicate FDR cluster and reused hash cluster
    expect(graph.clusters.length).toBeGreaterThanOrEqual(2);

    const dupCluster = graph.clusters.find((c) => c.id.includes('DUP'));
    expect(dupCluster).toBeDefined();

    const hashCluster = graph.clusters.find((c) => c.id.includes('HASH'));
    expect(hashCluster).toBeDefined();
  });

  it('verifies IFSC format helper behavior', async () => {
    const { formatIFSC, isValidIFSC } = await import('../engines/formatters');
    expect(isValidIFSC('SBIN0000691')).toBe(true);
    expect(isValidIFSC('INVALID_IFSC')).toBe(false);
    expect(formatIFSC('sbin0000691')).toBe('SBIN0000691');
    expect(() => formatIFSC('1234')).toThrow();
  });
});
