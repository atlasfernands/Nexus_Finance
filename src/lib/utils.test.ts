/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, parseBRL } from '../lib/utils';

describe('Financial Utilities', () => {
  it('should format currency correctly for BRL', () => {
    expect(formatCurrency(1000)).toContain('1.000,00');
    expect(formatCurrency(1234.56)).toContain('1.234,56');
  });

  it('should parse BRL string to number', () => {
    expect(parseBRL('R$ 1.000,00')).toBe(1000);
    expect(parseBRL('2.500,50')).toBe(2500.5);
  });
});
