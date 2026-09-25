export type StatsFieldSchema = 'string' | 'number' | 'boolean'
  | { array: StatsFieldSchema }
  | { nullable: StatsFieldSchema }
  | { fields: Record<string, StatsFieldSchema>; optional?: readonly string[] };
