import { describe, expect, it } from 'vitest';
import { parseLesson } from '../src/data/lessons';

const LESSON = `<LESSON>
<HEADINGS>
  <1>Type the following:</1>
  <2>Good! Keep going.</2>
</HEADINGS>
<DESCRIPTION>Practice &quot;quotes&quot;.</DESCRIPTION>
<LessonTime>300</LessonTime>
<MaxErrors>5</MaxErrors>
<MinWPM>-1</MinWPM>
<MinAccuracy>90</MinAccuracy>
<TASK><HEADING>1</HEADING><TEXT>asdf jkl;</TEXT><TEXT>fdsa ;lkj</TEXT></TASK>
<TASK><HEADING>2</HEADING><TEXT>a &lt; b</TEXT></TASK>
</LESSON>`;

describe('parseLesson', () => {
  it('reads headings by numeric tag, description and limits', () => {
    const l = parseLesson(LESSON, 3);
    expect(l.headings).toEqual(['Type the following:', 'Good! Keep going.']);
    expect(l.description).toBe('Practice "quotes".');
    expect([l.lessonTime, l.maxErrors, l.minWpm, l.minAccuracy, l.minTasks]).toEqual([300, 5, -1, 90, -1]);
  });

  it('reads tasks with their heading index and decoded lines', () => {
    const l = parseLesson(LESSON, 3);
    expect(l.tasks).toEqual([
      { heading: 1, lines: ['asdf jkl;', 'fdsa ;lkj'] },
      { heading: 2, lines: ['a < b'] },
    ]);
  });
});
