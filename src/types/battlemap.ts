export interface MapToken {
  id: string;
  label: string;
  color: string;
  col: number;
  row: number;
  size: number; // grid squares: 0.5 = Tiny, 1 = Small/Medium, 2 = Large, 3 = Huge, 4 = Gargantuan
  characterId?: string;
  initiativeEntryId?: string; // links to InitiativeEntry.id for HP tracking
  initiativeEnemyId?: string; // links to EnemyInstance.id within that entry
}

export interface MapTemplate {
  id: string;
  type: 'circle' | 'cone' | 'line' | 'cube';
  col: number;
  row: number;
  size: number;     // feet (e.g. 20 = 20ft radius, 30 = 30ft cone length)
  rotation: number; // degrees; 0 = pointing right
  color: string;
}
