export interface EnemyInstance {
  id: string;
  hp: number;
  maxHp: number;
}

export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  type: 'pc' | 'npc';
  characterId?: string; // links to Character.id for PCs
  enemies?: EnemyInstance[]; // NPC groups with HP tracking
}
