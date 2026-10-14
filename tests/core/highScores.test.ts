import { describe, expect, it } from 'vitest';
import { addScore, parseScores, sanitizeName, type HighScore } from '../../src/core/highScores';

const e = (name: string, score: number): HighScore => ({ name, score, percent: 50, seconds: 60, date: '2026-10-14' });

describe('sanitizeName', () => {
  it('trims and caps length at 12', () => {
    expect(sanitizeName('   Kelvin Sidharta Sie  ')).toBe('Kelvin Sidha');
  });

  it('falls back to "Sopir" when empty', () => {
    expect(sanitizeName('   ')).toBe('Sopir');
  });
});

describe('addScore', () => {
  it('keeps the list sorted best first', () => {
    const list = addScore([e('a', 100), e('b', 300)], e('c', 200));
    expect(list.map((x) => x.name)).toEqual(['b', 'c', 'a']);
  });

  it('keeps only the top 10', () => {
    let list: HighScore[] = [];
    for (let i = 1; i <= 12; i++) list = addScore(list, e(`p${i}`, i * 10));
    expect(list).toHaveLength(10);
    expect(list[0]!.score).toBe(120);
    expect(list[9]!.score).toBe(30);
  });

  it('on a tie the earlier score stays ahead', () => {
    const list = addScore([e('old', 100)], e('new', 100));
    expect(list.map((x) => x.name)).toEqual(['old', 'new']);
  });

  it('does not mutate the input list', () => {
    const before = [e('a', 100)];
    addScore(before, e('b', 200));
    expect(before).toHaveLength(1);
  });
});

describe('parseScores', () => {
  it('returns [] for missing or broken data', () => {
    expect(parseScores(null)).toEqual([]);
    expect(parseScores('not json')).toEqual([]);
    expect(parseScores('{"a":1}')).toEqual([]);
  });

  it('keeps the optional vehicle field and accepts old entries without it', () => {
    const withVehicle = { ...e('a', 10), vehicle: 'wheel-loader' };
    expect(parseScores(JSON.stringify([withVehicle, e('b', 5)]))).toEqual([withVehicle, e('b', 5)]);
  });

  it('drops malformed entries and keeps valid ones', () => {
    const raw = JSON.stringify([e('ok', 10), { name: 5 }, { name: 'x', score: 'high' }]);
    expect(parseScores(raw)).toEqual([e('ok', 10)]);
  });
});
