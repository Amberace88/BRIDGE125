import { memo, useMemo } from 'react';
import { conflicts, isGiven, isWrong, type Game, type Settings } from './core/game';
import { UNITS, boxOf, colOf, rowOf } from './core/grid';
import { IcPlay } from './icons';

export interface Marks { area: Set<number>; pattern: Set<number>; target: number; elims: Map<number, number> }
export interface Fx { cells: Map<number, number>; k: number; kind: 'unit' | 'wave' }

interface Props {
  g: Game;
  sel: number;
  settings: Settings;
  marks: Marks | null;
  fx: Fx | null;
  shake: { cell: number; k: number } | null;
  paused: boolean;
  pausedLabel: string;
  resumeLabel: string;
  onCell: (i: number) => void;
  onResume: () => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The 9×9 slab: brass rim, 3×3 boxes, cells with values or pencil marks. Re-renders only on game / UI changes. */
export const Board = memo(function Board({ g, sel, settings, marks, fx, shake, paused, pausedLabel, resumeLabel, onCell, onResume }: Props) {
  const clash = useMemo(() => (settings.conflicts ? conflicts(g.values) : new Set<number>()), [g.values, settings.conflicts]);
  const focus = sel >= 0 ? g.values[sel] : 0;
  const sr = sel >= 0 ? rowOf(sel) : -1, sc = sel >= 0 ? colOf(sel) : -1, sb = sel >= 0 ? boxOf(sel) : -1;
  const done = g.status !== 'play';

  return (
    <div className={`sdk-board ${paused ? 'is-paused' : ''} ${done ? 'is-done' : ''} ${g.status === 'won' ? 'is-won' : ''}`}>
      <div className="sdk-grid" role="grid" aria-label="Sudoku">
        {UNITS.slice(18).map((box, b) => (
          <div className="sdk-box" key={b}>
            {box.map(i => {
              const v = g.values[i];
              const given = isGiven(g, i);
              const peer = !done && sel >= 0 && i !== sel && (rowOf(i) === sr || colOf(i) === sc || boxOf(i) === sb);
              const same = !done && settings.sameDigits && focus > 0 && v === focus && i !== sel;
              const wrong = isWrong(g, i);
              const cls = ['sdk-cell',
                given ? 'given' : v ? 'user' : '',
                i === sel && !done ? 'sel' : '', peer ? 'peer' : '', same ? 'same' : '',
                wrong ? 'wrong' : '', clash.has(i) && !wrong ? 'clash' : '',
                marks?.area.has(i) ? 'h-area' : '', marks?.pattern.has(i) ? 'h-pat' : '', marks?.target === i ? 'h-target' : '',
              ].filter(Boolean).join(' ');
              const delay = fx?.cells.get(i);
              const el = marks?.elims.get(i) ?? 0;
              return (
                <button key={i} type="button" role="gridcell" className={cls} style={delay !== undefined ? { ['--dl' as string]: `${delay}ms` } : undefined} onPointerDown={e => { e.preventDefault(); onCell(i); }}
                  onClick={e => { if (e.detail === 0) onCell(i); }} tabIndex={-1}
                  aria-label={`r${rowOf(i) + 1}c${colOf(i) + 1}${v ? ' ' + v : ''}`}>
                  {v ? (
                    <span key={`v${v}`} className={`v ${shake?.cell === i ? 'shake' : ''}`} data-k={shake?.cell === i ? shake.k : undefined}>{v}</span>
                  ) : g.notes[i] ? (
                    <span className="notes">
                      {DIGITS.map(d => {
                        const on = (g.notes[i] >> (d - 1)) & 1;
                        return <i key={d} className={`${on ? 'on' : ''} ${on && focus === d && settings.sameDigits ? 'hl' : ''} ${on && (el >> (d - 1)) & 1 ? 'x' : ''}`}>{on ? d : ''}</i>;
                      })}
                    </span>
                  ) : null}
                  {delay !== undefined && <i key={fx!.k} className={`glint ${fx!.kind}`} style={{ animationDelay: `${delay}ms` }} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sdk-sheen" aria-hidden />
      {paused && (
        <button type="button" className="sdk-pausecover" onClick={onResume}>
          <span className="ring"><IcPlay size={34} /></span>
          <b className="serif">{pausedLabel}</b>
          <small>{resumeLabel}</small>
        </button>
      )}
    </div>
  );
});
