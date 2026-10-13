import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { CardFace } from '../../components/CardFace';
import { useCosmetics } from '../../cosmetics/useCosmetics';
import { VictoryEffect } from '../../cosmetics/VictoryEffect';
import { useStrings } from '../../i18n/pick';
import { sfx } from '../../sound';
import { useApp } from '../../store';
import { CountUp } from './CountUp';
import { type SheetRow, type ZCard, type ZState, isWin, sortHand } from './engine';
import { ZOLE } from './strings';

/**
 * The "pieraksts": after every deal the result of the deal (big, readable) over the running score sheet — one row per
 * deal, a column per player, running totals with the deal's change. After the last deal: the final standings.
 */
export function ScoreSheet({ g, names, me, onNext, onFinish, onAgain, onExit }: {
  g: ZState; names: string[]; me: number;
  onNext: () => void; onFinish: () => void; onAgain: () => void; onExit: () => void;
}) {
  const s = useStrings(ZOLE);
  const { lang } = useApp();
  const cos = useCosmetics();
  const final = g.phase === 'sessionOver';
  const r = g.result;
  const who = (p: number) => (p === me ? null : names[p]);
  const nm = (p: number) => (p === me ? s.you : names[p]);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, []);

  const iWon = final && g.scores[me] > 0;
  useEffect(() => {
    if (final) { if (g.scores[me] > 0) sfx.fanfare(); else sfx.alert(); return; }
    if (!r) return;
    const mineDelta = r.delta[me];
    if ((r.outcome === 'bezstikis' || r.outcome === 'jani') && r.declarer === me) sfx.fanfare();
    else if (mineDelta > 0) sfx.coin();
    else if (mineDelta < 0) sfx.alert();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  let title = '', sub = '', tag = '', tone: 'good' | 'bad' | 'info' = 'info';
  if (final) {
    const best = Math.max(...g.scores);
    const top = [0, 1, 2].filter(p => g.scores[p] === best);
    title = g.scores[me] > 0 ? s.sheet.youWon : top.length === 3 ? s.sheet.tie : s.sheet.winner(nm(top.find(p => p !== me) ?? top[0]));
    sub = s.sheet.sessionOver;
    tone = g.scores[me] > 0 ? 'good' : 'bad';
  } else if (r) {
    if (r.contract === 'pule') { title = s.allPassPule; tone = 'info'; }
    else if (r.contract === 'galdins') {
      title = s.galdinsLine(r.losers.map(who));
      sub = r.galdsTo >= 0 ? s.galdsTo(nm(r.galdsTo)) : '';
      tone = r.losers.includes(me) ? 'bad' : 'good';
    } else if (r.contract === 'maza') {
      title = s.mazaLine(who(r.declarer), isWin(r.outcome));
      sub = `${s.contract.maza} · ${s.trickN(r.tricksBy[r.declarer])}`;
      tone = r.delta[me] > 0 ? 'good' : 'bad';
    } else {
      title = s.outcomeLine(who(r.declarer), r.outcome!);
      sub = `${r.contract === 'zole' ? s.contract.zole : s.contract.lielais} · ${r.declPts} : ${r.oppPts} ${s.acis}`;
      if (r.outcome === 'bezstikis' || r.outcome === 'loseBezstikis') tag = s.outcomeTag[r.outcome];
      tone = r.delta[me] > 0 ? 'good' : 'bad';
    }
  }
  const puleNote = r?.puleNote === 'added' ? s.sheet.puleAdded : r?.puleNote === 'ownCleared' ? s.sheet.puleOwn : r?.puleNote === 'commonWon' ? s.sheet.puleCommon
    : r?.puleNote === 'personalWon' ? s.sheet.pulePersonal : r?.puleNote === 'personal' ? `+1 ${s.sheet.personal}` : '';
  const showCards = !final && r && r.contract !== 'pule';
  const galds: ZCard[] = g.galds;
  const order = final ? [0, 1, 2].sort((a, b) => g.scores[b] - g.scores[a]) : [0, 1, 2];

  return (
    <motion.div className={`rsum zsheet ${final ? 'final' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {final && iWon && <VictoryEffect id={cos.equipped.victory} />}
      <div className={`rays ${tone === 'good' ? 'big' : ''}`} aria-hidden />
      <motion.div className="rsum-in" initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
        <div className="kicker">{final ? s.sheet.sessionOver : s.deal(g.dealNo, g.rules.deals)}</div>
        <div className={`title serif zs-title ${tone}`}>{title}</div>
        {sub && !final && <div className="subt">{sub}</div>}
        {(tag || puleNote) && (
          <div className="zs-tags">
            {tag && <span className={`ztag ${r && isWin(r.outcome) ? 'gold' : 'red'}`}>{tag}</span>}
            {puleNote && <span className="ztag">{puleNote}</span>}
          </div>
        )}

        {/* the hidden cards, turned over */}
        {showCards && (galds.length > 0 || g.discards.length > 0) && (
          <div className="zs-cards">
            {galds.length > 0 && (
              <div className="grp"><span>{s.table}</span><div className="cs">{sortHand(galds).map((c, i) => <Mini key={c.id} c={c} lang={lang} i={i} />)}</div></div>
            )}
            {g.discards.length > 0 && (
              <div className="grp"><span>{s.buried}</span><div className="cs">{sortHand(g.discards).map((c, i) => <Mini key={c.id} c={c} lang={lang} i={i + 2} />)}</div></div>
            )}
          </div>
        )}

        {/* this deal's points per player / the final standings */}
        <div className="zs-players">
          {order.map((p, i) => {
            const d = final ? g.scores[p] : r?.delta[p] ?? 0;
            const role = !final && r && r.declarer === p ? (r.contract === 'lielais' ? s.role.lielais : s.contract[r.contract]) : !final && r?.losers.includes(p) ? s.contract.galdins : '';
            return (
              <motion.div key={p} className={`zs-p ${p === me ? 'me' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
                <span className="nm">{nm(p)}{role && <em>{role}</em>}</span>
                <span className={`d serif ${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}`}>{d > 0 ? '+' : d < 0 ? '−' : ''}<CountUp from={0} value={Math.abs(d)} delay={0.25 + i * 0.07} duration={0.7} /></span>
                {!final && <span className="tot">{s.sheet.total} {signed(g.scores[p])}</span>}
              </motion.div>
            );
          })}
        </div>

        {/* the pieraksts */}
        <div className="zs-sheet">
          <div className="zs-head">
            <span className="n">{s.sheet.title}</span>
            {[0, 1, 2].map(p => <span key={p} className={`c ${p === me ? 'me' : ''}`}>{nm(p)}</span>)}
          </div>
          <div className="zs-body" ref={scroller}>
            {g.sheet.map((row, i) => <SheetLine key={i} row={row} last={i === g.sheet.length - 1} me={me} />)}
          </div>
        </div>

        <div className="cta">
          {final ? (<>
            <button className="btn acc" onClick={() => { sfx.shuffle(); onAgain(); }}>{s.sheet.again}</button>
            <button className="textbtn" onClick={onExit}>{s.sheet.exit}</button>
          </>) : (<>
            <button className="btn acc" onClick={() => { sfx.shuffle(); onNext(); }}>{s.sheet.next}</button>
            <button className="textbtn" onClick={onFinish}>{s.sheet.finish}</button>
          </>)}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Mini({ c, lang, i }: { c: ZCard; lang: string; i: number }) {
  return (
    <motion.span className="zmini" style={{ ['--cw' as string]: '44px', width: 44, height: 63 }}
      initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: 0.25 + i * 0.08, type: 'spring', stiffness: 200, damping: 18 }}>
      <CardFace card={c} lang={lang as never} />
    </motion.span>
  );
}

