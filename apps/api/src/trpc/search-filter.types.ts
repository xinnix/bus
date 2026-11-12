import { z } from 'zod';

// --- Search ---
export interface SearchInput {
  keyword?: string;
  fields?: string[];
}

export const SearchSchema = z.object({
  keyword: z.string().optional(),
  fields: z.array(z.string()).optional(),
});

// --- Filter ---
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isNull'
  | 'isNotNull';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

export const FilterConditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'eq',
    'ne',
    'gt',
    'gte',
    'lt',
    'lte',
    'contains',
    'startsWith',
    'endsWith',
    'in',
    'notIn',
    'between',
    'isNull',
    'isNotNull',
  ]),
  value: z.any(),
});

export const FilterSchema = z.array(FilterConditionSchema).optional();
