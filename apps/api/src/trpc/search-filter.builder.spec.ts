import { describe, it, expect } from 'vitest';
import { buildSearchWhere, buildFilterCondition, buildWhereClause } from './search-filter.builder';

describe('buildSearchWhere', () => {
  it('builds OR conditions for each field', () => {
    const result = buildSearchWhere('test', ['name', 'description']);
    expect(result).toEqual([
      { name: { contains: 'test', mode: 'insensitive' } },
      { description: { contains: 'test', mode: 'insensitive' } },
    ]);
  });

  it('returns empty array for empty fields', () => {
    const result = buildSearchWhere('test', []);
    expect(result).toEqual([]);
  });
});

describe('buildFilterCondition', () => {
  it('eq', () => {
    expect(buildFilterCondition({ field: 'isActive', operator: 'eq', value: true })).toEqual({
      isActive: true,
    });
  });

  it('ne', () => {
    expect(buildFilterCondition({ field: 'status', operator: 'ne', value: 'draft' })).toEqual({
      status: { not: 'draft' },
    });
  });

  it('gt', () => {
    expect(buildFilterCondition({ field: 'price', operator: 'gt', value: 100 })).toEqual({
      price: { gt: 100 },
    });
  });

  it('gte', () => {
    expect(buildFilterCondition({ field: 'price', operator: 'gte', value: 100 })).toEqual({
      price: { gte: 100 },
    });
  });

  it('lt', () => {
    expect(buildFilterCondition({ field: 'price', operator: 'lt', value: 500 })).toEqual({
      price: { lt: 500 },
    });
  });

  it('lte', () => {
    expect(buildFilterCondition({ field: 'price', operator: 'lte', value: 500 })).toEqual({
      price: { lte: 500 },
    });
  });

  it('contains', () => {
    expect(buildFilterCondition({ field: 'name', operator: 'contains', value: 'hello' })).toEqual({
      name: { contains: 'hello', mode: 'insensitive' },
    });
  });

  it('startsWith', () => {
    expect(buildFilterCondition({ field: 'slug', operator: 'startsWith', value: 'prod' })).toEqual({
      slug: { startsWith: 'prod', mode: 'insensitive' },
    });
  });

  it('endsWith', () => {
    expect(
      buildFilterCondition({ field: 'email', operator: 'endsWith', value: '@test.com' }),
    ).toEqual({ email: { endsWith: '@test.com', mode: 'insensitive' } });
  });

  it('in with array', () => {
    expect(
      buildFilterCondition({ field: 'status', operator: 'in', value: ['active', 'pending'] }),
    ).toEqual({ status: { in: ['active', 'pending'] } });
  });

  it('in with single value wraps in array', () => {
    expect(buildFilterCondition({ field: 'status', operator: 'in', value: 'active' })).toEqual({
      status: { in: ['active'] },
    });
  });

  it('notIn', () => {
    expect(
      buildFilterCondition({ field: 'status', operator: 'notIn', value: ['deleted'] }),
    ).toEqual({ status: { notIn: ['deleted'] } });
  });

  it('between with valid array', () => {
    expect(buildFilterCondition({ field: 'price', operator: 'between', value: [10, 100] })).toEqual(
      { price: { gte: 10, lte: 100 } },
    );
  });

  it('between throws for invalid value', () => {
    expect(() =>
      buildFilterCondition({ field: 'price', operator: 'between', value: [10] }),
    ).toThrow();
    expect(() =>
      buildFilterCondition({ field: 'price', operator: 'between', value: 'invalid' }),
    ).toThrow();
  });

  it('isNull', () => {
    expect(buildFilterCondition({ field: 'deletedAt', operator: 'isNull', value: null })).toEqual({
      deletedAt: null,
    });
  });

  it('isNotNull', () => {
    expect(
      buildFilterCondition({ field: 'deletedAt', operator: 'isNotNull', value: null }),
    ).toEqual({ deletedAt: { not: null } });
  });
});

describe('buildWhereClause', () => {
  it('returns existing where when no search/filter', () => {
    const result = buildWhereClause({ existingWhere: { isActive: true } });
    expect(result).toEqual({ isActive: true });
  });

  it('adds OR from search', () => {
    const result = buildWhereClause({
      existingWhere: {},
      searchKeyword: 'test',
      searchFields: ['name', 'description'],
    });
    expect(result.OR).toEqual([
      { name: { contains: 'test', mode: 'insensitive' } },
      { description: { contains: 'test', mode: 'insensitive' } },
    ]);
  });

  it('removes legacy search key from where', () => {
    const result = buildWhereClause({
      existingWhere: { search: 'test', isActive: true },
      searchKeyword: 'test',
      searchFields: ['name'],
    });
    expect(result.search).toBeUndefined();
    expect(result.isActive).toBe(true);
  });

  it('applies single filter directly', () => {
    const result = buildWhereClause({
      existingWhere: {},
      filters: [{ field: 'isActive', operator: 'eq', value: true }],
    });
    expect(result).toEqual({ isActive: true });
  });

  it('applies multiple filters as AND', () => {
    const result = buildWhereClause({
      existingWhere: {},
      filters: [
        { field: 'isActive', operator: 'eq', value: true },
        { field: 'price', operator: 'gt', value: 100 },
      ],
    });
    expect(result.AND).toEqual([{ isActive: true }, { price: { gt: 100 } }]);
  });

  it('merges with existing AND', () => {
    const result = buildWhereClause({
      existingWhere: { AND: { status: 'active' } },
      filters: [{ field: 'isActive', operator: 'eq', value: true }],
    });
    expect(result.AND).toEqual([{ status: 'active' }, { isActive: true }]);
  });

  it('combines search and filter', () => {
    const result = buildWhereClause({
      existingWhere: {},
      searchKeyword: 'test',
      searchFields: ['name'],
      filters: [{ field: 'isActive', operator: 'eq', value: true }],
    });
    expect(result.OR).toEqual([{ name: { contains: 'test', mode: 'insensitive' } }]);
    expect(result.isActive).toBe(true);
  });

  it('ignores search when no keyword', () => {
    const result = buildWhereClause({
      existingWhere: {},
      searchFields: ['name'],
    });
    expect(result.OR).toBeUndefined();
  });
});
