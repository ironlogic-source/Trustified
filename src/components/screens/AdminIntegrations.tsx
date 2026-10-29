import React, { useState } from 'react';
import { useRuleStore } from '../../stores/ruleStore';
import { Button } from '../ui/Button';
import { MockAdapterTag } from '../ui/MockAdapterTag';
import { useTranslation } from 'react-i18next';
import {
  Sliders,
  Unplug,
  CheckCircle2,
  Plus,
  RotateCcw,
  Landmark,
  MessageSquare,
  Shield,
  Fingerprint,
  Cpu,
  Layers,
  Power,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const AdminIntegrations: React.FC = () => {
  const { t } = useTranslation();
  const rules = useRuleStore((state) => state.rules);
  const toggleRule = useRuleStore((state) => state.toggleRule);
  const resetRules = useRuleStore((state) => state.resetRules);

  const [activeTab, setActiveTab] = useState<'rules' | 'integrations'>('rules');

  // Integrations list from the brief
  const integrations = [
    {
      id: 'int-bank',
      title: 'Scheduled Bank Core Banking API (CBS)',
      category: 'Banking & Treasury',
      icon: Landmark,
      description:
        'Direct automated balance inquiry, lien confirmation, and maturity status feed via SFMS / ISO 20022 API.',
      status: 'Active (Simulated)',
      latency: '240ms',
    },
    {
      id: 'int-telecom',
      title: 'Multi-Channel Escalation Gateway',
      category: 'Notifications',
      icon: MessageSquare,
      description:
        'SMS (DLT compliant), WhatsApp Business API, and SMTP dispatch for the 90/60/30/15/7-day escalation ladder.',
      status: 'Active (Simulated)',
      latency: '110ms',
    },
    {
      id: 'int-digilocker',
      title: 'DigiLocker NAD Repository',
      category: 'Citizen Data Vault',
      icon: Shield,
      description:
        'Verification of institutional accreditation credentials and AICTE approval documents via National Academic Depository.',
      status: 'Active (Simulated)',
      latency: '310ms',
    },
    {
      id: 'int-esign',
      title: 'UIDAI Aadhaar eSign v2.1',
      category: 'Legal Sign-off',
      icon: Fingerprint,
      description:
        'Class 3 XML digital signature certificate generation under Section 3A of Information Technology Act 2000.',
      status: 'Active (Simulated)',
      latency: '420ms',
    },
    {
      id: 'int-ocr',
      title: 'Forensic OCR Vision Model',
      category: 'Document Extraction',
      icon: Cpu,
      description:
        'LayoutLMv3 tabular extraction with bounding-box regression and per-field confidence scoring for bank vouchers.',
      status: 'Active (Deterministic Fixture)',
      latency: '1400ms',
    },
    {
      id: 'int-forensics',
      title: 'Raster & EXIF Forensics Engine',
      category: 'Fraud Detection',
      icon: Layers,
      description:
        'Pixel variance, Error Level Analysis (ELA), and EXIF metadata timestamp anomaly detector for scanned instruments.',
      status: 'Active (Seeded Rules)',
      latency: '180ms',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-hairline pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-muted">
            Bureau Administration & System Config
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {t('nav.admin')}
          </h1>
        </div>

        {/* Tab switch */}
        <div className="flex border border-hairline rounded-sm p-0.5 bg-paper text-xs font-sans">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1 rounded-sm font-semibold transition-colors ${
              activeTab === 'rules'
                ? 'bg-surface text-ink shadow-subtle'
                : 'text-muted hover:text-ink'
            }`}
          >
            Release Rule Engine
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-3 py-1 rounded-sm font-semibold transition-colors ${
              activeTab === 'integrations'
                ? 'bg-surface text-ink shadow-subtle'
                : 'text-muted hover:text-ink'
            }`}
          >
            Connected Integrations
          </button>
        </div>
      </div>

      {activeTab === 'rules' ? (
        /* Release Eligibility Rules Editor */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sans text-sm font-semibold text-ink uppercase tracking-wider">
                Configurable Release Eligibility Rules ({rules.length} Rules)
              </h2>
              <div className="text-xs text-muted font-sans">
                Toggling rules directly alters the evaluation checklist on the statutory Release
                Requests screen.
              </div>
            </div>

            <button
              onClick={resetRules}
              className="text-xs text-muted hover:text-ink flex items-center gap-1 font-mono border border-hairline bg-surface px-2.5 py-1 rounded-sm"
              title="Reset rules to bureau defaults"
            >
              <RotateCcw size={12} />
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-surface border p-4 rounded-sm shadow-subtle flex items-start justify-between gap-4 transition-colors ${
                  rule.enabled
                    ? 'border-hairline'
                    : 'border-hairline/40 opacity-60 bg-paper/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink">
                      {rule.id}
                    </span>
                    <span className="font-sans font-semibold text-ink text-sm">
                      {rule.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded-xs bg-paper border border-hairline text-muted">
                      {rule.category}
                    </span>
                  </div>
                  <div className="text-xs text-muted font-sans leading-relaxed">
                    Condition: <strong className="text-body font-mono">{rule.condition}</strong>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-sm border transition-colors ${
                    rule.enabled
                      ? 'bg-green-bg border-green-confirmed/40 text-green-confirmed font-bold'
                      : 'bg-paper border-hairline text-muted'
                  }`}
                >
                  <Power size={13} />
                  <span>{rule.enabled ? 'ACTIVE' : 'DISABLED'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Connected Integrations & Mock Adapters Screen */
        <div className="space-y-4">
          <div>
            <h2 className="font-sans text-sm font-semibold text-ink uppercase tracking-wider">
              Platform Integration Adapters
            </h2>
            <div className="text-xs text-muted font-sans">
              All 6 external government and banking bridges are operational via deterministic
              in-memory simulation layers with realistic latency.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className="bg-surface border border-hairline p-5 rounded-sm shadow-subtle space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-sm bg-paper border border-hairline flex items-center justify-center text-ink shrink-0">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-sm text-ink">
                          {item.title}
                        </div>
                        <div className="text-[10px] uppercase font-mono text-muted tracking-wider">
                          {item.category}
                        </div>
                      </div>
                    </div>

                    <MockAdapterTag />
                  </div>

                  <p className="text-xs text-body font-sans leading-relaxed">
                    {item.description}
                  </p>

                  <div className="border-t border-hairline pt-3 flex items-center justify-between text-xs font-mono text-muted">
                    <div className="flex items-center gap-1.5 text-green-confirmed font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-confirmed animate-pulse" />
                      <span>{item.status}</span>
                    </div>
                    <div>
                      Simulated Latency: <strong className="text-ink">{item.latency}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
