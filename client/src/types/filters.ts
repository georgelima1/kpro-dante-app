export type FilterType =
  | "hpf"
  | "lpf"
  | "parametric"
  | "low_shelf"
  | "high_shelf"
  | "tilt_shelf"
  | "all_pass"
  | "band_pass"
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