const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');

const ABBR: Record<SheetRow['contract'], string> = { lielais: 'L', zole: 'Z', maza: 'MZ', galdins: 'G', pule: 'P', final: 'Σ' };

function SheetLine({ row, last, me }: { row: SheetRow; last: boolean; me: number }) {
  const s = useStrings(ZOLE);
  const label = row.contract === 'final' ? s.sheet.final : s.contract[row.contract];
  return (
    <div className={`zs-row ${last ? 'last' : ''} ${row.contract}`}>
      <span className="n" title={label}><b>{row.contract === 'final' ? 'Σ' : row.deal}</b><i className={`ab ${row.contract}`}>{ABBR[row.contract]}</i></span>
      {[0, 1, 2].map(p => (
        <span key={p} className={`c ${p === me ? 'me' : ''} ${row.declarer === p ? 'decl' : ''} ${row.losers.includes(p) ? 'lost' : ''}`}>
          {row.declarer === p && <i className="dot" />}{row.losers.includes(p) && <i className="dot lost" />}<b className="serif">{signed(row.totals[p])}</b>
          {row.delta[p] !== 0 && <small className={row.delta[p] > 0 ? 'pos' : 'neg'}>{row.delta[p] > 0 ? '+' : '−'}{Math.abs(row.delta[p])}</small>}
        </span>
      ))}
    </div>
  );
}
