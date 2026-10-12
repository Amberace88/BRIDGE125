import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { LANGS, type Lang, type LangInfo } from '../i18n';
import { loadLocale, preloadLocale } from '../locales';
import { useApp } from '../store';
import { useStrings, type Strings } from '../i18n/pick';
import '../styles/lang.css';

const S: Strings<{ search: string; empty: string; clear: string }> = {
  en: { search: 'Search languages', empty: 'No languages found', clear: 'Clear' },
  lv: { search: 'Meklēt valodu', empty: 'Nekas netika atrasts', clear: 'Notīrīt' },
  ru: { search: 'Поиск языка', empty: 'Ничего не найдено', clear: 'Очистить' },
  uk: { search: 'Пошук мови', empty: 'Нічого не знайдено', clear: 'Очистити' },
  lt: { search: 'Ieškoti kalbos', empty: 'Nieko nerasta', clear: 'Išvalyti' },
  et: { search: 'Otsi keelt', empty: 'Midagi ei leitud', clear: 'Tühjenda' },
  pl: { search: 'Szukaj języka', empty: 'Nic nie znaleziono', clear: 'Wyczyść' },
  de: { search: 'Sprache suchen', empty: 'Keine Treffer', clear: 'Löschen' },
  be: { search: 'Пошук мовы', empty: 'Нічога не знойдзена', clear: 'Ачысціць' },
  kk: { search: 'Тілді іздеу', empty: 'Ештеңе табылмады', clear: 'Тазарту' },
  uz: { search: 'Tilni qidirish', empty: 'Hech narsa topilmadi', clear: 'Tozalash' },
  az: { search: 'Dil axtar', empty: 'Heç nə tapılmadı', clear: 'Təmizlə' },
  ka: { search: 'ენის ძიება', empty: 'ვერაფერი მოიძებნა', clear: 'გასუფთავება' },
  hy: { search: 'Որոնել լեզուն', empty: 'Ոչինչ չի գտնվել', clear: 'Մաքրել' },
  ro: { search: 'Caută o limbă', empty: 'Niciun rezultat', clear: 'Șterge' },
  bg: { search: 'Търсене на език', empty: 'Няма резултати', clear: 'Изчисти' },
  es: { search: 'Buscar idioma', empty: 'Sin resultados', clear: 'Borrar' },
};

/**
 * Language picker: a searchable listbox. Desktop → popover anchored to the trigger; phones / touch → bottom sheet.
 *  - `compact`: globe + code (top navigation)
 *  - `pill`:    globe + native name
 *  - `field`:   full-width row (settings)
 */
export function LangPicker({ variant = 'compact' }: { variant?: 'compact' | 'pill' | 'field' }) {
  const app = useApp();
  const { t, lang } = app;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = LANGS.find(l => l.id === lang) ?? LANGS[0];

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }, []);

  const choose = useCallback(async (id: Lang) => {
    if (id !== lang) {
      await loadLocale(id);            // fetch the strings first so the switch is instant, without an English flash
      app.saveProfile({ lang: id });
    }
    close();
  }, [app, lang, close]);

  return (
    <>
      <button ref={trigger} type="button" className={`lp-trigger ${variant}`} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`${t.language}: ${current.label}`} title={t.language} onClick={() => setOpen(o => !o)}>
        <Globe />
        {variant === 'compact' && <span className="lp-code">{current.id.toUpperCase()}</span>}
        {variant === 'pill' && <span className="lp-name">{current.label}</span>}
        {variant === 'field' && (
          <span className="lp-fieldtxt"><b>{current.label}</b>{current.en !== current.label && <small>{current.en}</small>}</span>
        )}
        <Chevron open={open} />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && <Panel key="lp" anchor={trigger} lang={lang} title={t.language} closeLabel={t.close} onPick={choose} onClose={close} />}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

// ------------------------------------------------------------------------------------------------ panel

const collator = new Intl.Collator('en');
const SORTED = [...LANGS].sort((a, b) => collator.compare(a.label, b.label));
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯʻʼ'’]/g, '').toLowerCase();
const HAY = new Map(LANGS.map(l => [l.id, fold(`${l.label} ${l.en} ${l.id}`)]));

function useSheetMode() {
  const q = '(max-width: 640px), (pointer: coarse) and (max-width: 900px)';
  const [sheet, setSheet] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), f = () => setSheet(m.matches);
    m.addEventListener('change', f); return () => m.removeEventListener('change', f);
  }, []);
  return sheet;
}

interface PanelProps {
  anchor: RefObject<HTMLButtonElement | null>; lang: Lang; title: string; closeLabel: string;
  onPick: (id: Lang) => Promise<void> | void; onClose: (refocus?: boolean) => void;
}

