import { describe, expect, it } from 'vitest';
import { GameConfig } from '../src/data/config';

const CFG = `<Config>
  <Default>
    <DiverSpeed> 0.3 </DiverSpeed>
    <KnockBack> 5 </KnockBack>
    <MinCol> 5 </MinCol>
    <MaxCol> 7 </MaxCol>
    <LetterDelay> 2000 </LetterDelay>
    <OceanDepth> 300 </OceanDepth>
    <MinSpeed> 0.2 </MinSpeed>
    <MaxSpeed> 0.4 </MaxSpeed>
    <MinDiff> 3 </MinDiff>
    <MaxDiff> 4 </MaxDiff>
  </Default>
  <Level LevelNum = "1">
    <NumForPenalty> 3 </NumForPenalty>
    <Wave WaveNum = "1" Type = "Sharks">
      <Enemy Type = "Blue"><MinNumber>4</MinNumber><MaxNumber>7</MaxNumber></Enemy>
      <Enemy Type = "Stealth"><MinSpeed>0.4</MinSpeed><MaxSpeed>0.4</MaxSpeed></Enemy>
    </Wave>
    <MinDiff> 6 </MinDiff>
    <Wave WaveNum = "2" Type = "Piranhas">
      <FirstWave> </FirstWave>
      <MinSpeed>0.3</MinSpeed>
      <Enemy Type = "Blue"><MinSpeed>0.3</MinSpeed><MaxSpeed>0.4</MaxSpeed></Enemy>
      <Enemy Type = "White"></Enemy>
    </Wave>
    <Wave WaveNum = "3" Type = "Bonus">
      <KnockBack> 9 </KnockBack>
      <Enemy Type = "Standard"><MinNumber>3</MinNumber><MaxNumber>5</MaxNumber><MinSpeed>0.6</MinSpeed></Enemy>
    </Wave>
    <Wave WaveNum = "4" Type = "Boss">
      <Enemy Type = "Torpedo">
        <KnockBack>0</KnockBack>
        <Health>200</Health><MaxMissiles>3</MaxMissiles>
        <MinMissileSpeed>0.3</MinMissileSpeed><MaxMissileSpeed>0.4</MaxMissileSpeed>
      </Enemy>
    </Wave>
  </Level>
</Config>`;

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('GameConfig loading', () => {
  const cfg = new GameConfig(CFG, 'normal');
  const level = cfg.levels[0];
  const [sharks, piranhas, bonus, boss] = level.waves;

  it('inherits Default into Level, adding +0.03/+0.10 to Min/MaxSpeed (not on X-Treme)', () => {
    near(level.minSpeed, 0.23);
    near(level.maxSpeed, 0.5);
    expect(level.numForPenalty).toBe(3);
    expect(level.oceanDepth).toBe(300);
    const xt = new GameConfig(CFG, 'xtreme').levels[0];
    near(xt.minSpeed, 0.2);
    near(xt.maxSpeed, 0.4);
  });

  it('copies values when a scope opens: a Level tag after a Wave does not reach that Wave', () => {
    expect(sharks.enemies[0].minDiff).toBe(3);
    expect(piranhas.enemies[0].minDiff).toBe(6);
  });

  it('applies per-type enemy speed rules', () => {
    const [stealth, blue] = sharks.enemies; // stealth types are sorted first
    near(stealth.minSpeed, 0.4 * 0.7);
    near(stealth.maxSpeed, 0.4 * 0.75);
    near(blue.minSpeed, 0.23); // no enemy-scope tags: level values
    const pBlue = piranhas.enemies[0];
    near(pBlue.minSpeed, 0.3 + 0.05 + 0.15);
    near(pBlue.maxSpeed, 0.4 + 0.2 + 0.15);
  });

  it('adds +0.1 to wave-scope speeds and applies them to later enemies', () => {
    near(piranhas.enemies[1].minSpeed, 0.4); // 0.3 wave MinSpeed + 0.1
  });

  it('records the FirstWave index and keeps document order', () => {
    expect(level.firstWave).toBe(1);
    expect(level.waves.map((w) => w.type)).toEqual(['Sharks', 'Piranhas', 'Bonus', 'Boss']);
  });

  it('sorts stealth enemy defs first, stable otherwise', () => {
    expect(sharks.enemies.map((e) => e.type)).toEqual(['Stealth', 'Blue']);
  });

  it('forces Bonus waves to KnockBack 0 and 12..15 creatures', () => {
    expect(bonus.knockBack).toBe(0);
    expect([bonus.enemies[0].minNumber, bonus.enemies[0].maxNumber]).toEqual([12, 15]);
    near(bonus.enemies[0].minSpeed, 0.8);
  });

  it('reads boss fields, adds +0.3 to missile speeds, and KnockBack inside Enemy sets the wave', () => {
    const t = boss.enemies[0];
    expect([t.health, t.maxMissiles]).toEqual([200, 3]);
    near(t.minMissileSpeed, 0.6);
    near(t.maxMissileSpeed, 0.7);
    expect(boss.knockBack).toBe(0);
    expect(sharks.knockBack).toBe(5);
  });

  it('flags abyss configs and builds endless copies of levels 31-36 otherwise', () => {
    const abyss = new GameConfig('<Config><AbyssMode></AbyssMode><Level LevelNum = "1"></Level></Config>', null);
    expect(abyss.abyss).toBe(true);
    expect(abyss.endless).toHaveLength(0);
    const levels = Array.from({ length: 36 }, (_, i) => `<Level LevelNum = "${i + 1}"><OceanDepth>${i}</OceanDepth></Level>`).join('');
    const full = new GameConfig(`<Config><Default></Default>${levels}</Config>`, 'normal');
    expect(full.endless.map((l) => l.oceanDepth)).toEqual([30, 31, 32, 33, 34, 35]);
    full.endless[0].oceanDepth = 99;
    expect(full.levels[30].oceanDepth).toBe(30); // deep copies
  });
});
