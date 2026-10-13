import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { ACH_STRINGS, type AchStrings } from '../i18n/achievements';
import { ACHIEVEMENTS, ACH_CATEGORIES, achDef, achProgress, type AchCategory, type AchDef } from '../progress/achievements';
import { TierMedal } from '../progress/Medal';
import { useAchievements } from '../progress/useProgress';
import { cosName } from '../cosmetics/Badges';
import { fmtBm } from '../shop/catalog';
import { track } from '../analytics';
import { sfx, buzz } from '../sound';
import '../styles/achievements.css';

type Cat = AchCategory | 'all';
type Filter = 'all' | 'got' | 'todo';
const CAT_GLYPH: Record<Cat, string> = {
  all: '◈', firsts: '✦', mastery: '♛', cards: '♠', scoring: '125', social: '◎', bluff: '◐', collector: '❖', streaks: '≋', journey: '➶', games: '◈', secret: '?',
};

export const achName = (S: AchStrings, code: string) => S.list[code]?.name ?? ACH_STRINGS.en.list[code]?.name ?? code;
export const achDesc = (S: AchStrings, code: string) => S.list[code]?.desc ?? ACH_STRINGS.en.list[code]?.desc ?? '';
export const achHint = (S: AchStrings, code: string) => S.list[code]?.hint ?? ACH_STRINGS.en.list[code]?.hint ?? '';
export const itemName = (S: AchStrings, lang: string, id: string) => S.items[id] ?? ACH_STRINGS.en.items[id] ?? cosName(lang, id);

function rarityText(S: AchStrings, code: string, rarity: { players: number; counts: Record<string, number> } | null): string {
  if (!rarity) return S.rarityLoading;
  const n = rarity.counts[code] ?? 0;
  if (!rarity.players || !n) return S.rarityFirst;
  const pct = (n / rarity.players) * 100;
  return S.rarity(pct < 1 ? '<1 %' : `${pct < 10 ? pct.toFixed(1).replace(/\.0$/, '') : Math.round(pct)} %`);
}

/* ================================================================== hall */

/**
 * The Trophy Hall — full-screen overlay (mount like the Shop: inside the overlays' <AnimatePresence>).
 *   <AchievementsHall onClose={…} onAuth={…} />
 */
