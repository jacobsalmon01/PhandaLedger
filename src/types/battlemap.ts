export interface MapToken {
  id: string;
  label: string;
  color: string;
  col: number;
  row: number;
  size: number; // grid squares: 0.5 = Tiny, 1 = Small/Medium, 2 = Large, 3 = Huge, 4 = Gargantuan
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

export type AmbientLightLevel = 'bright' | 'dim' | 'dark';

export interface MapLightSource {
  id: string;
  label: string;
  col: number;
  row: number;
  brightRadius: number;   // feet (e.g. 20)
  dimRadius: number;       // additional dim feet beyond bright (e.g. 20)
  attachedTokenId?: string;
}
