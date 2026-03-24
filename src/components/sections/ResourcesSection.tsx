import { useState } from 'react';
import type { Character, TrackedResource, RechargeOn } from '../../types/character';
import { uuid } from '../../utils/uuid';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const RECHARGE_CYCLE: RechargeOn[] = ['long', 'short', 'manual'];
const RECHARGE_LABELS: Record<RechargeOn, string> = { short: 'Short Rest', long: 'Long Rest', manual: 'Manual' };
const RECHARGE_TITLES: Record<RechargeOn, string> = {
  short: 'Recharges on a short rest — click to change',
  long:  'Recharges on a long rest — click to change',
  manual: 'Restore manually — click to change',
};

export function ResourcesSection({ ch, updateSelected }: Props) {
  const [expandedDescId, setExpandedDescId] = useState<string | null>(null);

  function addResource() {
    updateSelected((c) => ({
      ...c,
      resources: [
        ...c.resources,
        { id: uuid(), name: '', description: '', max: 1, used: 0, recharge: 'long' as RechargeOn },
      ],
    }));
  }

  function updateResource(id: string, updater: (r: TrackedResource) => TrackedResource) {
    updateSelected((c) => ({
      ...c,
      resources: c.resources.map((r) => (r.id === id ? updater({ ...r }) : r)),
    }));
  }

  function removeResource(id: string) {
    updateSelected((c) => ({
      ...c,
      resources: c.resources.filter((r) => r.id !== id),
    }));
  }

  return (
    <section className="section">
      <h2 className="section__heading">Resources</h2>
      <p className="res-hint">Click a pip to expend · click again to restore · click the badge to cycle recharge type</p>

      {ch.resources.length === 0 && (
        <div className="res-empty">
          Track abilities like Channel Divinity, Action Surge, Bardic Inspiration, etc.
        </div>
      )}

      <div className="res-list">
        {ch.resources.map((res) => {
          const available = res.max - res.used;
          return (
            <div key={res.id} className="res-row-wrap">
              <div className="res-row">
                <input
                  className="res-row__name"
                  value={res.name}
                  placeholder="Ability name…"
                  spellCheck={false}
                  onChange={(e) => updateResource(res.id, (r) => ({ ...r, name: e.target.value }))}
                />
                <button
                  className={`spell-desc-btn res-desc-btn${expandedDescId === res.id ? ' spell-desc-btn--open' : ''}`}
                  title={expandedDescId === res.id ? 'Hide description' : 'Add/view description'}
                  aria-expanded={expandedDescId === res.id}
                  onClick={() => setExpandedDescId(expandedDescId === res.id ? null : res.id)}
                >ⓘ</button>
                <div className="res-row__track">
                <div className="res-row__pips">
                  {Array.from({ length: res.max }, (_, pipIdx) => {
                    const isFilled = pipIdx < available;
                    return (
                      <button
                        key={pipIdx}
                        className={`res-pip${isFilled ? ' res-pip--available' : ' res-pip--used'}`}
                        title={isFilled ? 'Expend' : 'Restore'}
                        onClick={() =>
                          updateResource(res.id, (r) =>
                            isFilled
                              ? { ...r, used: Math.min(r.used + 1, r.max) }
                              : { ...r, used: Math.max(r.used - 1, 0) }
                          )
                        }
                      />
                    );
                  })}
                </div>
                <div className={`res-row__count${available === 0 ? ' res-row__count--spent' : available === res.max ? ' res-row__count--full' : ''}`}>
                  <span className="res-row__count-avail">{available}</span>
                  <span className="res-row__count-sep">/</span>
                  <span className="res-row__count-max">{res.max}</span>
                </div>
              </div>
              <div className="res-row__controls">
                <div className="spell-slot-adj-row">
                  <button
                    className="spell-slot-adj"
                    onClick={() =>
                      updateResource(res.id, (r) => ({
                        ...r,
                        max: Math.max(1, r.max - 1),
                        used: Math.min(r.used, Math.max(1, r.max - 1)),
                      }))
                    }
                    disabled={res.max <= 1}
                  >−</button>
                  <span className="spell-slot-count">{res.max}</span>
                  <button
                    className="spell-slot-adj"
                    onClick={() => updateResource(res.id, (r) => ({ ...r, max: r.max + 1 }))}
                    disabled={res.max >= 20}
                  >+</button>
                </div>
                <button
                  className="res-recharge-tag"
                  title={`Recharges on: ${RECHARGE_TITLES[res.recharge]}. Click to change.`}
                  onClick={() =>
                    updateResource(res.id, (r) => ({
                      ...r,
                      recharge: RECHARGE_CYCLE[(RECHARGE_CYCLE.indexOf(r.recharge) + 1) % RECHARGE_CYCLE.length],
                    }))
                  }
                  data-recharge={res.recharge}
                >
                  <span className="res-recharge-tag__icon">↺</span>
                  {RECHARGE_LABELS[res.recharge]}
                </button>
                <button
                  className="res-remove-btn"
                  title="Remove"
                  onClick={() => removeResource(res.id)}
                >&times;</button>
              </div>
              </div>
              {expandedDescId === res.id && (
                <div className="res-desc-panel">
                  <textarea
                    className="res-desc-panel__input"
                    value={res.description}
                    placeholder="Describe this ability — effects, rules, range, etc."
                    rows={2}
                    onChange={(e) => updateResource(res.id, (r) => ({ ...r, description: e.target.value }))}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="res-add-btn" onClick={addResource}>
        + Add Resource
      </button>
    </section>
  );
}
