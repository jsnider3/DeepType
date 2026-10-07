import { describe, expect, it } from 'vitest';
import { charValue, parseBuckets, parseNameList, parseThemes, wordValue } from '../src/data/words';

describe('word files', () => {
  it('parses #PREFIX-n buckets ending in #END, uppercased', () => {
    const b = parseBuckets('#DIFF-3\r\nlee\r\nGAL\r\n#END\r\n\r\n#DIFF-4\nEGGS\n#END\n', 'DIFF');
    expect([...b.keys()]).toEqual([3, 4]);
    expect(b.get(3)).toEqual(['LEE', 'GAL']);
  });

  it('parses themes: name line, #THEME, words, #END', () => {
    const t = parseThemes('BIRDS\r\n#THEME\r\nrobin \r\nWren\r\n#END\r\n\r\nEMPTY\n#THEME\n#END\n');
    expect(t).toEqual([{ name: 'BIRDS', words: ['ROBIN', 'WREN'] }]);
  });

  it('trims name lists and drops blank lines', () => {
    expect(parseNameList('HMS Aberdeen\r\nRN Cromwell \r\n\r\n')).toEqual(['HMS Aberdeen', 'RN Cromwell']);
  });

  it('weights characters by the letter scoring table', () => {
    expect([...'ADEFGHJKLS'].map(charValue)).toEqual(Array(10).fill(1));
    expect([...'BIMNRTUVY'].map(charValue)).toEqual(Array(9).fill(2));
    expect([...'COPQWXZ0123456789'].map(charValue)).toEqual(Array(17).fill(3));
    expect(charValue('!')).toBe(4);
  });

  it('sums word values (SHARK = 6, scored x15 = 90 points)', () => {
    expect(wordValue('SHARK')).toBe(6);
    expect(wordValue('shark')).toBe(6);
  });
});
