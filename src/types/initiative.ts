export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  type: 'pc' | 'npc';
  characterId?: string; // links to Character.id for PCs
}
