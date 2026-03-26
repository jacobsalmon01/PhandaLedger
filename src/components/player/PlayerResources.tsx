import type { Character } from '../../types/character';

interface Props {
  ch: Character;
}

const RECHARGE_LABELS: Record<string, string> = {
  short: '\u263C',   // sun — short rest
  long: '\u263E',    // moon — long rest
  manual: '',
};

export function PlayerResources({ ch }: Props) {
  if (ch.resources.length === 0) return null;

  return (
    <>
      <div className="pv-divider" />
      <div className="pv-section-title">
        <span className="pv-section-title__icon">&#10023;</span>
        Resources
      </div>

      <div className="pv-resources">
        {ch.resources.map((res) => {
          const available = Math.max(0, res.max - res.used);
          const showPips = res.max <= 10;

          return (
            <div key={res.id} className="pv-resource">
              <span className="pv-resource__name">
                {res.name}
                {RECHARGE_LABELS[res.recharge] && (
                  <span className="pv-resource__recharge">
                    {' '}{RECHARGE_LABELS[res.recharge]}
                  </span>
                )}
              </span>

              {showPips ? (
                <div className="pv-resource__pips">
                  {Array.from({ length: res.max }, (_, i) => (
                    <span
                      key={i}
                      className={`pv-resource__pip${i < available ? ' pv-resource__pip--available' : ''}`}
                    />
                  ))}
                </div>
              ) : (
                <span className="pv-resource__count">
                  {available} / {res.max}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
