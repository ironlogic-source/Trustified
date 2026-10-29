import React from 'react';
import { useAlertStore } from '../../stores/alertStore';
import { useClockStore } from '../../stores/clockStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { MockAdapterTag } from '../ui/MockAdapterTag';
import { useTranslation } from 'react-i18next';
import {
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Calendar,
  Radio,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';

export const AlertsEscalation: React.FC = () => {
  const { t } = useTranslation();
  const alerts = useAlertStore((state) => state.alerts);
  const filters = useAlertStore((state) => state.filters);
  const setFilters = useAlertStore((state) => state.setFilters);
  const acknowledgeAlert = useAlertStore((state) => state.acknowledgeAlert);
  const currentDate = useClockStore((state) => state.currentDate);
  const currentUser = useAuthStore((state) => state.currentUser);

  // Group alerts by threshold
  const urgencyGroups = [
    { key: 'expiry_7' as const, label: '7-Day Critical Breach Ladder', color: 'border-brick text-brick bg-brick-bg/40' },
    { key: 'expiry_15' as const, label: '15-Day Urgent Regulatory Notice', color: 'border-ochre text-ochre bg-ochre-bg/40' },
    { key: 'expiry_30' as const, label: '30-Day Regional Escalation', color: 'border-ochre text-ochre bg-ochre-bg/30' },
    { key: 'expiry_60' as const, label: '60-Day Bureau Reminder', color: 'border-blue-system text-blue-system bg-blue-bg/30' },
    { key: 'expiry_90' as const, label: '90-Day Initial Expiry Advisory', color: 'border-hairline text-muted bg-paper' },
  ];

  const filteredAlerts = alerts.filter((a) => {
    if (filters.urgency !== 'all' && a.type !== filters.urgency) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        a.message.toLowerCase().includes(q) ||
        a.institutionId.toLowerCase().includes(q) ||
        a.fdrId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-hairline pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-muted">
            Automated Escalation Protocol
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {t('nav.alerts')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-hairline px-3 py-1.5 rounded-sm font-mono text-xs text-ink">
            <Calendar size={13} className="text-muted" />
            <span>Clock: <strong>{currentDate}</strong></span>
          </div>
          <MockAdapterTag />
        </div>
      </div>

      {/* Escalation Ladder Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {urgencyGroups.map((grp) => {
          const count = alerts.filter((a) => a.type === grp.key).length;
          const isSelected = filters.urgency === grp.key;

          return (
            <button
              key={grp.key}
              onClick={() =>
                setFilters({ urgency: isSelected ? 'all' : grp.key })
              }
              className={`p-3 border rounded-sm text-left transition-colors flex flex-col justify-between ${
                isSelected
                  ? 'ring-2 ring-ink border-ink bg-surface shadow-subtle'
                  : 'bg-surface border-hairline hover:bg-paper'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider font-semibold text-muted">
                {grp.key.replace('expiry_', '')} Days
              </div>
              <div className="font-mono text-2xl font-bold text-ink my-1">
                {count}
              </div>
              <div className="text-[10px] text-muted truncate">
                {grp.label.split(' ')[0]} Escalations
              </div>
            </button>
          );
        })}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-sm font-semibold text-ink uppercase tracking-wider">
            Active Escalation Dispatches ({filteredAlerts.length})
          </h2>
          <span className="text-xs text-muted font-mono">
            Synchronized with simulated calendar
          </span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="bg-surface border border-hairline p-12 text-center text-muted font-sans rounded-sm">
            No active escalation alerts for this date and filter criteria. Advance simulated clock in topbar to test 90/60/30/15/7 day escalation ladder.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAlerts.map((alert) => {
              const borderStyles =
                alert.type === 'expiry_7'
                  ? 'border-l-4 border-l-brick'
                  : alert.type === 'expiry_15'
                  ? 'border-l-4 border-l-ochre'
                  : alert.type === 'expiry_30'
                  ? 'border-l-4 border-l-ochre'
                  : alert.type === 'expiry_60'
                  ? 'border-l-4 border-l-blue-system'
                  : 'border-l-4 border-l-muted';

              return (
                <div
                  key={alert.id}
                  className={`bg-surface border border-hairline p-4 rounded-sm shadow-subtle ${borderStyles} space-y-3`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">
                        {alert.id}
                      </span>
                      <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm bg-paper border border-hairline text-body">
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </span>
                      {alert.acknowledged && (
                        <span className="text-[10px] font-mono text-green-confirmed flex items-center gap-1">
                          <CheckCircle2 size={12} /> Acknowledged
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted font-mono flex items-center gap-2">
                      <span>Channels:</span>
                      <div className="flex items-center gap-1.5 text-ink">
                        <span title="Email Dispatch"><Mail size={13} /></span>
                        <span title="SMS Gateway"><Smartphone size={13} /></span>
                        <span title="WhatsApp Notification"><MessageSquare size={13} /></span>
                      </div>
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="text-xs text-body leading-relaxed font-sans">
                    {alert.message}
                  </div>

                  {/* Recipients & Actions */}
                  <div className="border-t border-hairline/60 pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-muted font-mono">
                    <div className="truncate max-w-xl">
                      <strong>Escalated To:</strong> {alert.recipients.join(' • ')}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!alert.acknowledged && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => acknowledgeAlert(alert.id, currentUser.id)}
                        >
                          Mark Acknowledged
                        </Button>
                      )}
                      <Button size="sm" variant="primary">
                        Dispatch Manual Notice
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
