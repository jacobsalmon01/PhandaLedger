import type { Character } from '../../types/character';
import { getConditionDef, getExhaustionLevel } from '../../types/conditions';

interface Props {
  ch: Character;
}

export function PlayerConditions({ ch }: Props) {
  if (ch.conditions.length === 0) return null;

  const exhaustionLevel = getExhaustionLevel(ch.conditions);
  const nonExhaustion = ch.conditions.filter((c) => !c.name.startsWith('Exhaustion'));

  return (
    <div className="pv-conditions">
      {nonExhaustion.map((entry) => {
        const def = getConditionDef(entry);
        const tier = def?.tier ?? 'caution';
        return (
          <span
            key={entry.name}
            className={`pv-condition-seal pv-condition-seal--${tier}`}
            title={def?.desc}
          >
            <span className="pv-condition-seal__icon">{def?.icon ?? '?'}</span>
            {def?.abbr ?? entry.name.slice(0, 3).toUpperCase()}
            {entry.rounds != null && entry.rounds > 0 && (
              <span className="pv-condition-seal__rounds">{entry.rounds}r</span>
            )}
          </span>
        );
      })}

      {exhaustionLevel > 0 && (
        <span className="pv-exhaustion" title={`Exhaustion level ${exhaustionLevel}`}>
          <span>EXH</span>
          <span className="pv-exhaustion__pips">
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                className={`pv-exhaustion__pip${i < exhaustionLevel ? ' pv-exhaustion__pip--filled' : ''}`}
              />
            ))}
          </span>
        </span>
      )}
    </div>
  );
}
