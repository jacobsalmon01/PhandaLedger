export interface MapToken {
  id: string;
  label: string;
  color: string;
  col: number;
  row: number;
  size: number; // grid squares: 1 = Medium, 2 = Large, 3 = Huge, 4 = Gargantuan
  characterId?: string;
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
