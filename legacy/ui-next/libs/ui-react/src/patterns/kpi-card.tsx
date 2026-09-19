import type { ReactNode } from 'react';
import { Card } from '../foundations/surface';
import { MetricDelta } from '../foundations/status-badge';
import './kpi-card.css';

export type KPITone = 'brand' | 'blue' | 'orange' | 'red';

export interface KPICardProps {
  icon: ReactNode;
  tone: KPITone;
  label: string;
  value: string;
  delta?: number;
  deltaUpIsGood?: boolean;
  note?: string;
}

/** A top-level number a reader scans in half a second — icon says what it is, value is the point, delta says which way it's moving. */
export function KPICard({ icon, tone, label, value, delta, deltaUpIsGood = true, note }: KPICardProps) {
  return (
    <Card padding="md" className="omni-kpi-card">
      <span className={`omni-kpi-icon omni-kpi-icon--${tone}`}>{icon}</span>
      <span className="omni-kpi-label">{label}</span>
      <span className="omni-kpi-value">{value}</span>
      <span className="omni-kpi-meta">
        {delta !== undefined ? <MetricDelta value={delta} upIsGood={deltaUpIsGood} /> : null}
        {note ? <span className="omni-kpi-note">{note}</span> : null}
      </span>
    </Card>
  );
}
