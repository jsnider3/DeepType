// Typing tutor lessons (data/LessonN.xml). Lesson 0 is the typing test.

import { child, childrenOf, parsePXml } from './pxml';

export interface Task {
  heading: number; // 1-based index into headings
  lines: string[];
}

export interface Lesson {
  index: number;
  headings: string[];
  description: string;
  lessonTime: number; // seconds, -1 = none
  maxErrors: number;
  minWpm: number;
  minAccuracy: number;
  minTasks: number;
  tasks: Task[];
}

export function parseLesson(src: string, index: number): Lesson {
  const root = parsePXml(src);
  const l = child(root, 'LESSON') ?? root;
  const num = (tag: string) => {
    const n = l.children.find((c) => c.tag.toUpperCase() === tag);
    return n && n.text !== '' ? Number(n.text) : -1;
  };
  const headingsNode = l.children.find((c) => c.tag.toUpperCase() === 'HEADINGS');
  const headings: string[] = [];
  for (const h of headingsNode?.children ?? []) headings[Number(h.tag) - 1] = h.text;
  const tasks = childrenOf(l, 'TASK').map((t) => ({
    heading: Number(child(t, 'HEADING')?.text ?? 1),
    lines: childrenOf(t, 'TEXT').map((x) => x.text),
  }));
  return {
    index,
    headings,
    description: l.children.find((c) => c.tag.toUpperCase() === 'DESCRIPTION')?.text ?? '',
    lessonTime: num('LESSONTIME'),
    maxErrors: num('MAXERRORS'),
    minWpm: num('MINWPM'),
    minAccuracy: num('MINACCURACY'),
    minTasks: num('MINTASKS'),
    tasks,
  };
}
