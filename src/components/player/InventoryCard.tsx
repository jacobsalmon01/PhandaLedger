import { useState } from 'react';
import type { Character } from '../../types/character';

interface Props {
  ch: Character;
}

export function InventoryCard({ ch }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const equipped = ch.inventory.filter((i) => i.equipped);
  const carried = ch.inventory.filter((i) => !i.equipped);

  // Total gold in GP
  const totalGP = ch.gold.pp * 10 + ch.gold.gp + ch.gold.ep * 0.5 + ch.gold.sp * 0.1 + ch.gold.cp * 0.01;

  return (
    <div className="pv-card pv-card--inventory">
      <h2 className="pv-card__title">Inventory</h2>

      {/* ── Gold purse ── */}
      <div className="pv-gold">
        {ch.gold.pp > 0 && <span className="pv-gold__coin pv-gold__coin--pp">{ch.gold.pp} PP</span>}
        <span className="pv-gold__coin pv-gold__coin--gp">{ch.gold.gp} GP</span>
        {ch.gold.ep > 0 && <span className="pv-gold__coin pv-gold__coin--ep">{ch.gold.ep} EP</span>}
        {ch.gold.sp > 0 && <span className="pv-gold__coin pv-gold__coin--sp">{ch.gold.sp} SP</span>}
        {ch.gold.cp > 0 && <span className="pv-gold__coin pv-gold__coin--cp">{ch.gold.cp} CP</span>}
        {totalGP > 0 && ch.gold.pp + ch.gold.ep + ch.gold.sp + ch.gold.cp > 0 && (
          <span className="pv-gold__total">{'\u2248'} {Math.round(totalGP * 100) / 100} GP</span>
        )}
      </div>

      {/* ── Equipped ── */}
      {equipped.length > 0 && (
        <div className="pv-inv-section">
          <div className="pv-inv-section__label">Equipped</div>
          {equipped.map((item) => (
            <div key={item.id} className="pv-inv-item-wrap">
              <button
                className={`pv-inv-item pv-inv-item--equipped${item.description ? ' pv-inv-item--expandable' : ''}`}
                onClick={() => item.description && setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <span className="pv-inv-item__icon">{'\u25c6'}</span>
                <span className="pv-inv-item__name">{item.name}</span>
                {item.quantity > 1 && <span className="pv-inv-item__qty">{'\u00d7'}{item.quantity}</span>}
                {item.description && <span className="pv-inv-item__info">{expandedId === item.id ? '\u25be' : '\u25b8'}</span>}
              </button>
              {expandedId === item.id && item.description && (
                <div className="pv-inv-item__desc">{item.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Carried ── */}
      {carried.length > 0 && (
        <div className="pv-inv-section">
          <div className="pv-inv-section__label">Carried</div>
          {carried.map((item) => (
            <div key={item.id} className="pv-inv-item-wrap">
              <button
                className={`pv-inv-item${item.description ? ' pv-inv-item--expandable' : ''}`}
                onClick={() => item.description && setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <span className="pv-inv-item__name">{item.name}</span>
                {item.quantity > 1 && <span className="pv-inv-item__qty">{'\u00d7'}{item.quantity}</span>}
                {item.valuegp > 0 && <span className="pv-inv-item__value">{item.valuegp} gp</span>}
                {item.description && <span className="pv-inv-item__info">{expandedId === item.id ? '\u25be' : '\u25b8'}</span>}
              </button>
              {expandedId === item.id && item.description && (
                <div className="pv-inv-item__desc">{item.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {ch.inventory.length === 0 && (
        <div className="pv-card__empty">No items</div>
      )}
    </div>
  );
}
