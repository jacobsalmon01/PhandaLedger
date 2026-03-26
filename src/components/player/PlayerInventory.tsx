import { useState } from 'react';
import type { Character } from '../../types/character';

interface Props {
  ch: Character;
}

const COIN_TYPES = [
  { key: 'pp' as const, label: 'PP' },
  { key: 'gp' as const, label: 'GP' },
  { key: 'ep' as const, label: 'EP' },
  { key: 'sp' as const, label: 'SP' },
  { key: 'cp' as const, label: 'CP' },
];

const STAT_LABELS: Record<string, string> = {
  ac: 'AC',
  speed: 'Speed',
  initiative: 'Init',
  'hp.max': 'HP Max',
  'abilities.str': 'STR',
  'abilities.dex': 'DEX',
  'abilities.con': 'CON',
  'abilities.int': 'INT',
  'abilities.wis': 'WIS',
  'abilities.cha': 'CHA',
};

function opLabel(op: string, value: number): string {
  switch (op) {
    case 'add': return value >= 0 ? `+${value}` : `${value}`;
    case 'mul': return `\u00D7${value}`;
    case 'set': return `=${value}`;
    default: return `${value}`;
  }
}

export function PlayerInventory({ ch }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter to coins that have any amount
  const hasGold = COIN_TYPES.some((c) => ch.gold[c.key] > 0);

  return (
    <>
      {/* Gold Display */}
      <div className="pv-section-title">
        <span className="pv-section-title__icon">&#9679;</span>
        Currency
      </div>

      {hasGold ? (
        <div className="pv-gold-display">
          {COIN_TYPES.map((coin) => {
            if (ch.gold[coin.key] === 0) return null;
            return (
              <div key={coin.key} className={`pv-coin pv-coin--${coin.key}`}>
                <div className="pv-coin__icon">{coin.label}</div>
                <span className="pv-coin__amount">{ch.gold[coin.key]}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pv-none">No currency</div>
      )}

      <div className="pv-divider" />

      {/* Items */}
      <div className="pv-section-title">
        <span className="pv-section-title__icon">&#9997;</span>
        Inventory
      </div>

      {ch.inventory.length === 0 ? (
        <div className="pv-none">No items</div>
      ) : (
        <div className="pv-items">
          {ch.inventory.map((item) => {
            const isExpanded = expandedId === item.id;
            const hasDesc = item.description.trim().length > 0;
            const hasMods = item.modifiers.length > 0;
            const expandable = hasDesc || hasMods;

            return (
              <div key={item.id}>
                <div
                  className="pv-item"
                  onClick={expandable ? () => setExpandedId(isExpanded ? null : item.id) : undefined}
                  style={expandable ? undefined : { cursor: 'default' }}
                >
                  <span className="pv-item__equipped">
                    {item.equipped ? '\u2694' : ''}
                  </span>
                  <span className="pv-item__name">{item.name || 'Unnamed'}</span>
                  {item.quantity > 1 && (
                    <span className="pv-item__qty">&times;{item.quantity}</span>
                  )}
                  {item.valuegp > 0 && (
                    <span className="pv-item__value">{item.valuegp} gp</span>
                  )}
                </div>
                {isExpanded && (
                  <>
                    {hasDesc && (
                      <div className="pv-item__desc">{item.description}</div>
                    )}
                    {hasMods && (
                      <div className="pv-item__modifiers">
                        {item.modifiers.map((m, i) => (
                          <span key={i} className="pv-item__modifier-tag">
                            {STAT_LABELS[m.stat] ?? m.stat} {opLabel(m.op, m.value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
