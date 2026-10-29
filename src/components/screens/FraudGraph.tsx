import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useFDRStore } from '../../stores/fdrStore';
import { useInstitutionStore } from '../../stores/institutionStore';
import { seedBankBranches } from '../../data/seed';
import { buildFraudGraph, toCytoscapeElements } from '../../engines/fraud-graph';
import type { SuspiciousCluster, GraphNode } from '../../engines/types';
import { useTranslation } from 'react-i18next';
import {
  Network,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Info,
  CheckCircle,
  Building,
  FileText,
  Landmark,
  Hash,
} from 'lucide-react';
import { Button } from '../ui/Button';

export const FraudGraph: React.FC = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const fdrs = useFDRStore((state) => state.fdrs);
  const institutions = useInstitutionStore((state) => state.institutions);

  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedCluster, setSelectedCluster] = useState<SuspiciousCluster | null>(null);
  const [activeLayout, setActiveLayout] = useState<'cose' | 'concentric' | 'circle'>('cose');

  // Build fraud graph data
  const graphData = buildFraudGraph(institutions, fdrs, seedBankBranches);

  useEffect(() => {
    if (!containerRef.current) return;

    // Filter to an impactful, readable subset around the planted anomalies and connected nodes
    // to ensure 60fps responsiveness on canvas
    const anomalyInstitutions = institutions.filter((i) =>
      ['INST-001', 'INST-002', 'INST-003', 'INST-004', 'INST-005', 'INST-006', 'INST-007'].includes(
        i.id,
      ),
    );
    const anomalyFdrs = fdrs.filter((f) =>
      [
        'INST-001',
        'INST-002',
        'INST-003',
        'INST-004',
        'INST-005',
        'INST-006',
        'INST-007',
      ].includes(f.institutionId),
    );

    const subGraph = buildFraudGraph(anomalyInstitutions, anomalyFdrs, seedBankBranches);
    const elements = toCytoscapeElements(subGraph.nodes, subGraph.edges);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'font-size': '10px',
            'font-family': 'IBM Plex Sans, sans-serif',
            color: '#1D2433',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'background-color': '#0B2545',
            width: 24,
            height: 24,
            'border-width': 1,
            'border-color': '#DDD8CC',
          },
        },
        // Institution: square
        {
          selector: "node[type = 'institution']",
          style: {
            shape: 'round-rectangle',
            'background-color': '#0B2545',
            color: '#0B2545',
            width: 32,
            height: 32,
            'font-weight': 'bold',
          },
        },
        // FDR: circle
        {
          selector: "node[type = 'fdr']",
          style: {
            shape: 'ellipse',
            'background-color': '#1F7A4D',
            color: '#1D2433',
            width: 22,
            height: 22,
          },
        },
        // Bank Branch: diamond
        {
          selector: "node[type = 'bank_branch']",
          style: {
            shape: 'diamond',
            'background-color': '#A8842C',
            width: 26,
            height: 26,
          },
        },
        // Document Hash: hexagon
        {
          selector: "node[type = 'document_hash']",
          style: {
            shape: 'hexagon',
            'background-color': '#B3382C',
            width: 24,
            height: 24,
          },
        },
        // Edges
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#DDD8CC',
            'target-arrow-color': '#DDD8CC',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
          },
        },
        // Edge types
        {
          selector: "edge[type = 'has_hash']",
          style: {
            'line-color': '#B3382C',
            'target-arrow-color': '#B3382C',
            'line-style': 'dashed',
            width: 2,
          },
        },
        // Selection highlight
        {
          selector: ':selected',
          style: {
            'border-width': 3,
            'border-color': '#B7791F',
            'line-color': '#B7791F',
            'target-arrow-color': '#B7791F',
          },
        },
      ],
      layout: {
        name: activeLayout,
        animate: false,
        padding: 40,
      },
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode(node.data());
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [institutions, fdrs, activeLayout]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit();

  const handleSelectCluster = (cluster: SuspiciousCluster) => {
    setSelectedCluster(cluster);
    if (!cyRef.current) return;

    cyRef.current.elements().unselect();
    cluster.nodeIds.forEach((id) => {
      cyRef.current?.$(`#${id}`).select();
    });
    cyRef.current.fit(cyRef.current.$(':selected'), 60);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-hairline pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-muted">
            Forensic Intelligence Engine
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {t('nav.fraudGraph')}
          </h1>
        </div>

        {/* Cluster count pill */}
        <div className="flex items-center gap-2 bg-brick-bg border border-brick px-3 py-1.5 rounded-sm text-xs font-mono text-brick">
          <ShieldAlert size={14} className="shrink-0" />
          <span>
            <strong>{graphData.clusters.length} Suspicious Multi-Entity Clusters</strong> Flagged
          </span>
        </div>
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canvas Area (8 cols) */}
        <div className="lg:col-span-8 bg-surface border border-hairline rounded-sm shadow-subtle flex flex-col h-[650px] relative">
          {/* Controls toolbar */}
          <div className="h-10 border-b border-hairline px-3 flex items-center justify-between bg-paper/60 text-xs font-mono select-none">
            {/* Legend pills */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-ink inline-block" />
                <span>Institution</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-confirmed inline-block" />
                <span>FDR</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rotate-45 bg-brass inline-block" />
                <span>Branch</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-brick inline-block" />
                <span>Doc Hash</span>
              </span>
            </div>

            {/* Layout & Zoom Controls */}
            <div className="flex items-center gap-1">
              <select
                value={activeLayout}
                onChange={(e) => setActiveLayout(e.target.value as any)}
                className="bg-surface border border-hairline text-[11px] px-2 py-0.5 rounded-sm mr-2 font-mono"
              >
                <option value="cose">Force-Directed</option>
                <option value="concentric">Concentric Rings</option>
                <option value="circle">Circular</option>
              </select>

              <button
                onClick={handleZoomIn}
                className="p-1 border border-hairline rounded-sm hover:bg-paper"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1 border border-hairline rounded-sm hover:bg-paper"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={handleFit}
                className="p-1 border border-hairline rounded-sm hover:bg-paper"
                title="Fit to Canvas"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* Cytoscape Container */}
          <div ref={containerRef} className="flex-1 w-full h-full bg-[#FCFBF8]" />
        </div>

        {/* Right Intelligence Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Flagged Clusters Card */}
          <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
            <div className="border-b border-hairline pb-2 flex items-center justify-between">
              <span className="font-semibold text-xs text-ink uppercase tracking-wider">
                Forensic Suspicious Rings
              </span>
              <span className="text-[10px] font-mono text-brick font-bold">
                {graphData.clusters.length} Rings
              </span>
            </div>

            <div className="space-y-2">
              {graphData.clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  onClick={() => handleSelectCluster(cluster)}
                  className={`p-3 border rounded-sm cursor-pointer transition-colors text-xs space-y-1 ${
                    selectedCluster?.id === cluster.id
                      ? 'bg-brick-bg border-brick ring-1 ring-brick'
                      : 'bg-paper/50 border-hairline hover:border-brick/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-brick text-[11px]">
                      {cluster.id}
                    </span>
                    <span className="font-mono text-[10px] bg-brick text-white px-1.5 py-0.2 rounded-xs">
                      Severity {cluster.severity}/100
                    </span>
                  </div>
                  <div className="text-body font-medium leading-snug">
                    {cluster.reason}
                  </div>
                  <div className="text-[10px] text-muted font-mono pt-1">
                    Involves {cluster.nodeIds.length} connected network nodes
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Node Details Card */}
          <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
            <div className="border-b border-hairline pb-2 flex items-center justify-between">
              <span className="font-semibold text-xs text-ink uppercase tracking-wider">
                Graph Inspector
              </span>
              {selectedNode && (
                <span className="text-[10px] uppercase font-mono text-muted">
                  {selectedNode.type}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-[10px] text-muted uppercase font-mono">Entity Identifier:</div>
                  <div className="font-mono font-bold text-ink">{selectedNode.id}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted uppercase font-mono">Display Label:</div>
                  <div className="font-medium text-body">{selectedNode.label}</div>
                </div>

                {selectedNode.metadata && (
                  <div className="border-t border-hairline pt-2 mt-2 space-y-1">
                    <div className="text-[10px] text-muted uppercase font-mono">Node Attributes:</div>
                    <pre className="p-2 bg-paper border border-hairline rounded-sm text-[10px] font-mono overflow-x-auto text-ink">
                      {JSON.stringify(selectedNode.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted font-sans">
                Click any node on the graph canvas or select a cluster above to inspect forensic details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
