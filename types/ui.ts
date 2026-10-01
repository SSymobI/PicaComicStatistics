import type { AuthUser } from './auth';
import type { SummaryMetric } from './summary';

export interface AppButtonProps {
  type?: 'button' | 'submit';
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface StatusBannerProps {
  tone?: 'info' | 'danger' | 'success';
  title?: string;
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
}

export interface SummarySectionProps {
  id: string;
  title: string;
  description?: string;
  loading?: boolean;
  locked?: boolean;
  metrics?: SummaryMetric[];
}

export interface UserProfileCardProps {
  user?: AuthUser;
}

export type StatsChartKind = 'wordcloud' | 'pie' | 'bar';

export interface StatsChartProps {
  kind: StatsChartKind;
  items: import('./stats').WordStatItem[] | import('./stats').YearBucket[] | import('./stats').UpdateBucket[];
  height?: string;
}
