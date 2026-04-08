import { useState } from 'react';
import type { Character } from '../../types/character';

interface Props {
  ch: Character;
}

const RECHARGE_LABELS: Record<string, string> = {
  short: '\u21ba Short',
  long: '\u21ba Long',
  manual: 'Manual',
};

export function ResourcesCard({ ch }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (ch.resources.length === 0) return null;

  return (
    <div className="pv-card pv-card--resources">
      <h2 className="pv-card__title">Resources</h2>
      <div className="pv-resources__list">
        {ch.resources.map((r) => {
          const remaining = r.max - r.used;
          return (
            <div key={r.id} className="pv-resource">
              <button
                className={`pv-resource__header${r.description ? ' pv-resource__header--expandable' : ''}`}
                onClick={() => r.description && setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <span className="pv-resource__name">{r.name}</span>
                {r.description && <span className="pv-resource__info">{expandedId === r.id ? '\u25be' : '\u25b8'}</span>}
                <span className="pv-resource__recharge">{RECHARGE_LABELS[r.recharge] ?? r.recharge}</span>
              </button>
              {expandedId === r.id && r.description && (
                <div className="pv-resource__desc">{r.description}</div>
              )}
              <div className="pv-resource__pips">
                {Array.from({ length: r.max }, (_, i) => (
                  <span
                    key={i}
                    className={`pv-resource__pip${i < remaining ? ' pv-resource__pip--available' : ''}`}
                  />
                ))}
              </div>
              <div className="pv-resource__count">{remaining} / {r.max}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
