import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ROMAN } from '../../campaign/art';
import type { MatchDef } from '../../campaign/data';
import type { JourneyStrings } from '../../i18n/journey';
import { TwistIcon } from './Chapter';

/**
 * A brass bookmark on the left edge of the table during a Journey match: chapter numeral + house-rule glyph.
 * It opens by itself for a few seconds at the start (so the rule is never a surprise) and on tap.
 */
export function HouseRuleTab({ s, m, n }: { s: JourneyStrings; m: MatchDef; n: number }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOpen(false), 4200); return () => clearTimeout(t); }, []);
  return (
    <motion.button className={`jtab ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={s.twists[m.twist].name}
      initial={{ x: -80 }} animate={{ x: 0 }} transition={{ delay: 0.6, type: 'spring', stiffness: 220, damping: 22 }}>
      <span className="jtab-num serif">{ROMAN[n - 1]}</span>
      <TwistIcon twist={m.twist} />
      <AnimatePresence initial={false}>
        {open && (
          <motion.span className="jtab-tx" initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.35 }}>
            <small>{s.cities[m.chapter].name} · {s.hud.houseRule}</small>
            <b className="serif">{s.twists[m.twist].name}</b>
            <span>{s.twists[m.twist].desc}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