function Panel({ anchor, lang, title, closeLabel, onPick, onClose }: PanelProps) {
  const sheet = useSheetMode();
  const s = useStrings(S);
  const drag = useDragControls();
  const uid = useId();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<Lang | null>(null);
  const items = useMemo(() => {
    const q = fold(query.trim());
    return q ? SORTED.filter(l => HAY.get(l.id)!.includes(q)) : SORTED;
  }, [query]);
  const [rawActive, setActive] = useState(() => Math.max(0, SORTED.findIndex(l => l.id === lang)));
  const active = items.length ? Math.min(rawActive, items.length - 1) : 0;   // keep in range as the filter narrows
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxH: number; up: boolean } | null>(null);

  // anchor the popover under (or above) the trigger
  useLayoutEffect(() => {
    if (sheet) return;
    const place = () => {
      const r = anchor.current?.getBoundingClientRect(); if (!r) return;
      const W = 300, gap = 8, vw = window.innerWidth, vh = window.innerHeight;
      const left = Math.min(Math.max(12, r.right - W), vw - W - 12);
      const below = vh - r.bottom - gap - 12, above = r.top - gap - 12;
      const up = below < 320 && above > below;
      setPos(up ? { bottom: vh - r.top + gap, left, maxH: Math.min(460, above), up } : { top: r.bottom + gap, left, maxH: Math.min(460, below), up });
    };
    place();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchor, sheet]);

  // focus: search box on desktop; on touch focus the panel (no surprise keyboard)
  useEffect(() => {
    const id = requestAnimationFrame(() => (sheet ? box.current : input.current)?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [sheet]);

  // click outside (popover only; the sheet has a scrim)
  useEffect(() => {
    if (sheet) return;
    const f = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !anchor.current?.contains(t)) onClose(false);
    };
    document.addEventListener('pointerdown', f, true);
    return () => document.removeEventListener('pointerdown', f, true);
  }, [sheet, anchor, onClose]);

  // scroll the active row into view
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    const l = items[active]; if (l) preloadLocale(l.id);
  }, [active, items]);

  const pick = async (l: LangInfo) => {
    if (busy) return;
    setBusy(l.id);
    try { await onPick(l.id); } finally { setBusy(null); }
  };

  const onKey = (e: KeyboardEvent) => {
    const n = items.length;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); if (n) setActive((active + 1) % n); break;
      case 'ArrowUp': e.preventDefault(); if (n) setActive((active - 1 + n) % n); break;
      case 'Home': if (e.target !== input.current || !query) { e.preventDefault(); setActive(0); } break;
      case 'End': if (e.target !== input.current || !query) { e.preventDefault(); setActive(Math.max(0, n - 1)); } break;
      case 'PageDown': e.preventDefault(); setActive(Math.max(0, Math.min(n - 1, active + 6))); break;
      case 'PageUp': e.preventDefault(); setActive(Math.max(0, active - 6)); break;
      case 'Enter': e.preventDefault(); if (items[active]) pick(items[active]); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); onClose(); break;
      case 'Tab': onClose(false); break;
      default:
        // typing anywhere in the panel goes to the search box
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.target !== input.current) input.current?.focus();
    }
  };

  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-o${i}`;

  const body = (
    <>
      <div className="lp-head">
        <span className="lp-title">{title}</span>
        {sheet && <button type="button" className="lp-x" aria-label={closeLabel} onClick={() => onClose()}>×</button>}
      </div>
      <div className="lp-search">
        <SearchIcon />
        <input ref={input} type="search" className="lp-input" value={query} onChange={e => { setQuery(e.target.value); setActive(0); }}
          placeholder={s.search} aria-label={s.search} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="go"
          role="combobox" aria-expanded aria-controls={listId} aria-autocomplete="list" aria-activedescendant={items[active] ? optId(active) : undefined} />
        {query && <button type="button" className="lp-clear" aria-label={s.clear} onClick={() => { setQuery(''); setActive(0); input.current?.focus(); }}>×</button>}
      </div>
      <ul ref={list} id={listId} className="lp-list" role="listbox" aria-label={title} tabIndex={-1}>
        {items.map((l, i) => {
          const on = l.id === lang, act = i === active;
          return (
            <motion.li key={l.id} id={optId(i)} data-i={i} role="option" aria-selected={on} lang={l.id}
              className={`lp-opt ${on ? 'on' : ''} ${act ? 'act' : ''}`}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.014, duration: 0.18 }}
              onPointerMove={() => { if (!act) setActive(i); }} onClick={() => pick(l)}>
              {act && <motion.span layoutId={`${uid}-hl`} className="lp-hl" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
              <span className="lp-code2" aria-hidden>{l.id}</span>
              <span className="lp-txt"><b>{l.label}</b>{l.en !== l.label && <small lang="en">{l.en}</small>}</span>
              {busy === l.id ? <span className="lp-spin" aria-hidden /> : on ? <Check /> : null}
            </motion.li>
          );
        })}
        {!items.length && <li className="lp-empty" role="presentation">{s.empty}</li>}
      </ul>
    </>
  );

  if (sheet) {
    return (
      <div className="lp-layer">
        <motion.div className="lp-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onClose()} />
        <motion.div ref={box} className="lp-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={onKey}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          drag="y" dragControls={drag} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }} dragListener={false}
          onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); }}>
          <div className="lp-grabzone" aria-hidden onPointerDown={e => drag.start(e)}><div className="lp-grab" /></div>
          {body}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div ref={box} className={`lp-pop ${pos?.up ? 'up' : ''}`} role="dialog" aria-label={title} onKeyDown={onKey}
      style={{ top: pos?.top, bottom: pos?.bottom, left: pos?.left ?? -9999, ['--lp-maxh' as string]: `${pos?.maxH ?? 420}px` }}
      initial={{ opacity: 0, scale: 0.96, y: pos?.up ? 6 : -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: pos?.up ? 4 : -4, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 460, damping: 32 }}>
      {body}
    </motion.div>
  );
}

// ------------------------------------------------------------------------------------------------ icons

const Globe = () => (
  <svg className="lp-globe" viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" />
  </svg>
);
const Chevron = ({ open }: { open: boolean }) => (
  <motion.svg className="lp-chev" viewBox="0 0 12 12" width="11" height="11" aria-hidden animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }}>
    <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>
);
const SearchIcon = () => (
  <svg className="lp-sicon" viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="9" cy="9" r="5.5" /><path d="m13.2 13.2 3.6 3.6" />
  </svg>
);
const Check = () => (
  <motion.svg className="lp-check" viewBox="0 0 16 16" width="16" height="16" aria-hidden initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
    <motion.path d="M3.5 8.5 6.5 11.5 12.5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.1 }} />
  </motion.svg>
);
