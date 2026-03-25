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
  if (ch.resources.length === 0) return null;

  return (
    <div className="pv-card pv-card--resources">
      <h2 className="pv-card__title">Resources</h2>
      <div className="pv-resources__list">
        {ch.resources.map((r) => {
          const remaining = r.max - r.used;
          return (
            <div key={r.id} className="pv-resource">
              <div className="pv-resource__header">
                <span className="pv-resource__name">{r.name}</span>
                <span className="pv-resource__recharge">{RECHARGE_LABELS[r.recharge] ?? r.recharge}</span>
              </div>
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