export function AchievementsHall({ onClose, onAuth, initialCode }: { onClose: () => void; onAuth?: () => void; initialCode?: string }) {
  const app = useApp();
  const S = useStrings(ACH_STRINGS);
  const A = useAchievements({ rarity: true });
  const [cat, setCat] = useState<Cat>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(initialCode ?? null);
  const [note, setNote] = useState<string | null>(null);
  const railRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const have = useMemo(() => new Set(A.unlocked), [A.unlocked]);
  const total = ACHIEVEMENTS.length;

  useEffect(() => { track('ach_hall_view', { unlocked: have.size }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (open) setOpen(null); else onClose(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  useEffect(() => { railRef.current?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [cat]);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2200); return () => clearTimeout(t); }, [note]);

  const byCat = useMemo(() => {
    const m = new Map<AchCategory, AchDef[]>();
    for (const c of ACH_CATEGORIES) m.set(c, ACHIEVEMENTS.filter(a => a.cat === c));
    return m;
  }, []);
  const pass = (a: AchDef) => filter === 'all' || (filter === 'got' ? have.has(a.code) : !have.has(a.code));
  const sections = (cat === 'all' ? ACH_CATEGORIES : [cat]).map(c => ({ c, list: (byCat.get(c) ?? []).filter(pass) })).filter(s => s.list.length);

  const nearly = useMemo(() => ACHIEVEMENTS
    .filter(a => !have.has(a.code) && !a.secret && a.goal && a.goal.n > 1)
    .map(a => ({ a, p: achProgress(a, A.stats, false) }))
    .filter(x => x.p.pct >= 0.3 && x.p.pct < 1)
    .sort((x, y) => y.p.pct - x.p.pct).slice(0, 3), [have, A.stats]);

  const pinnedValid = A.pinned.filter(c => have.has(c));
  const togglePin = async (code: string) => {
    const on = pinnedValid.includes(code);
    if (!on && pinnedValid.length >= 3) { setNote(S.pinFull); buzz(20); return; }
    const next = on ? pinnedValid.filter(c => c !== code) : [...pinnedValid, code];
    sfx.tap(); buzz(10);
    const r = await A.pin(next);
    if (r.ok) { setNote(on ? S.unpin : S.pinned); track('ach_pin', { code, on: !on }); }
  };

  return (
    <motion.div className="achhall" role="dialog" aria-modal="true" aria-label={S.title}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="achbg" aria-hidden><i className="achspot" /><i className="achspot b" /></div>

      <header className="achtop">
        <div className="achrow">
          <div className="achtitle">
            <small>{S.kicker}</small>
            <h1 className="serif">{S.title}</h1>
          </div>
          <button className="iconbtn achx" onClick={onClose} aria-label={S.close}>×</button>
        </div>
        <div className="achrow achmeta">
          <div className="achcount">
            <b className="serif">{have.size}</b><span>/ {total}</span>
            <div className="achbar"><motion.i initial={{ width: 0 }} animate={{ width: `${(have.size / total) * 100}%` }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }} /></div>
          </div>
          <div className="seg achfilter" role="tablist">
            {(['all', 'got', 'todo'] as Filter[]).map(f => (
              <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {filter === f && <motion.span layoutId="achfpill" className="pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                {S.filter[f]}
              </button>
            ))}
          </div>
        </div>
        <nav className="achrail" ref={railRef} aria-label={S.title}>
          {(['all', ...ACH_CATEGORIES] as Cat[]).map(c => {
            const list = c === 'all' ? ACHIEVEMENTS : byCat.get(c) ?? [];
            const got = list.filter(a => have.has(a.code)).length;
            return (
              <button key={c} className={`${cat === c ? 'on' : ''} ${c === 'secret' ? 'sec' : ''}`} onClick={() => { setCat(c); sfx.tap(); }}>
                {cat === c && <motion.span layoutId="achcatpill" className="achcatpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <i>{CAT_GLYPH[c]}</i><span>{S.cats[c]}</span><em>{got}/{list.length}</em>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="achbody" ref={bodyRef}>
        <div className="achwrap">
          {!A.signedIn && (
            <div className="achguest">
              <TierMedal code="first_win" size={46} />
              <p>{S.signIn}</p>
              {onAuth && <button className="btn acc" onClick={onAuth}>{S.signInBtn}</button>}
            </div>
          )}

          {cat === 'all' && filter === 'all' && (
            <section className="achshow">
              <div className="achsechead"><b className="serif">{S.showcase}</b><span>{S.showcaseSub}</span></div>
              <div className="achplinths">
                {[0, 1, 2].map(i => {
                  const code = pinnedValid[i];
                  return (
                    <button key={i} className={`achplinth ${code ? 'full' : ''}`} onClick={() => code && setOpen(code)} disabled={!code}>
                      <span className="achplight" />
                      {code ? (
                        <motion.span key={code} initial={{ y: 14, opacity: 0, rotateY: 90 }} animate={{ y: 0, opacity: 1, rotateY: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16, delay: i * 0.08 }}>
                          <TierMedal code={code} size={62} glow />
                        </motion.span>
                      ) : <span className="achplempty">◇</span>}
                      <span className="achplbase" />
                      <small>{code ? achName(S, code) : S.showcaseEmpty}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {cat === 'all' && filter !== 'got' && nearly.length > 0 && (
            <section className="achnear">
              <div className="achsechead"><b className="serif">{S.nextUp}</b></div>
              <div className="achnearlist">
                {nearly.map(({ a, p }) => (
                  <button key={a.code} className={`achnearcard t-${a.tier}`} onClick={() => setOpen(a.code)}>
                    <TierMedal code={a.code} size={40} locked ring={p.pct} />
                    <span className="achneartxt"><b>{achName(S, a.code)}</b><em>{S.progress(fmtBm(p.cur), fmtBm(p.n))}</em></span>
                    <span className="achnearbar"><i style={{ width: `${p.pct * 100}%` }} /></span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={cat + filter} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
              {sections.map(({ c, list }) => {
                const all = byCat.get(c) ?? [];
                return (
                  <section key={c} className={`achsec cat-${c}`}>
                    <div className="achsechead">
                      <b className="serif"><i>{CAT_GLYPH[c]}</i>{S.cats[c]}</b>
                      <span>{all.filter(a => have.has(a.code)).length} / {all.length}</span>
                    </div>
                    <div className="achgrid2">
                      {list.map((a, i) => (
                        <MedalCard key={a.code} a={a} S={S} got={have.has(a.code)} stats={A.stats} pinned={pinnedValid.includes(a.code)}
                          delay={Math.min(i, 12) * 0.025} onOpen={() => { setOpen(a.code); sfx.tap(); }} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <AchDetail key={open} code={open} S={S} lang={app.lang} got={have.has(open)} stats={A.stats} rarity={A.rarity}
            pinned={pinnedValid.includes(open)} canPin={A.signedIn} onPin={() => togglePin(open)} onClose={() => setOpen(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {note && <motion.div className="achnote" initial={{ y: 20, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 10, opacity: 0, x: '-50%' }}>{note}</motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================== card */

function MedalCard({ a, S, got, stats, pinned, delay, onOpen }: {
  a: AchDef; S: AchStrings; got: boolean; stats: Record<string, number> | null; pinned: boolean; delay: number; onOpen: () => void;
}) {
  const hidden = !!a.secret && !got;
  const p = achProgress(a, stats, got);
  return (
    <motion.button className={`achcard2 t-${a.tier} ${got ? 'got' : 'locked'} ${hidden ? 'hidden' : ''}`} onClick={onOpen}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }} whileTap={{ scale: 0.97 }}>
      <span className="achcardglow" />
      <TierMedal code={a.code} size={58} locked={!got} secret={a.secret} ring={!got && a.goal && a.goal.n > 1 ? p.pct : undefined} />
      <span className="achcardname">{hidden ? S.secretName : achName(S, a.code)}</span>
      <span className="achcardsub">
        {got ? <><i className="achtick">✓</i>{S.tiers[a.tier]}</>
          : hidden ? <em className="achhint">{achHint(S, a.code)}</em>
          : a.goal && a.goal.n > 1 ? <span className="achmini"><i style={{ width: `${p.pct * 100}%` }} /><em>{S.progress(fmtBm(p.cur), fmtBm(p.n))}</em></span>
          : <>{S.tiers[a.tier]}</>}
      </span>
      {pinned && <span className="achpin" aria-label={S.pinned}>◆</span>}
    </motion.button>
  );
}

/* ================================================================== detail sheet */

function AchDetail({ code, S, lang, got, stats, rarity, pinned, canPin, onPin, onClose }: {
  code: string; S: AchStrings; lang: string; got: boolean; stats: Record<string, number> | null;
  rarity: { players: number; counts: Record<string, number> } | null; pinned: boolean; canPin: boolean; onPin: () => void; onClose: () => void;
}) {
  const a = achDef(code)!;
  const hidden = !!a.secret && !got;
  const p = achProgress(a, stats, got);
  // pointer tilt on the big medal
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 14 }), sry = useSpring(ry, { stiffness: 160, damping: 14 });
  const move = (e: RPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 36); rx.set(-((e.clientY - r.top) / r.height - 0.5) * 30);
  };
  const leave = () => { rx.set(0); ry.set(0); };
  return (
    <>
      <motion.div className="achscrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className={`achsheet t-${a.tier} ${got ? 'got' : 'locked'} ${hidden ? 'hidden' : ''}`} role="dialog" aria-modal="true"
        aria-label={hidden ? S.secretName : achName(S, code)}
        initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
        <span className="achgrab" />
        <button className="achsheetx" onClick={onClose} aria-label={S.close}>×</button>
        <div className="achstage" onPointerMove={move} onPointerLeave={leave}>
          <span className="achrays" />
          <motion.span className="achbig" style={{ rotateX: srx, rotateY: sry }}
            initial={{ rotateY: -200, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 13 }}>
            <TierMedal code={code} size={128} locked={!got} secret={a.secret} glow={got} />
          </motion.span>
        </div>
        <div className="achdtags">
          <span className={`achtier t-${a.tier}`}>{S.tiers[a.tier]}</span>
          <span className="achcat">{S.cats[a.cat]}</span>
          <span className={`achstate ${got ? 'on' : ''}`}>{got ? S.unlockedTag : S.lockedTag}</span>
        </div>
        <h2 className="serif">{hidden ? S.secretName : achName(S, code)}</h2>
        {hidden ? (
          <div className="achwhisper"><small>{S.hint}</small><p>“{achHint(S, code)}”</p></div>
        ) : (
          <div className="achhow"><small>{S.howTo}</small><p>{achDesc(S, code)}</p></div>
        )}
        {!got && !hidden && a.goal && a.goal.n > 1 && (
          <div className="achdprog">
            <div className="achdbar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(2, p.pct * 100)}%` }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} /></div>
            <b>{S.progress(fmtBm(p.cur), fmtBm(p.n))}</b>
          </div>
        )}
        <div className="achrarity"><i style={{ width: `${rarityPct(code, rarity)}%` }} /><span>{rarityText(S, code, rarity)}</span></div>
        <div className="achrewards">
          <small>{S.rewards}</small>
          <div>
            {a.bm > 0 && <span className="achrw bm"><i className="coin" />{fmtBm(a.bm)} BM</span>}
            {a.xp > 0 && <span className="achrw xp">{S.xp(fmtBm(a.xp))}</span>}
            {a.shards > 0 && <span className="achrw sh"><i className="shardi" />{S.shards(a.shards)}</span>}
            {a.item && !hidden && <span className="achrw it">✦ {S.item(itemName(S, lang, a.item))}</span>}
          </div>
        </div>
        {got && canPin && (
          <button className={`btn ${pinned ? 'ghost' : 'acc'} achpinbtn`} onClick={onPin}>{pinned ? S.unpin : S.pin}</button>
        )}
      </motion.div>
    </>
  );
}

function rarityPct(code: string, rarity: { players: number; counts: Record<string, number> } | null) {
  if (!rarity?.players) return 0;
  return Math.min(100, ((rarity.counts[code] ?? 0) / rarity.players) * 100);
}

/* ================================================================== profile showcase (compact) */

/**
 * Three pinned medals in a row — for the Profile sheet header or a player card.
 *   <AchShowcase codes={pinned} size={34} onOpen={() => openHall()} />
 */
export function AchShowcase({ codes, size = 34, onOpen }: { codes: string[]; size?: number; onOpen?: () => void }) {
  const S = useStrings(ACH_STRINGS);
  if (!codes.length) return null;
  const body = codes.slice(0, 3).map(c => <span key={c} title={achName(S, c)}><TierMedal code={c} size={size} /></span>);
  return onOpen
    ? <button className="achmini3" onClick={onOpen} aria-label={S.showcase}>{body}</button>
    : <span className="achmini3" aria-label={S.showcase}>{body}</span>;
}
