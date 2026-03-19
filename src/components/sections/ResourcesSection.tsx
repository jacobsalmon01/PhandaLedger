import type { Character, TrackedResource, RechargeOn } from '../../types/character';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const RECHARGE_CYCLE: RechargeOn[] = ['long', 'short', 'manual'];
const RECHARGE_LABELS: Record<RechargeOn, string> = { short: 'SR', long: 'LR', manual: '—' };
const RECHARGE_TITLES: Record<RechargeOn, string> = {
  short: 'Short rest',
  long: 'Long rest',
  manual: 'Manual',
};

export function ResourcesSection({ ch, updateSelected }: Props) {
  function addResource() {
    updateSelected((c) => ({
      ...c,
      resources: [
        ...c.resources,
        { id: crypto.randomUUID(), name: '', max: 1, used: 0, recharge: 'long' as RechargeOn },
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

      {ch.resources.length === 0 && (
        <div className="res-empty">
          Track abilities like Channel Divinity, Action Surge, Bardic Inspiration, etc.
        </div>
      )}

      <div className="res-list">
        {ch.resources.map((res) => {
          const available = res.max - res.used;
          return (
            <div key={res.id} className="res-row">
              <input
                className="res-row__name"
                value={res.name}
                placeholder="Ability name…"
                spellCheck={false}
                onChange={(e) => updateResource(res.id, (r) => ({ ...r, name: e.target.value }))}
              />
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
                  {RECHARGE_LABELS[res.recharge]}
                </button>
                <button
                  className="res-remove-btn"
                  title="Remove"
                  onClick={() => removeResource(res.id)}
                >&times;</button>
              </div>
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
