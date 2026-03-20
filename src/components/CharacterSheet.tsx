import { useState } from 'react';
import { useStore } from '../store/useStore';
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
  const { selected, updateSelected } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  if (!selected) {
    return (
      <main className="main">
        <div className="empty-state">
          <div className="empty-state__icon">📜</div>
          <div className="empty-state__title">No Adventurer Selected</div>
          <div className="empty-state__text">
            Add a new adventurer to the party roster, or select an existing one
            to view their record.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
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
            <InventorySection ch={selected} updateSelected={updateSelected} />
          )}
        </div>
      </div>
    </main>
  );
}
