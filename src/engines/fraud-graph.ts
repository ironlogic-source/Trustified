/**
 * @module fraud-graph
 * @description Fraud Network Graph engine for FDR-Kavach.
 * Constructs nodes (institutions, FDRs, bank branches, document hashes) and directed edges
 * to expose fraud rings, duplicate FDR numbers, and reused scanned document hashes.
 */

import type {
  FDR,
  Institution,
  BankBranch,
  GraphNode,
  GraphEdge,
  SuspiciousCluster,
} from './types';

export interface FraudGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: SuspiciousCluster[];
  summary: {
    totalInstitutions: number;
    totalFDRs: number;
    totalBranches: number;
    totalHashes: number;
    suspiciousClusterCount: number;
  };
}

export function buildFraudGraph(
  institutions: Institution[],
  fdrs: FDR[],
  bankBranches: BankBranch[],
): FraudGraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const clusters: SuspiciousCluster[] = [];

  const nodeSet = new Set<string>();

  const addNode = (node: GraphNode) => {
    if (!nodeSet.has(node.id)) {
      nodeSet.add(node.id);
      nodes.push(node);
    }
  };

  const addEdge = (edge: GraphEdge) => {
    edges.push(edge);
  };

  // 1. Add Institution nodes
  for (const inst of institutions) {
    addNode({
      id: inst.id,
      label: inst.name,
      type: 'institution',
      metadata: {
        aicteId: inst.aicteId,
        state: inst.state,
        riskScore: inst.riskScore,
        type: inst.type,
      },
    });
  }

  // 2. Add Bank Branch nodes
  for (const branch of bankBranches) {
    addNode({
      id: `BRANCH-${branch.ifscCode}`,
      label: `${branch.bankName} (${branch.branchName})`,
      type: 'bank_branch',
      metadata: {
        bankName: branch.bankName,
        branchName: branch.branchName,
        ifscCode: branch.ifscCode,
        city: branch.city,
        state: branch.state,
      },
    });
  }

  // 3. Track duplicates & hash reuses for cluster detection
  const fdrNumberMap = new Map<string, FDR[]>();
  const hashDistributionMap = new Map<string, FDR[]>();

  for (const fdr of fdrs) {
    // Collect for duplicate FDR check
    const existingNum = fdrNumberMap.get(fdr.fdrNumber) ?? [];
    existingNum.push(fdr);
    fdrNumberMap.set(fdr.fdrNumber, existingNum);

    // Collect for hash reuse check
    if (fdr.documentHash && fdr.documentHash.trim() !== '') {
      const existingHash = hashDistributionMap.get(fdr.documentHash) ?? [];
      existingHash.push(fdr);
      hashDistributionMap.set(fdr.documentHash, existingHash);
    }

    // Add FDR node
    addNode({
      id: fdr.id,
      label: `FDR: ${fdr.fdrNumber}`,
      type: 'fdr',
      metadata: {
        fdrNumber: fdr.fdrNumber,
        amount: fdr.amount,
        status: fdr.status,
        trustTier: fdr.trustTier,
        issueDate: fdr.issueDate,
        maturityDate: fdr.maturityDate,
        lienMarked: fdr.lienMarked,
        documentHash: fdr.documentHash,
      },
    });

    // Add Edge: Institution -> OWNS -> FDR
    addEdge({
      source: fdr.institutionId,
      target: fdr.id,
      type: 'owns',
      label: 'OWNS',
    });

    // Add Branch node if not already present
    const branchId = `BRANCH-${fdr.ifscCode}`;
    if (!nodeSet.has(branchId)) {
      addNode({
        id: branchId,
        label: `${fdr.bankName} (${fdr.branchName || fdr.ifscCode})`,
        type: 'bank_branch',
        metadata: {
          bankName: fdr.bankName,
          branchName: fdr.branchName,
          ifscCode: fdr.ifscCode,
        },
      });
    }

    // Add Edge: FDR -> ISSUED_BY -> Branch
    addEdge({
      source: fdr.id,
      target: branchId,
      type: 'issued_by',
      label: 'ISSUED_BY',
    });

    // Add Document Hash node & Edge
    if (fdr.documentHash) {
      const hashId = `HASH-${fdr.documentHash.substring(0, 16)}`;
      addNode({
        id: hashId,
        label: `Hash: ${fdr.documentHash.substring(0, 12)}…`,
        type: 'document_hash',
        metadata: {
          fullHash: fdr.documentHash,
        },
      });

      addEdge({
        source: fdr.id,
        target: hashId,
        type: 'has_hash',
        label: 'HAS_HASH',
      });
    }
  }

  // 4. Detect Duplicate FDR Number Clusters
  let clusterIndex = 1;
  for (const [fdrNum, fdrList] of fdrNumberMap.entries()) {
    // Check if used across different institutions
    const uniqueInstIds = new Set(fdrList.map((f) => f.institutionId));
    if (uniqueInstIds.size > 1) {
      const clusterNodeIds: string[] = [];
      const clusterEdges: GraphEdge[] = [];

      for (const instId of uniqueInstIds) clusterNodeIds.push(instId);
      for (const f of fdrList) clusterNodeIds.push(f.id);

      for (const edge of edges) {
        if (clusterNodeIds.includes(edge.source) && clusterNodeIds.includes(edge.target)) {
          clusterEdges.push(edge);
        }
      }

      clusters.push({
        id: `CLUSTER-DUP-${clusterIndex++}`,
        reason: `Duplicate FDR Number '${fdrNum}' submitted by ${uniqueInstIds.size} distinct institutions.`,
        nodeIds: clusterNodeIds,
        edges: clusterEdges,
        severity: 95,
      });
    }
  }

  // 5. Detect Reused Document Hash Clusters
  for (const [hashVal, fdrList] of hashDistributionMap.entries()) {
    const uniqueInstIds = new Set(fdrList.map((f) => f.institutionId));
    if (uniqueInstIds.size > 1) {
      const clusterNodeIds: string[] = [];
      const clusterEdges: GraphEdge[] = [];
      const hashNodeId = `HASH-${hashVal.substring(0, 16)}`;
      clusterNodeIds.push(hashNodeId);

      for (const instId of uniqueInstIds) clusterNodeIds.push(instId);
      for (const f of fdrList) clusterNodeIds.push(f.id);

      for (const edge of edges) {
        if (clusterNodeIds.includes(edge.source) && clusterNodeIds.includes(edge.target)) {
          clusterEdges.push(edge);
        }
      }

      clusters.push({
        id: `CLUSTER-HASH-${clusterIndex++}`,
        reason: `Identical scanned document hash shared across ${uniqueInstIds.size} institutions. High probability of fabricated documentation.`,
        nodeIds: clusterNodeIds,
        edges: clusterEdges,
        severity: 90,
      });
    }
  }

  return {
    nodes,
    edges,
    clusters,
    summary: {
      totalInstitutions: institutions.length,
      totalFDRs: fdrs.length,
      totalBranches: bankBranches.length,
      totalHashes: hashDistributionMap.size,
      suspiciousClusterCount: clusters.length,
    },
  };
}

/**
 * Converts graph nodes and edges to Cytoscape.js elements format.
 */
export function toCytoscapeElements(nodes: GraphNode[], edges: GraphEdge[]) {
  const cyNodes = nodes.map((n) => ({
    data: {
      id: n.id,
      label: n.label,
      type: n.type,
      ...n.metadata,
    },
  }));

  const cyEdges = edges.map((e, index) => ({
    data: {
      id: `e-${index}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.type,
    },
  }));

  return [...cyNodes, ...cyEdges];
}
