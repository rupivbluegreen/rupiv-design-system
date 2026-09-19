import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../foundations/button';
import './ai-insight-card.css';

export interface AIInsightCardProps {
  title: string;
  children: ReactNode;
  action?: { label: string; onClick?: () => void };
}

/** AI embedded into the workflow, not dominating it — restrained lilac accent, a suggestion and one action, never an autonomous decision. */
export function AIInsightCard({ title, children, action }: AIInsightCardProps) {
  return (
    <div className="omni-ai-insight-card">
      <span className="omni-ai-insight-icon" aria-hidden="true">
        <Sparkles />
      </span>
      <div className="omni-ai-insight-body">
        <p className="omni-ai-insight-title">{title}</p>
        <p className="omni-ai-insight-text">{children}</p>
        {action ? (
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label} <span className="tx-directional-icon" aria-hidden="true">→</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
