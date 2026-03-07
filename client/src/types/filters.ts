export type FilterType =
  | "hpf"
  | "lpf"
  | "parametric"
  | "lowShelf"
  | "highShelf"
  | "tiltShelf"
  | "allPass"
  | "bandPass"
  | "notch";

export type FilterSlope = 6 | 12 | 18 | 24 | 36 | 48;

export type FilterBand = {
  id: number;
  enabled: boolean;
  type: FilterType;
  frequency: number;
  gain: number;
  q: number;
  slope?: FilterSlope;
};