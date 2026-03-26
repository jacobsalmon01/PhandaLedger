import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { PlayerCharacterSelect } from './PlayerCharacterSelect';
import { PlayerFolio } from './PlayerFolio';
import '../../player-view.css';

export type PlayerTab = 'hero' | 'arms' | 'pack';

export function PlayerView() {
  const { characters, selected, selectCharacter } = useStore();
  const [activeTab, setActiveTab] = useState<PlayerTab>('hero');

  if (!selected) {
    return (
      <div className="pv-root">
        {characters.length > 0 ? (
          <PlayerCharacterSelect
            characters={characters}
            selectedId={null}
            onSelect={selectCharacter}
          />
        ) : null}
        <div className="pv-folio">
          <div className="pv-folio__corner pv-folio__corner--tl" />
          <div className="pv-folio__corner pv-folio__corner--tr" />
          <div className="pv-folio__corner pv-folio__corner--bl" />
          <div className="pv-folio__corner pv-folio__corner--br" />
          <div className="pv-empty">
            <div className="pv-empty__icon">&#10022;</div>
            <div className="pv-empty__title">Waiting for Party Data</div>
            <div className="pv-empty__text">
              The DM&rsquo;s screen will populate this view once the session is live.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pv-root">
      {characters.length > 1 && (
        <PlayerCharacterSelect
          characters={characters}
          selectedId={selected.id}
          onSelect={selectCharacter}
        />
      )}
      <PlayerFolio
        character={selected}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
