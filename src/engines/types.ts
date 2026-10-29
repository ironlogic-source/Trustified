/**
 * @module types
 * @description Shared type definitions for FDR-Kavach engine modules.
 * All monetary values are stored as integers in paise (1 INR = 100 paise).
 * All dates are stored as ISO 8601 strings.
 */

// ---------------------------------------------------------------------------
// FDR Status — Discriminated union of all lifecycle states
// ---------------------------------------------------------------------------

/** All valid states an FDR can be in during its lifecycle. */
export type FDRStatus =
  | 'submitted'
  | 'under_scrutiny'
  | 'verified'
  | 'active'
  | 'expiring'
  | 'renewal_pending'
  | 'renewed'
  | 'matured'
  | 'release_requested'
  | 'released'
  | 'discrepancy'
  | 'rejected';

// ---------------------------------------------------------------------------
// Trust Tiers — Progressive levels of verification confidence
// ---------------------------------------------------------------------------

/** Trust tiers represent the progressive confidence level of an FDR's authenticity. */
export type TrustTier =
  | 'submitted'
  | 'system_validated'
  | 'officer_verified'
  | 'bank_confirmed';

// ---------------------------------------------------------------------------
// User Roles
// ---------------------------------------------------------------------------

/** Platform roles that govern access and action permissions. */
export type UserRole =
  | 'institution'
  | 'scrutiny_officer'
  | 'regional_officer'
  | 'bank_verifier'
  | 'authority'
  | 'admin';

// ---------------------------------------------------------------------------
// Institution Type
// ---------------------------------------------------------------------------

/** AICTE-recognised institution categories. */
export type InstitutionType =
  | 'engineering'
  | 'pharmacy'
  | 'management'
  | 'polytechnic'
  | 'architecture';

// ---------------------------------------------------------------------------
// Core Entities
// ---------------------------------------------------------------------------

/** A Fixed Deposit Receipt tracked by the platform. */
export interface FDR {
  /** Unique internal identifier (UUID). */
  readonly id: string;
  /** Bank-issued FDR number. */
  readonly fdrNumber: string;
  /** ID of the institution that submitted this FDR. */
  readonly institutionId: string;
  /** Cached institution name for display convenience. */
  readonly institutionName?: string;
  /** Name of the issuing bank. */
  readonly bankName: string;
  /** Branch name of the issuing bank. */
  readonly branchName: string;
  /** IFSC code of the issuing branch. */
  readonly ifscCode: string;
  /** Deposit amount in paise. */
  readonly amount: number;
  /** Bank reported amount in paise (optional, used to detect discrepancies/tampering). */
  readonly bankReportedAmount?: number;
  /** Interest rate in percentage (e.g. 7.25). */
  readonly interestRate?: number;
  /** ISO 8601 date string — date of issue. */
  readonly issueDate: string;
  /** ISO 8601 date string — date of maturity. */
  readonly maturityDate: string;
  /** Current lifecycle status. */
  readonly status: FDRStatus;
  /** Current trust verification tier. */
  readonly trustTier: TrustTier;
  /** Whether a lien has been marked in favour of AICTE. */
  readonly lienMarked: boolean;
  /** SHA-256 hash of the uploaded FDR document. */
  readonly documentHash: string;
  /** Number of times this FDR has been renewed. */
  readonly renewalCount: number;
  /** ID of the FDR this one replaced (if any). */
  readonly previousFdrId: string | null;
  /** ISO 8601 timestamp — record creation. */
  readonly createdAt: string;
  /** ISO 8601 timestamp — last update. */
  readonly updatedAt: string;
  /** Free-text notes attached to the FDR. */
  readonly notes: string;
}

/** An AICTE-recognised institution. */
export interface Institution {
  /** Unique internal identifier. */
  readonly id: string;
  /** Legal name of the institution. */
  readonly name: string;
  /** AICTE permanent ID. */
  readonly aicteId: string;
  /** State where the institution is located. */
  readonly state: string;
  /** District where the institution is located. */
  readonly district: string;
  /** Category of the institution. */
  readonly type: InstitutionType;
  /** Year of establishment. */
  readonly established: number;
  /** Name of the nodal officer. */
  readonly nodalOfficer: string;
  /** Official email address. */
  readonly email: string;
  /** Contact phone number. */
  readonly phone: string;
  /** Computed risk score (0–100). */
  readonly riskScore: number;
  /** Total number of FDRs on file. */
  readonly fdrCount: number;
}

