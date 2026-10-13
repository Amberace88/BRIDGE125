import { isWrong, solutionAt, type Game } from './core/game';
import { UNITS, unitKind, unitNo } from './core/grid';
import { nextPlacement, type Step } from './core/logic';
import type { SudokuStrings } from './strings';

// A hint, best first: point out a wrong digit → explain the next logical placement → reveal a cell.

export type Hint =
  | { kind: 'wrong'; cell: number }
  | { kind: 'step'; cell: number; digit: number; step: Step; pre: Step[] }
  | { kind: 'reveal'; cell: number; digit: number };

export function findHint(g: Game, selected: number): Hint | null {
  if (g.status !== 'play') return null;
  const wrong: number[] = [];
  for (let i = 0; i < 81; i++) if (isWrong(g, i)) wrong.push(i);
  if (wrong.length) return { kind: 'wrong', cell: wrong.includes(selected) ? selected : wrong[0] };
  const np = nextPlacement(g.values);
  if (np?.step.place) return { kind: 'step', cell: np.step.place.cell, digit: np.step.place.digit, step: np.step, pre: np.pre };
  const empty = g.values[selected] === 0 && selected >= 0 ? selected : g.values.findIndex(v => v === 0);
  return empty < 0 ? null : { kind: 'reveal', cell: empty, digit: solutionAt(g, empty) };
}

export function unitLabel(u: number, s: SudokuStrings): string {
  const k = unitKind(u), n = unitNo(u);
  return k === 'row' ? s.hint.row(n) : k === 'col' ? s.hint.col(n) : s.hint.box(n);
}

/** Title + sentence for one step. */
export function describe(st: Step, s: SudokuStrings): { title: string; text: string } {
  const t = s.hint.text, L = (u: number) => unitLabel(u, s);
  const title = s.hint.tech[st.tech];
  const d = st.place?.digit ?? st.digits[0];
  switch (st.tech) {
    case 'fullHouse': return { title, text: t.fullHouse(L(st.units[0]), d) };
    case 'nakedSingle': return { title, text: t.nakedSingle(d) };
    case 'hiddenSingle': return { title, text: t.hiddenSingle(L(st.units[0]), d) };
    case 'pointing': return { title, text: t.pointing(L(st.units[0]), L(st.units[1]), d) };
    case 'claiming': return { title, text: t.claiming(L(st.units[0]), L(st.units[1]), d) };
    case 'nakedPair': case 'nakedTriple': case 'nakedQuad': return { title, text: t.naked(L(st.units[0]), s.hint.list(st.digits)) };
    case 'hiddenPair': case 'hiddenTriple': return { title, text: t.hidden(L(st.units[0]), s.hint.list(st.digits)) };
    case 'xWing': case 'swordfish': return { title, text: t.fish(title, d) };
    case 'xyWing': case 'xyzWing': return { title, text: t.wing(title, st.elims[0]?.digit ?? d) };
  }
}

/** Cells to light up for a hint: the step's units (soft) and pattern cells (ring). */
export function hintMarks(h: Hint): { area: Set<number>; pattern: Set<number>; target: number; elims: Map<number, number> } {
  const area = new Set<number>(), pattern = new Set<number>(), elims = new Map<number, number>();
  if (h.kind === 'step') {
    const steps = [...h.pre.slice(0, 1), h.step];
    for (const st of steps) {
      for (const u of st.units) for (const i of UNITS[u]) area.add(i);
      if (st !== h.step) for (const i of st.cells) pattern.add(i);
      for (const e of st.elims) elims.set(e.cell, (elims.get(e.cell) ?? 0) | (1 << (e.digit - 1)));
    }
  }
  return { area, pattern, target: h.cell, elims };
}
