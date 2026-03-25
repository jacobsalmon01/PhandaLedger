import type { Character } from '../../types/character';

interface Props {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PartyStrip({ characters, selectedId, onSelect }: Props) {
  if (characters.length <= 1) return null;

  return (
    <div className="pv-party-strip">
      {characters.map((ch) => {
        const hpPct = ch.hp.max > 0 ? Math.max(0, ch.hp.current / ch.hp.max) : 1;
        const isSelected = ch.id === selectedId;
        return (
          <button
            key={ch.id}
            className={`pv-party-pip${isSelected ? ' pv-party-pip--active' : ''}${ch.dead ? ' pv-party-pip--dead' : ''}`}
            onClick={() => onSelect(ch.id)}
            title={ch.name || 'Unnamed'}
          >
            <svg className="pv-party-pip__ring" viewBox="0 0 44 44">
              {/* Background ring */}
              <circle cx="22" cy="22" r="20" fill="none" stroke="var(--border-inner)" strokeWidth="2.5" />
              {/* HP ring — stroke-dasharray trick */}
              <circle
                cx="22" cy="22" r="20"
                fill="none"
                stroke={ch.dead ? 'var(--accent-red)' : hpPct > 0.5 ? 'var(--hp-healthy)' : hpPct > 0.25 ? 'var(--hp-wounded)' : 'var(--hp-critical)'}
                strokeWidth="2.5"
                strokeDasharray={`${hpPct * 125.66} 125.66`}
                strokeDashoffset="0"
                transform="rotate(-90 22 22)"
                strokeLinecap="round"
              />
            </svg>
            <div className="pv-party-pip__portrait">
              {ch.portrait ? (
                <img
                  src={ch.portrait}
                  alt={ch.name}
                  style={{
                    transform: `translate(${ch.portraitCrop.offsetX * 100}%, ${ch.portraitCrop.offsetY * 100}%) scale(${ch.portraitCrop.scale})`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <span className="pv-party-pip__initial">
                  {ch.dead ? '\u2620' : (ch.name?.[0] || '?').toUpperCase()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
