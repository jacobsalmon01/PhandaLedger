import type { Character, SpellSlot } from '../../types/character';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const ORDINALS = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];

export function SpellSlotsSection({ ch, updateSelected }: Props) {
  const spellSlots: SpellSlot[] = Array.from({ length: 9 }, (_, i) =>
    ch.spellSlots[i] ?? { max: 0, used: 0 }
  );

  function updateSpellSlot(level: number, updater: (s: SpellSlot) => SpellSlot) {
    updateSelected((c) => {
      const slots: SpellSlot[] = Array.from({ length: 9 }, (_, i) =>
        c.spellSlots[i] ?? { max: 0, used: 0 }
      );
      slots[level] = updater({ ...slots[level] });
      return { ...c, spellSlots: slots };
    });
  }

  return (
    <section className="section">
      <h2 className="section__heading">Spell Slots</h2>
      <div className="spell-slots">
        {spellSlots.map((slot, i) => {
          const available = slot.max - slot.used;
          return (
            <div key={i} className={`spell-level-row${slot.max === 0 ? ' spell-level-row--inactive' : ''}`}>
              <span className="spell-level-label">{ORDINALS[i]}</span>
              <div className="spell-pips">
                {Array.from({ length: slot.max }, (_, pipIdx) => {
                  const isFilled = pipIdx < available;
                  return (
                    <button
                      key={pipIdx}
                      className={`spell-pip${isFilled ? ' spell-pip--available' : ' spell-pip--used'}`}
                      title={isFilled ? 'Expend slot' : 'Restore slot'}
                      onClick={() =>
                        updateSpellSlot(i, (s) =>
                          isFilled
                            ? { ...s, used: Math.min(s.used + 1, s.max) }
                            : { ...s, used: Math.max(s.used - 1, 0) }
                        )
                      }
                    />
                  );
                })}
                {slot.max === 0 && <span className="spell-pips__none">—</span>}
              </div>
              <div className="spell-slot-adj-row">
                <button
                  className="spell-slot-adj"
                  onClick={() =>
                    updateSpellSlot(i, (s) => ({
                      ...s,
                      max: Math.max(0, s.max - 1),
                      used: Math.min(s.used, Math.max(0, s.max - 1)),
                    }))
                  }
                  disabled={slot.max === 0}
                >−</button>
                <span className="spell-slot-count">{slot.max}</span>
                <button
                  className="spell-slot-adj"
                  onClick={() => updateSpellSlot(i, (s) => ({ ...s, max: Math.min(9, s.max + 1) }))}
                  disabled={slot.max >= 9}
                >+</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
