/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sql8 from '../../supabase/migration_008_cosmetics.sql?raw';
import { ACCENTS, BACKS, TABLES } from '../theme';
import { COSMETICS, PACKS, cosmetic, featuredToday, packPrice, packSavePct, packWorth } from '../shop/catalog';
import { COS_COLUMN, COS_DEFAULTS, COS_KINDS, COS_LISTS, EMOTE_PACKS, FACES } from './data';
import { COS_STRINGS } from './i18n';
import { FRAME_IDS } from './AvatarFrame';

const css = readFileSync(join(process.cwd(), 'src/styles/cosmetics.css'), 'utf8');

describe('cosmetics catalogue', () => {
  it('ids are unique across every category (profile.owned is one flat list)', () => {
    const ids = [...ACCENTS, ...TABLES, ...BACKS.filter(b => b.id !== 'match'), ...COS_KINDS.flatMap(k => COS_LISTS[k]), ...PACKS].map(x => x.id);
    // sets share an id between two theme slots on purpose (neon, royal, jugend)
    const shared = new Set(['neon', 'royal', 'jugend']);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i && !shared.has(id));
    expect(dupes).toEqual([]);
  });

  it('pack contents in SQL match catalog.ts, and every pack is a real discount', () => {
    const rows = [...sql8.matchAll(/\('(pk_[a-z0-9_]+)',[^\n]*?array\[([^\]]*)\]\)/g)].map(m => ({ id: m[1], grants: [...m[2].matchAll(/'([a-z0-9_]+)'/g)].map(g => g[1]) }));
    expect(rows).toEqual(PACKS.map(p => ({ id: p.id, grants: p.grants })));
    for (const p of PACKS) {
      for (const g of p.grants ?? []) expect(cosmetic(g), g).toBeTruthy();
      expect(p.priceBm).toBeLessThan(packWorth(p));
      expect(packSavePct(p)).toBeGreaterThanOrEqual(20);
    }
  });

  it('pack price for partial owners mirrors buy_item() (proportional, rounded to 10)', () => {
    const starter = cosmetic('pk_starter')!;
    expect(packPrice(starter, () => false)).toBe(starter.priceBm);
    expect(packPrice(starter, id => id === 'fr_neon')).toBe(2190);           // verified against Postgres
    expect(packPrice(starter, () => true)).toBeNull();
  });

  it('every equipped-cosmetic column is client-writable and guarded by the trigger', () => {
    for (const k of COS_KINDS) {
      const col = COS_COLUMN[k];
      expect(sql8).toContain(`add column if not exists ${col}`);
      expect(sql8).toMatch(new RegExp(`grant update \\([^)]*\\b${col}\\b`));
      expect(sql8).toMatch(new RegExp(`before update of [^\\n]*\\b${col}\\b`));
      expect(sql8).toContain(`new.${col} := old.${col}`);
    }
  });

  it('defaults are free; every face has CSS, every frame has decor; emote packs have ≥ 6 emotes', () => {
    for (const k of COS_KINDS) expect(COS_LISTS[k].find(i => i.id === COS_DEFAULTS[k])?.premium).toBeFalsy();
    for (const f of FACES.filter(f => f.id !== 'f_classic')) expect(css).toContain(`[data-face="${f.id}"]`);
    expect(FACES.find(f => f.id === 'f_large')?.premium).toBeFalsy();     // accessibility stays free
    for (const f of COS_LISTS.frame.filter(f => f.id !== 'fr_none')) expect(FRAME_IDS).toContain(f.id);
    for (const p of EMOTE_PACKS) expect(p.emotes.length).toBeGreaterThanOrEqual(6);
  });

  it('every sellable item has an English name', () => {
    for (const c of COSMETICS.filter(c => c.added)) expect(COS_STRINGS.en.names[c.id], c.id).toBeTruthy();
    for (const lang of ['lv', 'ru', 'uk']) expect(Object.keys(COS_STRINGS[lang]!.names).sort()).toEqual(Object.keys(COS_STRINGS.en.names).sort());
  });

  it('"Featured today" is deterministic and varied', () => {
    const a = featuredToday('2026-10-13'), b = featuredToday('2026-10-13');
    expect(a.hero.id).toBe(b.hero.id);
    expect(a.picks.map(c => c.id)).toEqual(b.picks.map(c => c.id));
    expect(new Set(a.picks.map(c => c.kind)).size).toBe(a.picks.length);
    const heroes = new Set(Array.from({ length: 30 }, (_, i) => featuredToday(`2026-11-${String(i + 1).padStart(2, '0')}`).hero.id));
    expect(heroes.size).toBeGreaterThan(5);
  });
});
