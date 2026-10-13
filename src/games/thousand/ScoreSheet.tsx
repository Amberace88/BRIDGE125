import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { CardFace } from '../../components/CardFace';
import { useStrings } from '../../i18n/pick';
import { sfx } from '../../sound';
import { useApp } from '../../store';
import { CountUp } from './CountUp';
import { type SheetRow, type TCard, type TState, sortHand } from './engine';
import { THOUSAND } from './strings';
import { Barrel } from './icons';

const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');
const plain = (v: number) => (v < 0 ? `−${Math.abs(v)}` : `${v}`);

/**
 * The "пулька": after every deal its result (big and readable) over the running score sheet — a row per deal, a column
 * per player, running totals with the deal's change, the declarer's contract, barrels and bolts. `peek` = opened from
 * the top bar mid-deal: only the sheet.
 */
export function ScoreSheet({ g, names, me, peek, onClose, onNext, onResults }: {
  g: TState; names: string[]; me: number; peek: boolean;
  onClose: () => void; onNext: () => void; onResults: () => void;
}) {
  const s = useStrings(THOUSAND);
  const { lang } = useApp();
  const nm = (p: number) => (p === me ? s.you : names[p]);
  const who = (p: number) => (p === me ? null : names[p]);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, []);
  const r = g.result;
  const final = g.phase === 'gameOver';
  useEffect(() => {
    if (peek || !r) return;
    if (final) { if (g.winner === me) sfx.fanfare(); else sfx.alert(); return; }
    if (r.delta[me] > 0) sfx.coin(); else if (r.delta[me] < 0) sfx.alert();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  let title = s.sheet.title, sub = '', tone: 'good' | 'bad' | 'info' = 'info';
  if (!peek && r) {
    const d = r.declarer;
    title = r.made ? s.sheet.made(who(d), r.contract) : s.sheet.failed(who(d), r.contract, r.pts[d]);
    sub = `${nm(d)} · ${s.sheet.breakdown(r.cardPts[d], r.marPts[d])}`;
    tone = (d === me) === r.made ? 'good' : 'bad';
    if (final) {
      title = g.winner === me ? s.sheet.youWon : g.winner >= 0 ? s.sheet.winner(names[g.winner]) : s.sheet.resigned;
      tone = g.winner === me ? 'good' : 'bad';
    }
  } else if (!peek && final) { title = s.sheet.resigned; tone = 'bad'; }
  const notes = !peek && r ? r.notes.filter(n => n.k !== 'barrelStay' || n.p === me) : [];

  return (
    <motion.div className={`rsum ksheet ${final && !peek ? 'final' : ''} ${peek ? 'peek' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      onClick={peek ? onClose : undefined}>
      <div className={`rays ${tone === 'good' ? 'big' : ''}`} aria-hidden />
      <motion.div className="rsum-in" initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }} onClick={e => e.stopPropagation()}>
        <div className="kicker">{final && !peek ? s.sheet.gameOver : s.deal(g.dealNo)}</div>
        <div className={`title serif ks-title ${tone}`}>{title}</div>
        {sub && <div className="subt">{sub}</div>}
        {notes.length > 0 && (
          <div className="ks-tags">
            {notes.map((n, i) => (
              <motion.span key={i} className={`ktag ${n.k === 'win' || n.k === 'barrelOn' ? 'gold' : n.k === 'bolt3' || n.k === 'barrelFail' || n.k === 'barrelPush' || n.k === 'samosval' ? 'red' : ''}`}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.08 }}>
                {s.sheet.note[n.k](nm(n.p), n.n)}
              </motion.span>
            ))}
          </div>
        )}

        {!peek && r && g.talonShown.length > 0 && (
          <div className="ks-cards">
            <div className="grp"><span>{s.talon}</span><div className="cs">{sortHand(g.talonShown).map((c, i) => <Mini key={c.id} c={c} lang={lang} i={i} />)}</div></div>
          </div>
        )}

        {!peek && r && (
          <div className="ks-players">
            {[0, 1, 2].map((p, i) => (
              <motion.div key={p} className={`ks-p ${p === me ? 'me' : ''} ${p === r.declarer ? 'decl' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
                <span className="nm">{nm(p)}<em>{p === r.declarer ? `${s.role.declarer} ${r.contract}` : `${r.pts[p]} ${s.pts}`}</em></span>
                <span className={`d serif ${r.delta[p] > 0 ? 'pos' : r.delta[p] < 0 ? 'neg' : ''}`}>{r.delta[p] > 0 ? '+' : r.delta[p] < 0 ? '−' : ''}<CountUp from={0} value={Math.abs(r.delta[p])} delay={0.25 + i * 0.07} duration={0.7} /></span>
                <span className="tot">{s.sheet.total} {plain(g.scores[p])}{g.barrel[p] != null && <Barrel tries={g.barrel[p]!} />}</span>
              </motion.div>
            ))}
          </div>
        )}

        <div className="ks-sheet">
          <div className="ks-head">
            <span className="n">#</span>
            {[0, 1, 2].map(p => <span key={p} className={`c ${p === me ? 'me' : ''}`}>{nm(p)}</span>)}
          </div>
          <div className="ks-body" ref={scroller}>
            {g.sheet.length === 0 && <div className="ks-empty">—</div>}
            {g.sheet.map((row, i) => <SheetLine key={i} row={row} last={i === g.sheet.length - 1} me={me} />)}
          </div>
          <div className="ks-foot">
            <span className="n">{s.sheet.total}</span>
            {[0, 1, 2].map(p => (
              <span key={p} className={`c ${p === me ? 'me' : ''}`}>
                <b className="serif">{plain(g.scores[p])}</b>
                <i className="prog" aria-hidden><i style={{ width: `${Math.max(0, Math.min(100, g.scores[p] / 10))}%` }} /></i>
              </span>
            ))}
          </div>
        </div>

        <div className="cta">
          {peek ? <button className="btn acc" onClick={onClose}>{s.menu.resume}</button>
            : final ? <button className="btn acc" onClick={() => { sfx.tap(); onResults(); }}>{s.sheet.results}</button>
            : <button className="btn acc" onClick={() => { sfx.shuffle(); onNext(); }}>{s.sheet.next}</button>}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Mini({ c, lang, i }: { c: TCard; lang: string; i: number }) {
  return (
    <motion.span className="kmini" style={{ ['--cw' as string]: '42px', width: 42, height: 60 }}
      initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: 0.25 + i * 0.08, type: 'spring', stiffness: 200, damping: 18 }}>
      <CardFace card={c} lang={lang as never} />
    </motion.span>
  );
}

function SheetLine({ row, last, me }: { row: SheetRow; last: boolean; me: number }) {
  return (
    <div className={`ks-row ${last ? 'last' : ''}`}>
      <span className="n"><b>{row.deal}</b><i className={`ab ${row.made ? 'ok' : 'no'}`}>{row.contract}</i></span>
      {[0, 1, 2].map(p => {
        const bolt = row.notes.find(n => n.p === p && (n.k === 'bolt' || n.k === 'bolt3'));
        return (
          <span key={p} className={`c ${p === me ? 'me' : ''} ${row.declarer === p ? (row.made ? 'decl' : 'decl fail') : ''}`}>
            {row.declarer === p && <i className="dot" />}
            <b className="serif">{plain(row.totals[p])}</b>
            {row.delta[p] !== 0 && <small className={row.delta[p] > 0 ? 'pos' : 'neg'}>{signed(row.delta[p])}</small>}
            {row.barrel[p] != null && <Barrel tries={row.barrel[p]!} />}
            {bolt && <em className="bolt">{'•'.repeat(bolt.k === 'bolt3' ? 3 : bolt.n ?? 1)}</em>}
          </span>
        );
      })}
    </div>
  );
}
