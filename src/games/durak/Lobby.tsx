import { motion, useReducedMotion } from 'motion/react';
import { CardFace } from '../../components/CardFace';
import { useStrings } from '../../i18n/pick';
import { sfx } from '../../sound';
import { useApp } from '../../store';
import type { DurakLevel } from './bot';
import { PaperHat } from './Art';
import type { Card } from './engine';
import type { DurakSettings } from './save';
import { DURAK_STRINGS } from './strings';

const HERO: Card[] = [
  { id: '6S', r: '6', s: 'S' }, { id: '9D', r: '9', s: 'D' }, { id: 'QC', r: 'Q', s: 'C' }, { id: 'KH', r: 'K', s: 'H' }, { id: 'AS', r: 'A', s: 'S' },
];

function Seg<T extends string | number | boolean>({ id, value, options, onChange }: {
  id: string; value: T; options: { v: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="seg dkseg" role="radiogroup">
      {options.map(o => (
        <button key={String(o.v)} role="radio" aria-checked={o.v === value} className={o.v === value ? 'on' : ''} disabled={o.disabled}
          onClick={() => { if (o.v !== value) { sfx.tap(); onChange(o.v); } }}>
          {o.v === value && <motion.i layoutId={`dkpill-${id}`} className="pill" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

const IconBack = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M14.5 5.5L8 12l6.5 6.5" /></svg>);
const IconBook = () => (<svg viewBox="0 0 24 24" aria-hidden><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z" /><path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5" /></svg>);

export function Lobby({ settings, onChange, onStart, onResume, onRules, onExit }: {
  settings: DurakSettings; onChange: (s: DurakSettings) => void; onStart: () => void; onResume?: () => void; onRules: () => void; onExit: () => void;
}) {
  const s = useStrings(DURAK_STRINGS);
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const set = (p: Partial<DurakSettings>) => {
    const next = { ...settings, ...p };
    if (next.deck === 24 && next.players > 4) next.players = 4;
    onChange(next);
  };
  return (
    <div className="stage tbl dk dklobby">
      <div className="room" aria-hidden />
      <div className="spot" aria-hidden />
      <div className="tbar">
        <button className="glyph" aria-label={s.back} title={s.back} onClick={onExit}><IconBack /></button>
        <div />
        <div className="tright"><button className="glyph" aria-label={s.rules} title={s.rules} onClick={onRules}><IconBook /></button></div>
      </div>
      <div className="dklobby-in">
        <div className="dkhero" style={{ ['--cw' as string]: '74px' }} aria-hidden>
          {HERO.map((c, i) => {
            const k = i - 2;
            return (
              <motion.div key={c.id} className="dkhero-card"
                initial={reduce ? false : { y: 60, rotate: 0, opacity: 0 }}
                animate={{ y: Math.abs(k) * 7, rotate: k * 11, x: k * 34, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 170, damping: 17, delay: 0.08 + i * 0.06 }}>
                <CardFace card={c} lang={lang} />
              </motion.div>
            );
          })}
          <motion.div className="dkhero-emblem" initial={reduce ? false : { y: -40, rotate: -30, opacity: 0 }} animate={{ y: 0, rotate: -6, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.55 }}>
            <PaperHat size={86} />
          </motion.div>
        </div>
        <motion.h1 className="serif dktitle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{s.title}</motion.h1>
        <motion.p className="dktag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>{s.tagline}</motion.p>

        <motion.div className="dkpanel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 24 }}>
          <div className="label">{s.players}</div>
          <Seg id="pl" value={settings.players} onChange={v => set({ players: v })}
            options={[2, 3, 4, 5, 6].map(v => ({ v, label: String(v), disabled: settings.deck === 24 && v > 4 }))} />
          <div className="label">{s.level}</div>
          <Seg<DurakLevel> id="lv" value={settings.level} onChange={v => set({ level: v })}
            options={[{ v: 'easy', label: s.easy }, { v: 'normal', label: s.normal }, { v: 'hard', label: s.hard }]} />
          <div className="label">{s.variant}</div>
          <Seg id="vr" value={settings.transfer} onChange={v => set({ transfer: v })}
            options={[{ v: false, label: s.podkidnoy }, { v: true, label: s.perevodnoy }]} />
          <p className="dkvhint">{settings.transfer ? s.perevodnoyHint : s.podkidnoyHint}</p>
          <div className="label">{s.deck}</div>
          <Seg id="dk" value={settings.deck} onChange={v => set({ deck: v })} options={[{ v: 36, label: s.cards(36) }, { v: 24, label: s.cards(24) }]} />
        </motion.div>

        <motion.div className="dkgo" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          {onResume && <button className="btn ghost dkresume" onClick={onResume}>{s.resume}</button>}
          <button className="btn acc big dkdeal" onClick={() => { sfx.shuffle(); onStart(); }}>
            <span>{onResume ? s.newGame : s.play}</span><span className="arr" aria-hidden>→</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export function RulesSheet({ onClose }: { onClose: () => void }) {
  const s = useStrings(DURAK_STRINGS);
  return (
    <>
      <motion.div className="scrim" style={{ zIndex: 80 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet dkrules" style={{ zIndex: 81 }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        role="dialog" aria-label={s.rulesTitle}>
        <div className="grab" />
        <h2 className="serif">{s.rulesTitle}</h2>
        {s.rulesList.map((r, i) => (
          <motion.section key={r.h} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.03 }}>
            <h3>{r.h}</h3><p>{r.p}</p>
          </motion.section>
        ))}
        <button className="btn ghost" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>{s.close}</button>
      </motion.div>
    </>
  );
}
