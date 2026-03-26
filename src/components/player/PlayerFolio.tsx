import type { Character } from '../../types/character';
import type { PlayerTab } from './PlayerView';
import { PlayerHeader } from './PlayerHeader';
import { PlayerHPDisplay } from './PlayerHPDisplay';
import { PlayerConditions } from './PlayerConditions';
import { PlayerStats } from './PlayerStats';
import { PlayerResources } from './PlayerResources';
import { PlayerCombat } from './PlayerCombat';
import { PlayerSpells } from './PlayerSpells';
import { PlayerInventory } from './PlayerInventory';

interface Props {
  character: Character;
  activeTab: PlayerTab;
  onTabChange: (tab: PlayerTab) => void;
}

const TABS: { id: PlayerTab; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'arms', label: 'Arms' },
  { id: 'pack', label: 'Pack' },
];

export function PlayerFolio({ character, activeTab, onTabChange }: Props) {
  return (
    <div className="pv-folio">
      {/* Metal corner brackets with rivets */}
      <div className="pv-folio__corner pv-folio__corner--tl" />
      <div className="pv-folio__corner pv-folio__corner--tr" />
      <div className="pv-folio__corner pv-folio__corner--bl" />
      <div className="pv-folio__corner pv-folio__corner--br" />
      <div className="pv-folio__rivet pv-folio__rivet--tl" />
      <div className="pv-folio__rivet pv-folio__rivet--tr" />
      <div className="pv-folio__rivet pv-folio__rivet--bl" />
      <div className="pv-folio__rivet pv-folio__rivet--br" />

      {/* Death overlay */}
      {character.dead && (
        <div className="pv-death-overlay">
          <div className="pv-death-overlay__content">
            <span className="pv-death-overlay__skull">&#9760;</span>
            <span className="pv-death-overlay__name">
              {character.name || 'The Adventurer'}
            </span>
            <span className="pv-death-overlay__tagline">
              This adventurer has fallen.
            </span>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <nav className="pv-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`pv-tab${activeTab === tab.id ? ' pv-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Parchment content area */}
      <div className="pv-parchment" key={activeTab}>
        <div className="pv-page-enter">
          {activeTab === 'hero' && (
            <>
              <PlayerHeader ch={character} />
              <PlayerHPDisplay ch={character} />
              <PlayerConditions ch={character} />
              <PlayerStats ch={character} />
              <PlayerResources ch={character} />
            </>
          )}
          {activeTab === 'arms' && (
            <>
              <PlayerCombat ch={character} />
              <PlayerSpells ch={character} />
            </>
          )}
          {activeTab === 'pack' && (
            <PlayerInventory ch={character} />
          )}
        </div>
      </div>
    </div>
  );
}
