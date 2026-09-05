import { describe, it, expect } from 'vitest';
import { resolveRound } from './rules.js';

describe('resolveRound', () => {
  it('keo beats bao', () => {
    expect(resolveRound('keo', 'bao')).toBe('a');
    expect(resolveRound('bao', 'keo')).toBe('b');
  });

  it('bua beats keo', () => {
    expect(resolveRound('bua', 'keo')).toBe('a');
    expect(resolveRound('keo', 'bua')).toBe('b');
  });

  it('bao beats bua', () => {
    expect(resolveRound('bao', 'bua')).toBe('a');
    expect(resolveRound('bua', 'bao')).toBe('b');
  });

  it('same type is a draw', () => {
    expect(resolveRound('keo', 'keo')).toBe('draw');
    expect(resolveRound('bua', 'bua')).toBe('draw');
    expect(resolveRound('bao', 'bao')).toBe('draw');
  });
});
