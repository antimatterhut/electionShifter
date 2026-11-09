import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../../src/domain/version.ts';

describe('version', () => {
  it('exports schema version 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
