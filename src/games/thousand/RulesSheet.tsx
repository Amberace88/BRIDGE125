import { motion } from 'motion/react';
import { CardFace } from '../../components/CardFace';
import { useStrings } from '../../i18n/pick';
import type { Lang } from '../../i18n';
import { useApp } from '../../store';
import { DEFAULT_RULES, GLYPH, MARRIAGE, type Suit, type TCard, type ThousandRules, card } from './engine';
import { THOUSAND } from './strings';

/** The rules in the game: short, illustrated with real card faces; "This table plays" lists the chosen variant. */
export function RulesSheet({ onClose, rules = DEFAULT_RULES }: { onClose: () => void; rules?: ThousandRules }) {
  const s = useStrings(THOUSAND);
  const R = s.rules;
  const { lang } = useApp();
  const mini = (c: TCard, w = 34, k?: string | number) => (
    <span key={k ?? c.id} className="kmini" style={{ ['--cw' as string]: `${w}px`, width: w, height: Math.round(w * 1.43) }}><CardFace card={c} lang={lang as Lang} /></span>
  );
  const sections: [string, string, boolean][] = [
    [R.barrelH, R.barrel, rules.barrel], [R.boltH, R.bolt, rules.bolts], [R.samosvalH, R.samosval, rules.samosval],
  ];
  return (
    <>
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet krules" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        role="dialog" aria-label={R.title}>
        <div className="grab" />
        <button className="kclose" aria-label="×" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden><path d="M7 7l10 10M17 7L7 17" /></svg></button>
        <h2 className="serif">{R.title}</h2>
        <p className="lead">{R.intro}</p>

        <h3>{R.deckH}</h3>
        <p>{R.deck}</p>

        <h3>{R.pointsH}</h3>
        <div className="kr-points">
          {([['AS', 11], ['10H', 10], ['KC', 4], ['QD', 3], ['JS', 2], ['9H', 0]] as [string, number][]).map(([id, v]) => (
            <div key={id} className="pt">{mini(card(id), 36)}<b className="serif">{v}</b></div>
          ))}
          <div className="sum serif">× 4 = 120</div>
        </div>

        <h3>{R.bidH}</h3>
        <p>{R.bid}</p>
        <h3>{R.talonH}</h3>
        <p>{R.talon}</p>
        <h3>{R.playH}</h3>
        <p>{R.play}</p>

        <h3>{R.marriageH}</h3>
        <div className="kr-mar">
          {(['H', 'D', 'C', 'S'] as Suit[]).map((su, i) => (
            <motion.div key={su} className={`m ${su === 'H' || su === 'D' ? 'red' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
              <span className="pair">{mini(card('K' + su), 30)}{mini(card('Q' + su), 30)}</span>
              <b className="serif">{MARRIAGE[su]}</b><i>{GLYPH[su]}</i>
            </motion.div>
          ))}
        </div>
        <p>{R.marriage}</p>

        <h3>{R.scoreH}</h3>
        <p>{R.score}</p>
        {sections.map(([h, p, on]) => (
          <div key={h} className={on ? '' : 'dim'}>
            <h3>{h}</h3>
            <p>{p}</p>
          </div>
        ))}

        <h3>{R.variantH}</h3>
        <ul className="kr-var">{R.variant(rules).map((x, i) => <li key={i}>{x}</li>)}</ul>

        <h3>{R.tipsH}</h3>
        <ul className="kr-tips">{R.tips.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <button className="btn acc kr-ok" onClick={onClose}>{s.coach.ok}</button>
      </motion.div>
    </>
  );
}
