import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { ACCENTS, TABLES, backCss } from '../theme';
import { CardFace } from '../components/CardView';
import type { Card } from '../engine/engine';
import { sfx, buzz } from '../sound';
import { COLLECTIBLES, cosmetic, fmtBm, slotOptions, type Slot } from '../shop/catalog';
import { COS_KINDS, emotesOf, type CosKind } from './data';
import { COS_STRINGS } from './i18n';
import { useCosmetics } from './useCosmetics';
import { cosName } from './Badges';
import { BackCard, BannerCard, ItemThumb, SeatCard } from './Previews';
import { VictoryEffect } from './VictoryEffect';
import { focusShopItem } from './shopFocus';

type Look = Record<Slot, string>;
const CATS: Slot[] = ['table', 'back', 'face', 'frame', 'victory', 'emotes', 'title', 'namecolor', 'banner', 'accent'];
const CAT_ICON: Record<Slot, string> = { table: '▦', back: '🂠', face: '🂡', frame: '◎', victory: '✦', emotes: '☺', title: '🏷', namecolor: 'Aa', banner: '▭', accent: '◉' };
const isCos = (s: Slot): s is CosKind => (COS_KINDS as string[]).includes(s);

const HAND: Card[] = [{ id: 'AS', r: 'A', s: 'S' }, { id: 'QH', r: 'Q', s: 'H' }, { id: 'JD', r: 'J', s: 'D' }];

/** Big live preview: table + deck + hand (face style) + your seat (frame, name colour, title) + emotes / victory / banner. */
function Stage({ look, cat, replay }: { look: Look; cat: Slot; replay: number }) {
  const app = useApp();
  const tb = TABLES.find(x => x.id === look.table) ?? TABLES[0];
  const ac = ACCENTS.find(x => x.id === look.accent) ?? ACCENTS[0];
  const vars = { ['--acc' as string]: ac.base, ['--acc-hi' as string]: ac.hi, ['--acc-lo' as string]: ac.lo, ['--acc-ink' as string]: ac.ink };
  const emotes = emotesOf(look.emotes);
  const [ei, setEi] = useState(0);
  useEffect(() => {
    if (cat !== 'emotes') return;
    const t = setInterval(() => setEi(i => i + 1), 1100);
    return () => clearInterval(t);
  }, [cat]);

  if (cat === 'banner') {
    return (
      <div className="wstage wbanner" style={vars}>
        <AnimatePresence initial={false}>
          <motion.div key={look.banner} className="wbannerin" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <BannerCard banner={look.banner} frame={look.frame} title={look.title} namecolor={look.namecolor} />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="wstage" style={vars}>
      <AnimatePresence initial={false}>
        <motion.div key={tb.id} className="wbg" style={{ background: tb.css, backgroundColor: tb.tone }} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
      </AnimatePresence>
      <span className="wvig" aria-hidden />
      <div className="wdeck">
        {[0, 1, 2].map(i => (
          <motion.div key={look.back + look.table + i} className="wdeckcard" style={{ rotate: -5 + i * 3, x: i * 2, y: -i * 2 }}
            initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 220, damping: 18 }}>
            <BackCard id={look.back} table={look.table} w={50} />
          </motion.div>
        ))}
      </div>
      <div className="whand" data-face={look.face}>
        {HAND.map((c, i) => (
          <motion.div key={c.id + look.face} className="card" style={{ width: 62, height: 89, ['--cw' as string]: '62px', position: 'absolute', left: `calc(50% - 31px + ${(i - 1) * 40}px)`, top: 150 }}
            initial={{ y: 40, rotate: 0, opacity: 0 }} animate={{ y: i === 1 ? -8 : 0, rotate: (i - 1) * 9, opacity: 1 }} transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 220, damping: 18 }}>
            <CardFace card={c} lang={app.lang} />
          </motion.div>
        ))}
      </div>
      <div className="wseat">
        <SeatCard frame={look.frame} title={look.title} namecolor={look.namecolor} size={36} />
        <AnimatePresence>
          {cat === 'emotes' && (
            <motion.span key={emotes[ei % emotes.length] + look.emotes} className="embubble wemote" initial={{ scale: 0.3, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}>{emotes[ei % emotes.length]}</motion.span>
          )}
        </AnimatePresence>
      </div>
      <motion.div key={ac.id} className="wbtn" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}>♠ {app.t.nav.play}</motion.div>
      <div className="wchip"><i className="coin" />{(app.profile?.bm ?? 5000).toLocaleString('fr-FR')}</div>
      {cat === 'victory' && <VictoryEffect key={look.victory + replay} id={look.victory} contained />}
    </div>
  );
}

/**
 * Profile → Style: the wardrobe. Every category, owned / equipped / locked states, try-on preview for locked items,
 * "Get it" → Shop on that item. Admin / god: everything is equippable.
 */
