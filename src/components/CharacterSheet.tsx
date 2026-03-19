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

export function CharacterSheet() {
  const { selected, updateSelected } = useStore();

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
        <IdentitySection ch={selected} updateSelected={updateSelected} />
        <AbilityScoresSection ch={selected} updateSelected={updateSelected} />
        <DefenseSection ch={selected} updateSelected={updateSelected} />
        <WeaponsSection ch={selected} updateSelected={updateSelected} />
        <SpellsSection ch={selected} updateSelected={updateSelected} />
        <div className="slots-resources-row">
          <SpellSlotsSection ch={selected} updateSelected={updateSelected} />
          <ResourcesSection ch={selected} updateSelected={updateSelected} />
        </div>
        <InventorySection ch={selected} updateSelected={updateSelected} />
      </div>
    </main>
  );
}
