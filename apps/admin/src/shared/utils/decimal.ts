/**
 * Helper to safely convert Prisma Decimal to number
 *
 * Prisma Decimal fields may be serialized as:
 * - string (e.g., "99.99")
 * - object (Decimal.js instance)
 * - number (rare, but possible)
 *
 * @param value - The Decimal value to convert
 * @returns A safe number for arithmetic operations
 */
export const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value && typeof value === 'object') {
    // Decimal.js object has toString() method
    return parseFloat(value.toString()) || 0;
  }
  return 0;
};

/**
 * Format Decimal as currency string
 *
 * @param value - The Decimal value
 * @param prefix - Currency prefix (default: '¥')
 * @returns Formatted currency string (e.g., '¥99.99')
 */
export const formatCurrency = (value: any, prefix = '¥'): string => {
  return `${prefix}${toNumber(value).toFixed(2)}`;
};