export function Wardrobe({ onShop }: { onShop?: (itemId?: string) => void }) {
  const app = useApp();
  const p = app.t.prof;
  const C = useStrings(COS_STRINGS);
  const cos = useCosmetics();
  const signedIn = !!app.session;
  const [cat, setCat] = useState<Slot>('table');
  const [replay, setReplay] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTm = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (m: string) => { setToast(m); if (toastTm.current) clearTimeout(toastTm.current); toastTm.current = setTimeout(() => setToast(null), 2400); };

  const saved: Look = useMemo(() => ({
    table: app.canUse(app.table) ? app.table : 'malachite', accent: app.canUse(app.accent) ? app.accent : 'brass', back: app.canUse(app.cardBack) ? app.cardBack : 'match',
    ...cos.equipped,
  }), [app, cos.equipped]);
  const [pv, setPv] = useState<Partial<Look>>({});
  const look: Look = { ...saved, ...pv };
  const [lastTry, setLastTry] = useState<Slot | null>(null);
  const isLockedTry = (k: Slot) => !!pv[k] && pv[k] !== saved[k] && !app.canUse(pv[k]!);
  const lockedTry = lastTry && isLockedTry(lastTry) ? lastTry : (Object.keys(pv) as Slot[]).find(isLockedTry);

  const owned = new Set(app.profile?.owned ?? []);
  const collected = app.isPrivileged ? COLLECTIBLES.length : COLLECTIBLES.filter(c => owned.has(c.id)).length;

  const equip = async (slot: Slot, id: string) => {
    if (isCos(slot)) return cos.equip(slot, id);
    return app.saveProfile(slot === 'table' ? { table: id } : slot === 'accent' ? { accent: id } : { cardBack: id });
  };

  const pick = (slot: Slot, id: string) => {
    sfx.tap();
    if (slot === 'victory') setReplay(r => r + 1);
    if (!app.canUse(id)) {                                  // locked → try on only
      setPv(v => ({ ...v, [slot]: id }));
      setLastTry(slot);
      buzz(8);
      return;
    }
    setPv(v => { const n = { ...v }; delete n[slot]; return n; });
    if (!signedIn && slotOptions(slot).find(o => o.id === id)?.premium) { flash(C.signInToSave); return; }
    if (saved[slot] === id) return;
    void equip(slot, id);
    buzz(12);
  };
  const revert = () => setPv({});

  const getIt = (id?: string) => {
    sfx.tap();
    focusShopItem(id);
    onShop?.(id);
  };

  const tryItem = lockedTry ? cosmetic(pv[lockedTry]!) : undefined;

  return (
    <div className="wardrobe">
      <div className="wstagewrap">
        <Stage look={look} cat={cat} replay={replay} />
        {cat === 'victory' && <button className="wreplay" onClick={() => setReplay(r => r + 1)}>▶ {C.replay}</button>}
      </div>

      <AnimatePresence initial={false}>
        {tryItem && lockedTry && (
          <motion.div className={`wtry r-${tryItem.rarity}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="wtryin">
              <span className="wtryeye" aria-hidden>👁</span>
              <div className="wtrytxt"><small>{C.trying}</small><b>{cosName(app.lang, tryItem.id, slotOptions(lockedTry).find(o => o.id === tryItem.id)?.name)}</b></div>
              <button className="wtryx" onClick={revert} aria-label="↺">↺</button>
              <button className="wget" onClick={() => getIt(tryItem.id)}>
                <span>{C.getIt}</span><span className="wprice"><i className="scoin" />{fmtBm(tryItem.priceBm)}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {app.isPrivileged ? (
        <div className="adminnote wcrown">👑 {C.allUnlocked}</div>
      ) : (
        <button className="wcollect" onClick={() => getIt()} disabled={!onShop}>
          <div className="wcolltop"><b>{C.wardrobe}</b><span>{C.collected(collected, COLLECTIBLES.length)}</span>{onShop && <em>💎 {p.premium} →</em>}</div>
          <div className="wbar"><motion.i initial={{ width: 0 }} animate={{ width: `${(collected / COLLECTIBLES.length) * 100}%` }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} /></div>
        </button>
      )}

      <nav className="wcats" role="tablist">
        {CATS.map(k => (
          <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? 'on' : ''} onClick={() => { setCat(k); sfx.tap(); }}>
            {cat === k && <motion.span layoutId="wcat" className="wcatpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="wcatic" aria-hidden>{CAT_ICON[k]}</span><span>{C.cats[k]}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={cat} className={`wgrid wgrid-${cat}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
          {slotOptions(cat).map((o, i) => {
            const c = cosmetic(o.id);
            const can = app.canUse(o.id);
            const isEq = saved[cat] === o.id;
            const isPv = look[cat] === o.id;
            const rarity = o.premium ? c?.rarity ?? 'rare' : 'common';
            const name = o.id === 'match' ? p.matchBack : cosName(app.lang, o.id, o.name);
            const a11y = cat === 'face' && o.id === 'f_large';
            return (
              <motion.button key={o.id} className={`wtile r-${rarity} ${isPv ? 'wpv' : ''} ${isEq ? 'eq' : ''} ${can ? '' : 'locked'}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.022 }} whileTap={{ scale: 0.95 }}
                onClick={() => pick(cat, o.id)} aria-pressed={isEq} title={name}>
                <span className="wthumb">
                  {cat === 'back' && o.id === 'match'
                    ? <div className="czth" style={{ background: (TABLES.find(t => t.id === look.table) ?? TABLES[0]).css }}><span className="czback" style={{ width: 34, height: 49, background: backCss('match', look.table) }}><i /></span></div>
                    : <ItemThumb id={o.id} slot={cat} table={look.table} />}
                  {o.premium && <span className="wrar" aria-hidden />}
                </span>
                <span className="wname">{name}</span>
                <span className="wstate">
                  {isEq ? <em className="eq">✓ {C.equipped}</em>
                    : !o.premium ? <em className="free">{a11y ? `♿ ${C.a11y}` : C.free}</em>
                    : can ? <em className="own">{app.isPrivileged && !owned.has(o.id) ? '👑' : '✓'} {C.owned}</em>
                    : <em className="lock">🔒 {c ? fmtBm(c.priceBm) : C.locked}</em>}
                </span>
                {isEq && <motion.span layoutId={`weq-${cat}`} className="weqring" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {toast && <motion.div className="ptoast" role="status" initial={{ y: 30, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 30, opacity: 0, x: '-50%' }}>{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
