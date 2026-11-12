import { FilterCondition } from './search-filter.types';
import { ValidationException } from '../core/exceptions';

/**
 * Build Prisma OR conditions from search keyword and fields.
 */
export function buildSearchWhere(keyword: string, fields: string[]): Record<string, any>[] {
  return fields.map((field) => ({
    [field]: { contains: keyword, mode: 'insensitive' },
  }));
}

/**
 * Convert a single FilterCondition to a Prisma where fragment.
 */
export function buildFilterCondition(condition: FilterCondition): Record<string, any> {
  const { field, operator, value } = condition;

  switch (operator) {
    case 'eq':
      return { [field]: value };
    case 'ne':
      return { [field]: { not: value } };
    case 'gt':
      return { [field]: { gt: value } };
    case 'gte':
      return { [field]: { gte: value } };
    case 'lt':
      return { [field]: { lt: value } };
    case 'lte':
      return { [field]: { lte: value } };
    case 'contains':
      return { [field]: { contains: value, mode: 'insensitive' } };
    case 'startsWith':
      return { [field]: { startsWith: value, mode: 'insensitive' } };
    case 'endsWith':
      return { [field]: { endsWith: value, mode: 'insensitive' } };
    case 'in':
      return { [field]: { in: Array.isArray(value) ? value : [value] } };
    case 'notIn':
      return { [field]: { notIn: Array.isArray(value) ? value : [value] } };
    case 'between':
      if (!Array.isArray(value) || value.length !== 2) {
        throw new ValidationException(`'between' operator requires an array of exactly 2 values`, {
          field,
          operator,
          value,
        });
      }
      return { [field]: { gte: value[0], lte: value[1] } };
    case 'isNull':
      return { [field]: null };
    case 'isNotNull':
      return { [field]: { not: null } };
    default:
      throw new ValidationException(`Unsupported filter operator: ${operator}`, {
        field,
        operator,
      });
  }
}

/**
 * Build a combined Prisma where clause from search and filter inputs.
 * Merges with any existing `where` passed by the caller.
 */
export function buildWhereClause(opts: {
  existingWhere?: any;
  searchKeyword?: string;
  searchFields?: string[];
  filters?: FilterCondition[];
}): Record<string, any> {
  const where: any = { ...opts.existingWhere };

  // Remove legacy `search` key from where if present (backward compat)
  delete where.search;

  // Search: add OR conditions
  if (opts.searchKeyword && opts.searchFields && opts.searchFields.length > 0) {
    where.OR = buildSearchWhere(opts.searchKeyword, opts.searchFields);
  }

  // Filter: add AND conditions for each filter
  if (opts.filters && opts.filters.length > 0) {
    const filterConditions = opts.filters.map(buildFilterCondition);

    if (where.AND) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : [where.AND]), ...filterConditions];
    } else if (filterConditions.length === 1) {
      // Single filter: merge directly into where
      Object.assign(where, filterConditions[0]);
    } else {
      where.AND = filterConditions;
    }
  }

  return where;
}
