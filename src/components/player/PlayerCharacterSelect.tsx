import type { Character } from '../../types/character';

interface Props {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PlayerCharacterSelect({ characters, selectedId, onSelect }: Props) {
  return (
    <div className="pv-char-select">
      {characters.map((ch) => {
        const isSelected = ch.id === selectedId;
        const isDead = ch.dead;
        const cls = [
          'pv-medallion',
          isSelected && 'pv-medallion--selected',
          isDead && 'pv-medallion--dead',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={ch.id}
            className={cls}
            onClick={() => onSelect(ch.id)}
            aria-label={ch.name || 'Unnamed'}
          >
            <div className="pv-medallion__frame">
              {ch.portrait ? (
                <img
                  className="pv-medallion__portrait"
                  src={ch.portrait}
                  alt=""
                  style={
                    ch.portraitCrop
                      ? {
                          transform: `scale(${ch.portraitCrop.scale}) translate(${ch.portraitCrop.offsetX * 50}%, ${ch.portraitCrop.offsetY * 50}%)`,
                        }
                      : undefined
                  }
                />
              ) : (
                <span className="pv-medallion__initial">
                  {(ch.name || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            {isDead && <span className="pv-medallion__skull">&#9760;</span>}
          </button>
        );
      })}
    </div>
  );
}
