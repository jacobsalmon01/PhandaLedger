import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { isPlayerMode } from '../store/wsClient';
import { CharacterHeader } from './sections/CharacterHeader';
import { IdentitySection } from './sections/IdentitySection';
import { AbilityScoresSection } from './sections/AbilityScoresSection';
import { DefenseSection } from './sections/DefenseSection';
import { HitPointsSection } from './sections/HitPointsSection';
import { SpellSlotsSection } from './sections/SpellSlotsSection';
import { ResourcesSection } from './sections/ResourcesSection';
import { WeaponsSection } from './sections/WeaponsSection';
import { SpellsSection } from './sections/SpellsSection';
import { InventorySection } from './sections/InventorySection';

type Tab = 'stats' | 'combat' | 'spells' | 'character' | 'inventory';

const TABS: { id: Tab; label: string }[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'combat', label: 'Combat' },
  { id: 'spells', label: 'Spells' },
  { id: 'character', label: 'Character' },
  { id: 'inventory', label: 'Inventory' },
];

export function CharacterSheet() {
  const { selected, characters, updateSelected, transferItem } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  const resurrect = useCallback(() => {
    updateSelected((c) => ({
      ...c,
      dead: false,
      hp: { ...c.hp, current: 1 },
      deathSaves: { successes: 0, failures: 0 },
    }));
  }, [updateSelected]);

  if (!selected) {
    return (
      <main className="main">
        <div className="empty-state">
          {isPlayerMode ? (
            <>
              <div className="empty-state__icon">✦</div>
              <div className="empty-state__title">Waiting for Party Data</div>
              <div className="empty-state__text">
                The DM's screen will populate this view once the session is live.
              </div>
            </>
          ) : (
            <>
              <div className="empty-state__icon">📜</div>
              <div className="empty-state__title">No Adventurer Selected</div>
              <div className="empty-state__text">
                Add a new adventurer to the party roster, or select an existing one
                to view their record.
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      {selected.dead && (
        <div className="dead-overlay">
          <div className="dead-overlay__content">
            <span className="dead-overlay__skull">☠</span>
            <span className="dead-overlay__name">{selected.name || 'The Adventurer'}</span>
            <span className="dead-overlay__tagline">This adventurer has fallen.</span>
            <button className="dead-overlay__resurrect" onClick={resurrect}>
              Resurrect
            </button>
          </div>
        </div>
      )}
      <div className="main-inner" key={selected.id}>
        <CharacterHeader ch={selected} updateSelected={updateSelected} />
        <HitPointsSection ch={selected} updateSelected={updateSelected} />

        <nav className="sheet-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`sheet-tab${activeTab === tab.id ? ' sheet-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sheet-tab-content">
          {activeTab === 'stats' && (
            <AbilityScoresSection ch={selected} updateSelected={updateSelected} />
          )}
          {activeTab === 'combat' && (
            <>
              <DefenseSection ch={selected} updateSelected={updateSelected} />
              <WeaponsSection ch={selected} updateSelected={updateSelected} />
            </>
          )}
          {activeTab === 'spells' && (
            <>
              <SpellsSection ch={selected} updateSelected={updateSelected} />
              <SpellSlotsSection ch={selected} updateSelected={updateSelected} />
            </>
          )}
          {activeTab === 'character' && (
            <>
              <IdentitySection ch={selected} updateSelected={updateSelected} />
              <ResourcesSection ch={selected} updateSelected={updateSelected} />
            </>
          )}
          {activeTab === 'inventory' && (
            <InventorySection
              ch={selected}
              characters={characters}
              updateSelected={updateSelected}
              onTransfer={transferItem}
            />
          )}
        </div>
      </div>
    </main>
  );
}
