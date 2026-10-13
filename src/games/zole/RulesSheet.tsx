import { motion } from 'motion/react';
import { CardFace } from '../../components/CardFace';
import { useStrings } from '../../i18n/pick';
import type { Lang } from '../../i18n';
import { useApp } from '../../store';
import { type Bid, type Outcome, type ZCard, type ZoleRules, SCORE, TRUMP_ORDER } from './engine';
import { ZOLE } from './strings';

const C = (id: string): ZCard => ({ id, r: id.slice(0, -1) as ZCard['r'], s: id.slice(-1) as ZCard['s'] });
const ROWS: Outcome[] = ['bezstikis', 'jani', 'win', 'lose', 'loseJani', 'loseBezstikis'];
const fmt = (v: number) => (v > 0 ? `+${v}` : `−${Math.abs(v)}`);

/** The rules in the game: short, illustrated with real card faces, the scoring table built from the engine's numbers. */
export function RulesSheet({ onClose, rules }: { onClose: () => void; rules?: ZoleRules }) {
  const s = useStrings(ZOLE);
  const R = s.rules;
  const { lang } = useApp();
  const mini = (c: ZCard, w = 34, k?: string | number) => (
    <span key={k ?? c.id} className="zmini" style={{ ['--cw' as string]: `${w}px`, width: w, height: Math.round(w * 1.43) }}><CardFace card={c} lang={lang as Lang} /></span>
  );
  return (
    <>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet zrules" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        role="dialog" aria-label={R.title}>
        <div className="grab" />
        <button className="zclose" aria-label="×" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden><path d="M7 7l10 10M17 7L7 17" /></svg></button>
        <h2 className="serif">{R.title}</h2>
        <p className="lead">{R.intro}</p>

        <h3>{R.deckH}</h3>
        <p>{R.deck}</p>

        <h3>{R.pointsH}</h3>
        <div className="zr-points">
          {([['AC', 11], ['10S', 10], ['KH', 4], ['QS', 3], ['JD', 2], ['9C', 0]] as [string, number][]).map(([id, v]) => (
            <div key={id} className="pt">{mini(C(id), 36)}<b className="serif">{v}</b></div>
          ))}
          <div className="sum serif">= 120</div>
        </div>

        <h3>{R.trumpsH}</h3>
        <div className="zr-trumps" aria-label={TRUMP_ORDER.map(c => c.id).join(' ')}>
          {TRUMP_ORDER.map((c, i) => (
            <motion.span key={c.id} className="tr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.03 }}>
              {mini(c, 30)}<i>{i + 1}</i>
            </motion.span>
          ))}
        </div>
        <p>{R.trumps}</p>

        <h3>{R.playH}</h3>
        <p>{R.play}</p>

        <h3>{R.bidH}</h3>
        <ul className="zr-bids">
          {(['take', 'zole', 'maza', 'pass'] as Bid[]).filter(b => b !== 'maza' || rules?.mazaZole !== false).map(b => (
            <li key={b}><b className="serif">{s.bid[b]}</b><span>{R.bids[b]}</span></li>
          ))}
        </ul>

        <h3>{R.allPassH}</h3>
        <p className={rules?.pules ? 'dim' : ''}>{R.galdins}</p>
        <p className={rules && !rules.pules ? 'dim' : ''}>{R.pules}</p>

        <h3>{R.scoreH}</h3>
        <table className="zr-score">
          <thead><tr><th>{R.scoreCols[0]}</th><th>{R.scoreCols[1]}</th><th>{R.scoreCols[2]}</th></tr></thead>
          <tbody>
            {ROWS.map(o => (
              <tr key={o} className={o.startsWith('lose') ? 'neg' : 'pos'}>
                <td>{R.scoreRows[o]}</td>
                <td>{fmt(SCORE.lielais[o])} <small>/ {fmt(-SCORE.lielais[o] / 2)}</small></td>
                <td>{fmt(SCORE.zole[o])} <small>/ {fmt(-SCORE.zole[o] / 2)}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small">{R.mazaRow[0]} {fmt(SCORE.maza.win)} / {fmt(-SCORE.maza.win / 2)} · {R.mazaRow[1]} {fmt(SCORE.maza.lose)} / {fmt(-SCORE.maza.lose / 2)}</p>
        <p className="small">{R.galdinsRow}</p>

        <h3>{R.tipsH}</h3>
        <ul className="zr-tips">{R.tips.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <button className="btn acc zr-ok" onClick={onClose}>{s.coach.ok}</button>
      </motion.div>
    </>
  );
}
