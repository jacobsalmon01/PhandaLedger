import { useState } from 'react';
import type { Character } from '../../types/character';

interface Props {
  ch: Character;
}

const LEVEL_LABELS = [
  'Cantrips', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th',
];

export function PlayerSpells({ ch }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasSlots = ch.spellSlots.some((s) => s.max > 0);
  const hasSpells = ch.spells.length > 0;

  if (!hasSlots && !hasSpells) return null;

  // Group spells by level
  const grouped = new Map<number, typeof ch.spells>();
  for (const spell of ch.spells) {
    const list = grouped.get(spell.level) ?? [];
    list.push(spell);
    grouped.set(spell.level, list);
  }

  // Sort by level
  const sortedLevels = [...grouped.keys()].sort((a, b) => a - b);

  return (
    <>
      {/* Spell Slots */}
      {hasSlots && (
        <>
          <div className="pv-divider" />
          <div className="pv-section-title">
            <span className="pv-section-title__icon">&#10022;</span>
            Spell Slots
          </div>
          <div className="pv-spell-slots">
            {ch.spellSlots.map((slot, i) => {
              if (slot.max === 0) return null;
              const available = Math.max(0, slot.max - slot.used);
              return (
                <div key={i} className="pv-slot-row">
                  <span className="pv-slot-row__level">{LEVEL_LABELS[i + 1] ?? `${i + 1}th`}</span>
                  <div className="pv-slot-row__gems">
                    {Array.from({ length: slot.max }, (_, j) => (
                      <span
                        key={j}
                        className={`pv-gem ${j < available ? 'pv-gem--available' : 'pv-gem--used'}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Spell List */}
      {hasSpells && (
        <>
          <div className="pv-divider" />
          <div className="pv-section-title">
            <span className="pv-section-title__icon">&#10024;</span>
            Spells
          </div>
          <div className="pv-spells">
            {sortedLevels.map((level) => {
              const spells = grouped.get(level)!;
              return (
                <div key={level} className="pv-spell-group">
                  <div className="pv-spell-group__header">{LEVEL_LABELS[level] ?? `Level ${level}`}</div>
                  {spells.map((spell) => {
                    const isExpanded = expandedId === spell.id;
                    const cls = [
                      'pv-spell',
                      spell.active && 'pv-spell--active',
                      spell.concentration && 'pv-spell--concentration',
                      !spell.prepared && !spell.alwaysPrepared && spell.level > 0 && 'pv-spell--unprepared',
                    ].filter(Boolean).join(' ');

                    return (
                      <div key={spell.id}>
                        <div
                          className={cls}
                          onClick={() => setExpandedId(isExpanded ? null : spell.id)}
                        >
                          <div className="pv-spell__top">
                            {spell.concentration && (
                              <span className="pv-spell__conc-icon">&#9672;</span>
                            )}
                            <span className="pv-spell__name">{spell.name || 'Unnamed'}</span>
                            {spell.active && spell.roundsRemaining > 0 && (
                              <span className="pv-spell__rounds">{spell.roundsRemaining}r</span>
                            )}
                          </div>
                          {(spell.castingTime || spell.duration) && (
                            <div className="pv-spell__meta">
                              {spell.castingTime && <span>{spell.castingTime}</span>}
                              {spell.duration && <span>{spell.duration}</span>}
                            </div>
                          )}
                          {spell.notes && (
                            <div className="pv-spell__notes">{spell.notes}</div>
                          )}
                        </div>
                        {isExpanded && spell.description && (
                          <div
                            className="pv-spell__desc"
                            dangerouslySetInnerHTML={{ __html: spell.description }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