/** A bank branch registered on the platform. */
export interface BankBranch {
  /** Unique internal identifier. */
  readonly id: string;
  /** Name of the bank. */
  readonly bankName: string;
  /** Name of the branch. */
  readonly branchName: string;
  /** IFSC code. */
  readonly ifscCode: string;
  /** City. */
  readonly city: string;
  /** State. */
  readonly state: string;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/** A single entry in the hash-chained audit log. */
export interface AuditLogEntry {
  /** Unique entry identifier. */
  readonly id: string;
  /** ISO 8601 timestamp. */
  readonly timestamp: string;
  /** Action that was performed. */
  readonly action: string;
  /** ID of the actor who performed the action. */
  readonly actorId: string;
  /** Role of the actor. */
  readonly actorRole: UserRole;
  /** Type of entity affected (e.g. 'fdr', 'institution'). */
  readonly entityType: string;
  /** ID of the affected entity. */
  readonly entityId: string;
  /** Human-readable details of the action. */
  readonly details: string;
  /** SHA-256 hash of this entry's content (includes previousHash). */
  readonly hash: string;
  /** Hash of the preceding audit entry (empty string for the genesis entry). */
  readonly previousHash: string;
}

// ---------------------------------------------------------------------------
// Alerts / Escalation
// ---------------------------------------------------------------------------

/** Alert severity thresholds keyed to days-before-maturity. */
export type AlertType =
  | 'expiry_90'
  | 'expiry_60'
  | 'expiry_30'
  | 'expiry_15'
  | 'expiry_7';

/** An escalation alert generated for an approaching FDR maturity. */
export interface Alert {
  /** Unique alert identifier. */
  readonly id: string;
  /** ID of the FDR this alert relates to. */
  readonly fdrId: string;
  /** ID of the owning institution. */
  readonly institutionId: string;
  /** Alert threshold type. */
  readonly type: AlertType;
  /** Severity label. */
  readonly severity: string;
  /** Human-readable alert message. */
  readonly message: string;
  /** List of recipient identifiers. */
  readonly recipients: string[];
  /** Notification channels (e.g. 'email', 'sms', 'dashboard'). */
  readonly channels: string[];
  /** ISO 8601 timestamp — when the alert was created. */
  readonly createdAt: string;
  /** Whether the alert has been acknowledged. */
  readonly acknowledged: boolean;
  /** ID of the user who acknowledged the alert (null if unacknowledged). */
  readonly acknowledgedBy: string | null;
  /** ISO 8601 timestamp — when the alert was acknowledged (null if unacknowledged). */
  readonly acknowledgedAt: string | null;
}

// ---------------------------------------------------------------------------
// Logic Checks
// ---------------------------------------------------------------------------

/** Severity levels for logic check results. */
export type LogicCheckSeverity = 'error' | 'warning' | 'info';

/** Result of a single logic check against an FDR. */
export interface LogicCheckResult {
  /** Machine-readable rule identifier. */
  readonly rule: string;
  /** Whether the check passed. */
  readonly passed: boolean;
  /** Severity if the check failed. */
  readonly severity: LogicCheckSeverity;
  /** Human-readable explanation. */
  readonly message: string;
  /** Additional structured data about the check result. */
  readonly details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Risk Scoring
// ---------------------------------------------------------------------------

/** A single scored factor contributing to an institution's risk score. */
export interface RiskFactor {
  /** Machine-readable name of the factor. */
  readonly name: string;
  /** Weight of this factor (out of 100). */
  readonly weight: number;
  /** Achieved score for this factor (0 – maxScore). */
  readonly score: number;
  /** Maximum possible score. */
  readonly maxScore: number;
  /** Human-readable description. */
  readonly description: string;
}

// ---------------------------------------------------------------------------
// Release Eligibility
// ---------------------------------------------------------------------------

/** A configurable rule that gates FDR release eligibility. */
export interface ReleaseRule {
  /** Unique rule identifier. */
  readonly id: string;
  /** Human-readable rule name. */
  readonly name: string;
  /** Description of the condition this rule checks. */
  readonly condition: string;
  /** Whether this rule is currently active. */
  readonly enabled: boolean;
  /** Categorisation label (e.g. 'status', 'compliance', 'risk'). */
  readonly category: string;
}

// ---------------------------------------------------------------------------
// Fraud Graph
// ---------------------------------------------------------------------------

/** Types of nodes in the fraud graph. */
export type GraphNodeType = 'institution' | 'fdr' | 'bank_branch' | 'document_hash';

/** Types of edges in the fraud graph. */
export type GraphEdgeType = 'owns' | 'issued_by' | 'has_hash';

/** A node in the fraud detection graph. */
export interface GraphNode {
  /** Unique node identifier. */
  readonly id: string;
  /** Node category. */
  readonly type: GraphNodeType;
  /** Display label. */
  readonly label: string;
  /** Arbitrary metadata attached to the node. */
  readonly metadata: Record<string, unknown>;
}

/** A directed edge in the fraud detection graph. */
export interface GraphEdge {
  /** Source node ID. */
  readonly source: string;
  /** Target node ID. */
  readonly target: string;
  /** Edge category. */
  readonly type: GraphEdgeType;
  /** Display label. */
  readonly label: string;
}

/** A cluster of nodes flagged as suspicious. */
export interface SuspiciousCluster {
  /** Unique cluster identifier. */
  readonly id: string;
  /** Reason the cluster was flagged. */
  readonly reason: string;
  /** Node IDs in this cluster. */
  readonly nodeIds: string[];
  /** Edge connections within this cluster. */
  readonly edges: GraphEdge[];
  /** Severity score (0–100). */
  readonly severity: number;
}
