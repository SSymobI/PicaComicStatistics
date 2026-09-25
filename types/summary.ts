export interface SummaryMetric {
  label: string;
  value: string | number;
  note?: string;
}

export interface SummarySection {
  id: string;
  title: string;
  description?: string;
  state?: 'ready' | 'loading' | 'empty' | 'locked' | 'error';
  metrics?: SummaryMetric[];
}

export interface SummaryViewModel {
  generatedAt?: string;
  total: number;
  sections: SummarySection[];
  aiShort?: string;
  aiDetail?: string;
}
