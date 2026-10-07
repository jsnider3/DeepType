import { describe, expect, it } from 'vitest';
import { child, childrenOf, decodeEntities, parsePXml } from '../src/data/pxml';

describe('parsePXml (tolerant PopCap pseudo-XML)', () => {
  it('trims padded leaf values', () => {
    const root = parsePXml('<Default><MinSpeed>\t0.300000\t</MinSpeed></Default>');
    expect(child(child(root, 'Default')!, 'MinSpeed')!.text).toBe('0.300000');
  });

  it('treats an open tag followed by any close tag as a leaf (abyss.xml typo)', () => {
    const root = parsePXml('<Level><MinDiff>\t4\t</MaxDiff><MaxDiff>7</MaxDiff></Level>');
    const level = child(root, 'Level')!;
    expect(level.children.map((c) => [c.tag, c.text])).toEqual([['MinDiff', '4'], ['MaxDiff', '7']]);
  });

  it('parses empty open/close pairs as flags', () => {
    const root = parsePXml('<Wave><FirstWave>\t</FirstWave><Enemy Type = "Blue"></Enemy></Wave>');
    const wave = child(root, 'Wave')!;
    expect(child(wave, 'FirstWave')!.text).toBe('');
    expect(child(wave, 'Enemy')!.attrs.Type).toBe('Blue');
  });

  it('reads attributes written with spaces around =', () => {
    const root = parsePXml('<Level LevelNum = "3"><Wave WaveNum = "1" Type = "Sharks"><Enemy Type = "Red"><MinNumber>1</MinNumber></Enemy></Wave></Level>');
    const wave = child(child(root, 'Level')!, 'Wave')!;
    expect(wave.attrs).toEqual({ WaveNum: '1', Type: 'Sharks' });
    expect(childrenOf(wave, 'Enemy')).toHaveLength(1);
  });

  it('accepts numeric tag names (lesson headings) and strips comments', () => {
    const root = parsePXml('<!-- note --><HEADINGS><1>First</1><2>Second</2></HEADINGS>');
    expect(child(root, 'HEADINGS')!.children.map((c) => c.text)).toEqual(['First', 'Second']);
  });

  it('decodes HTML entities in text', () => {
    expect(decodeEntities('&quot;a&quot; &amp; &lt;b&gt;')).toBe('"a" & <b>');
    expect(parsePXml('<TEXT>say &quot;hi&quot;</TEXT>').children[0].text).toBe('say "hi"');
  });

  it('pops to the matching element and ignores stray close tags', () => {
    const root = parsePXml('<A><B><C>1</C></B></X><D>2</D></A>');
    const a = child(root, 'A')!;
    expect(a.children.map((c) => c.tag)).toEqual(['B', 'D']);
  });
});
