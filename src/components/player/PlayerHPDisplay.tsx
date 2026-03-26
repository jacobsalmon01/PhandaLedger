import type { Character } from '../../types/character';

interface Props {
  ch: Character;
}

export function PlayerHPDisplay({ ch }: Props) {
  const { current, max, temp } = ch.hp;

  if (ch.dead) {
    return (
      <div className="pv-hp">
        <div className="pv-hp__dead">
          <span className="pv-hp__dead-skull">&#9760;</span>
          <span className="pv-hp__dead-text">Fallen</span>
        </div>
      </div>
    );
  }

  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const hpClass =
    pct > 60 ? 'pv-hp__bar-inner--healthy' :
    pct > 25 ? 'pv-hp__bar-inner--wounded' :
               'pv-hp__bar-inner--critical';

  // Temp HP shown as blue overlay extending from left
  const tempPct = max > 0 && temp > 0 ? Math.min(100, ((current + temp) / max) * 100) : 0;

  return (
    <div className="pv-hp">
      <div className="pv-hp__bar-wrap">
        {temp > 0 && (
          <div
            className="pv-hp__temp-overlay"
            style={{ left: 2, width: `calc(${Math.min(tempPct, 100)}% - 4px)` }}
          />
        )}
        <div
          className={`pv-hp__bar-inner ${hpClass}`}
          style={{ width: `calc(${pct}% - 4px)` }}
        />
        <div className="pv-hp__label">
          {current} / {max}
          {temp > 0 && (
            <span className="pv-hp__label-temp">+{temp}</span>
          )}
        </div>
      </div>
    </div>
  );
}
