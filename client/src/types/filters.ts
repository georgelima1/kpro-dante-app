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

export type SpeakerFilter = FilterItem & {
  crossoverFamily?: CrossoverFamily;
};

export type CrossoverFamily = "butterworth" | "linkwitz_riley" | "bessel";

export type FilterItem = {
  id: number;
  enabled: boolean;
  type: FilterType;
  freqHz: number;
  q: number;
  gainDb: number;
  slope?: FilterSlope;
  crossoverFamily?: CrossoverFamily;
};

export type FiltersEditorProps = {
  title?: string;
  subtitle?: string;
  filters: FilterItem[];
  selectedId: number | null;
  onSelectedIdChange: (id: number) => void;
  onLocalChange: (filterId: number, patch: Partial<FilterItem>) => void;
  onCommitChange: (filterId: number, patch: Partial<FilterItem>) => void;
  showHeader?: boolean;
  embedded?: boolean;
  chartHeightClassName?: string;
  chartClassName?: string;
};