// Small stand-ins for the game's data files, registered through the asset module so
// game code can run without the imported (copyrighted) data.
import { registerData } from '../src/engine/assets';

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** waves.txt: for each length 3..7, one word per starting letter (e.g. AAA, BBBB...). */
export function wavesTxt() {
  let s = '';
  for (let n = 3; n <= 7; n++) s += `#LENGTH-${n}\n${[...letters].map((c) => c + 'X'.repeat(n - 1)).join('\n')}\n#END\n\n`;
  return s;
}

export function registerWordFixtures() {
  registerData('waves.txt', wavesTxt());
  registerData('twords.txt', '#DIFF-3\nLEE\nGAL\n#END\n#DIFF-4\nEGGS\nSEAL\n#END\n#DIFF-5\nDEALS\n#END\n');
  registerData('themes.txt', 'BIRDS\n#THEME\nRobin\nWren\nHeron\n#END\n');
  registerData('shipnames.txt', 'HMS Aberdeen\nUSS Victory\n');
}

/** A minimal two-level difficulty config. */
export function registerConfigFixture(name = 'normal-cfg.xml') {
  registerData(
    name,
    `<Config><Default><DiverSpeed>0.3</DiverSpeed><OceanDepth>300</OceanDepth><MinEndDiff>3</MinEndDiff><MaxEndDiff>5</MaxEndDiff></Default>
     <Level LevelNum = "1"><Wave Type = "Sharks"><Enemy Type = "Blue"><MinNumber>1</MinNumber><MaxNumber>2</MaxNumber></Enemy></Wave></Level>
     <Level LevelNum = "2"><Wave Type = "Sharks"><Enemy Type = "Blue"><MinNumber>1</MinNumber><MaxNumber>2</MaxNumber></Enemy></Wave></Level>
     </Config>`,
  );
  registerData(
    'abyss.xml',
    `<Config><AbyssMode></AbyssMode><Default><OceanDepth>-1</OceanDepth></Default>
     <Level LevelNum = "1"><MinSpeed>0.3</MinSpeed><MaxSpeed>0.31</MaxSpeed><Wave Type = "Sharks"><Enemy Type = "Blue"></Enemy></Wave></Level>
     <Level LevelNum = "2"><Wave Type = "Sharks"><Enemy Type = "Blue"><MinSpeed>0.5</MinSpeed><MaxSpeed>0.6</MaxSpeed></Enemy></Wave></Level>
     </Config>`,
  );
}
