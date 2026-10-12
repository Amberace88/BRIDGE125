import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../i18n';
import { RANKS, SUITS, apply, newGame, nextRound, type Card, type GameState } from '../engine/engine';
import { botAction } from '../engine/bot';
import { VOICE_PHRASES, VOICE_UI, YOU, cardsPhrase, joinNames, slav, who } from '../i18n/voice';
import { coachTip, narrateEvents, newMemo, samplePhrase, type Line } from './narrate';
import { SpeechQueue, pickVoice, resolveSpeakLang, scoreVoice, type Backend, type VoiceLike } from './speech';

const BAD = /undefined|NaN|\[object|\$\{|^\s*$/;
const NUL = /\bnull\b/;   // (not for German, where "null" is the word for zero)
const ALL = LANGS.map(l => l.id);
const c = (r: Card['r'], s: Card['s']): Card => ({ id: r + s, r, s });

/** Every phrase function called with plausible arguments. */
function allPhrases(lang: Lang): string[] {
  const P = VOICE_PHRASES[lang];
  const W = [YOU, who('Marina')];
  const out: string[] = [];
  for (const s of SUITS) for (const r of RANKS) out.push(P.card(c(r, s)));
  for (const r of RANKS) for (const n of [2, 3, 4]) out.push(P.set(r, n));
  for (const w of W) {
    out.push(P.queen(w), P.transfer(w), P.skip(w), P.reset(w), P.draws(w), P.lastCard(w), P.bluffCaught(w), P.bluffWrong(w), P.wentOut(w), P.win(w));
    for (const n of [1, 2, 3, 4, 5, 6, 8, 11, 12, 16, 21, 25]) out.push(P.eight(w, n, false), P.eight(w, n, true), P.seven(w, n));
  }
  for (const s of SUITS) { out.push(P.called(s)); for (const r of [...RANKS, null]) out.push(P.turn(s, r)); }
  for (const n of [1, 2, 3, 4, 5, 10, 11, 12, 14, 21, 22, 25, 101, 111, 112, 125]) out.push(P.add(n));
  for (const n of [2, 3, 4, 5]) out.push(P.mult(n));
  for (const n of [1, 2, 4, 5, 6, 8, 12]) out.push(P.answer8(n), P.take7(n));
  out.push(P.kings, P.reshuffle, P.noMatch, P.playOrPass, P.passNow, P.cover, P.answerQ, P.takeQ6, P.chooseSuit, P.skipped, P.canBluff, P.tie('Marina and Oleg'));
  out.push(cardsPhrase(lang, [c('Q', 'S'), c('6', 'S')]), joinNames(lang, ['A', 'B', 'C']), samplePhrase(lang, 'Marina'));
  return out;
}

describe('voice phrases — all 17 languages', () => {
  it('covers every UI language', () => {
    expect(Object.keys(VOICE_PHRASES).sort()).toEqual([...ALL].sort());
    for (const l of ALL) expect(VOICE_UI[l], l).toBeTruthy();
  });

  for (const lang of ALL) {
    it(`${lang}: every phrase is a clean, non-empty sentence`, () => {
      for (const p of allPhrases(lang)) {
        expect(typeof p, lang).toBe('string');
        expect(p, `${lang}: "${p}"`).not.toMatch(BAD);
        if (lang !== 'de') expect(p, `${lang}: "${p}"`).not.toMatch(NUL);
        expect(p.length, `${lang}: "${p}"`).toBeLessThan(140);
        expect(p, `${lang}: double space in "${p}"`).not.toMatch(/ {2}/);
      }
      const ui = VOICE_UI[lang]!;
      for (const [k, v] of Object.entries(ui)) {
        const s = typeof v === 'function' ? (v as (x: string) => string)('English') : v;
        expect(s, `${lang}.${k}`).not.toMatch(BAD);
      }
    });

    it(`${lang}: sample phrases`, () => {
      const P = VOICE_PHRASES[lang];
      expect({
        sixClubs: P.card(c('6', 'C')),
        queenSpades: P.card(c('Q', 'S')),
        twoKings: P.set('K', 2),
        twoQueens: P.set('Q', 2),
        threeSixes: P.set('6', 3),
        queenHit: P.queen(who('Marina')),
        queenYou: P.queen(YOU),
        transfer: P.transfer(who('Oleg')),
        chain: P.eight(who('Oleg'), 4, true),
        seven: P.seven(who('Marina'), 1),
        ace: P.skip(who('Marina')),
        called: P.called('H'),
        kings: P.kings,
        reset: P.reset(YOU),
        turn: P.turn('H', '7'),
        answer8: P.answer8(2),
        add12: P.add(12),
        add21: P.add(21),
        win: P.win(who('Marina')),
      }).toMatchSnapshot();
    });
  }
});

describe('numeral agreement', () => {
  it('slavic one/few/many', () => {
    expect([1, 2, 5, 11, 12, 21, 22, 25, 111, 112].map(n => slav(n, 'a', 'b', 'c')).join('')).toBe('abccc abc cc'.replace(/ /g, ''));
  });
  it('Russian', () => {
    const P = VOICE_PHRASES.ru;
    expect(P.set('K', 2)).toBe('Два короля');
    expect(P.set('Q', 2)).toBe('Две дамы');
    expect(P.set('6', 4)).toBe('Четыре шестёрки');
    expect(P.card(c('A', 'H'))).toBe('Туз червей');
    expect(P.seven(who('Марина'), 1)).toBe('Марина берёт одну карту');
    expect(P.eight(YOU, 2, false)).toBe('Вы берёте две карты и пропускаете ход');
    expect(P.eight(who('Олег'), 6, true)).toBe('Цепочка! Олег берёт шесть карт');
    expect(P.add(1)).toBe('Вам начислено 1 очко');
    expect(P.add(3)).toBe('Вам начислено 3 очка');
    expect(P.add(12)).toBe('Вам начислено 12 очков');
    expect(P.add(21)).toBe('Вам начислено 21 очко');
  });
  it('Ukrainian / Belarusian', () => {
    expect(VOICE_PHRASES.uk.set('K', 2)).toBe('Два королі');
    expect(VOICE_PHRASES.uk.set('Q', 3)).toBe('Три дами');
    expect(VOICE_PHRASES.uk.add(14)).toBe('Вам нараховано 14 очок');
    expect(VOICE_PHRASES.be.set('Q', 2)).toBe('Дзве дамы');
  });
  it('Latvian', () => {
    const P = VOICE_PHRASES.lv;
    expect(P.card(c('6', 'C'))).toBe('Kreiča sešinieks');
    expect(P.card(c('Q', 'S'))).toBe('Pīķa dāma');
    expect(P.set('K', 2)).toBe('Divi kungi');
    expect(P.set('Q', 2)).toBe('Divas dāmas');
    expect(P.seven(who('Marina'), 1)).toBe('Marina velk vienu kārti');
    expect(P.add(21)).toBe('Tev pieskaitīts 21 punkts');
    expect(P.add(11)).toBe('Tev pieskaitīti 11 punkti');
  });
  it('Lithuanian', () => {
    const P = VOICE_PHRASES.lt;
    expect(P.set('Q', 2)).toBe('Dvi damos');
    expect(P.set('K', 3)).toBe('Trys karaliai');
    expect(P.seven(YOU, 1)).toBe('Tu imi vieną kortą');
    expect(P.eight(YOU, 10, true)).toBe('Grandinė! Tu imi dešimt kortų');
    expect(P.add(21)).toBe('Gauni 21 tašką');
    expect(P.add(15)).toBe('Gauni 15 taškų');
    expect(P.add(3)).toBe('Gauni 3 taškus');
  });
  it('Polish', () => {
    const P = VOICE_PHRASES.pl;
    expect(P.set('Q', 2)).toBe('Dwie damy');
    expect(P.seven(YOU, 1)).toBe('Bierzesz jedną kartę');
    expect(P.eight(who('Ola'), 4, true)).toBe('Łańcuch! Ola bierze cztery karty');
    expect(P.add(12)).toBe('Dostajesz 12 punktów');
    expect(P.add(22)).toBe('Dostajesz 22 punkty');
  });
  it('Romanian / Spanish / German / Estonian / Bulgarian', () => {
    expect(VOICE_PHRASES.ro.add(20)).toBe('Primești 20 de puncte');
    expect(VOICE_PHRASES.ro.add(19)).toBe('Primești 19 puncte');
    expect(VOICE_PHRASES.ro.set('Q', 2)).toBe('Două dame');
    expect(VOICE_PHRASES.es.turn('H', 'J')).toBe('Tu turno: corazones o una jota');
    expect(VOICE_PHRASES.de.card(c('Q', 'S'))).toBe('Pik-Dame');
    expect(VOICE_PHRASES.et.take7(1)).toBe('Võta üks kaart ja jätka');
    expect(VOICE_PHRASES.et.seven(YOU, 1)).toBe('Sa võtad ühe kaardi');
    expect(VOICE_PHRASES.bg.set('K', 2)).toBe('Два попа');
    expect(VOICE_PHRASES.bg.set('A', 2)).toBe('Две аса');
  });
  it('Georgian attributive numerals', () => {
    expect(VOICE_PHRASES.ka.seven(who('ნინო'), 5)).toBe('ნინო იღებს ხუთ კარტს');
    expect(VOICE_PHRASES.ka.answer8(5)).toBe('აიღეთ ხუთი კარტი ან უპასუხეთ რვიანით');
  });
});

/* ------------------------------------------------------------------ narration over real games */
function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

function* play(seed: number, players = 3, bluff = false): Generator<GameState> {
  const r = rng(seed);
  let g = newGame(Array.from({ length: players }, (_, i) => ({ name: ['Anna', 'Marina', 'Oleg', 'Artem'][i], bot: true })), r, { bluff });
  for (let step = 0; step < 1500 && g.phase !== 'gameOver'; step++) {
    if (g.phase === 'roundOver') { g = nextRound(g, r); yield g; continue; }
    const a = botAction(g, g.current, 'normal');
    let n = apply(g, g.current, a, r);
    if (n === g) n = apply(g, g.current, { type: 'draw' }, r);
    if (n === g) n = apply(g, g.current, { type: 'pass' }, r);
    if (n === g) break;
    g = n;
    yield g;
  }
}

describe('narration', () => {
  it('speaks every kind of event in every language without placeholders', () => {
    for (const lang of ALL) {
      const memo = newMemo();
      const seen = new Set<string>();
      for (const seed of [1, 2]) for (const g of play(seed + lang.length * 7)) {
        const ctx = { me: 0, lang, level: 'tips' as const, name: (i: number) => g.players[i].name };
        const lines = [...narrateEvents(g, ctx)];
        const tip = coachTip(g, ctx, memo);
        if (tip) lines.push(tip);
        for (const l of lines) { expect(l.text, `${lang}: ${l.text}`).not.toMatch(BAD); seen.add(l.kind); }
        for (const e of g.events) seen.add('ev:' + e.t);
      }
      expect(seen.has('move'), lang).toBe(true);
      expect(seen.has('tip'), lang).toBe(true);
      expect(seen.has('big'), lang).toBe(true);
    }
  });

  it('never names a card that is hidden in an opponent hand', () => {
    const P = VOICE_PHRASES.en;
    const names = new Map<string, string>();
    for (const s of SUITS) for (const r of RANKS) names.set(P.card(c(r, s)).toLowerCase(), r + s);
    for (const seed of [3, 4, 5]) {
      const memo = newMemo();
      for (const g of play(seed, 4, seed === 5)) {
        const ctx = { me: 0, lang: 'en' as const, level: 'tips' as const, name: (i: number) => g.players[i].name };
        coachTip(g, ctx, memo);   // tips only name rule cards ("answer with the six of spades"), never a hand
        const lines = narrateEvents(g, ctx);
        const pub = new Set([...g.pile, ...g.players[0].hand].map(x => x.id));
        for (const e of g.events) if (e.t === 'play' || e.t === 'bluffCaught') for (const x of e.cards) pub.add(x.id);
        for (const l of lines) for (const [nm, id] of names) if (l.text.toLowerCase().includes(nm)) expect(pub.has(id), `${l.text} reveals ${id}`).toBe(true);
      }
    }
  });

  it('says nothing when the voice is off, and tips only at the tips level', () => {
    for (const g of play(9)) {
      const name = (i: number) => g.players[i].name;
      expect(narrateEvents(g, { me: 0, lang: 'en', level: 'off', name })).toEqual([]);
      expect(coachTip(g, { me: 0, lang: 'en', level: 'moves', name }, newMemo())).toBeNull();
    }
  });

  it('builds the Q♠ line with its consequence', () => {
    const g = newGame([{ name: 'Me', bot: false }, { name: 'Marina', bot: true }], rng(7));
    g.players[0].hand = [c('Q', 'S'), c('7', 'H')];
    g.pile = [c('9', 'S')]; g.activeSuit = 'S'; g.current = 0;
    const n = apply(g, 0, { type: 'play', cardIds: ['QS'] });
    const lines = narrateEvents(n, { me: 0, lang: 'en', level: 'moves', name: i => n.players[i].name });
    expect(lines[0].text).toBe('Queen of spades! Marina takes five and misses a turn.');
    expect(lines[0].pri).toBe(4);
    const tip = coachTip(apply(n, 1, { type: 'accept' }), { me: 0, lang: 'en', level: 'tips', name: i => n.players[i].name }, newMemo());
    expect(tip?.text).toMatch(/^Your turn — match spades or a queen\.$|^Play|^Nothing|^Still/);
  });

  it('limits the generic "your turn" tip per game', () => {
    const memo = newMemo();
    let generic = 0;
    for (const g of play(11, 2)) {
      const t = coachTip(g, { me: 0, lang: 'en', level: 'tips', name: i => g.players[i].name }, memo);
      if (t?.text.startsWith('Your turn')) generic++;
    }
    expect(generic).toBeLessThanOrEqual(5);
  });
});

/* ------------------------------------------------------------------ queue policy */
class FakeBackend implements Backend {
  spoken: string[] = [];
  cancels = 0;
  done: (() => void) | null = null;
  ok = true;
  speak(text: string, done: () => void) { if (!this.ok) return false; this.spoken.push(text); this.done = done; return true; }
  cancel() { this.cancels++; this.done = null; }
  finish() { const d = this.done; this.done = null; d?.(); }
}
const L = (text: string, pri: number, kind: Line['kind'] = 'move'): Line => ({ text, pri, kind });

describe('speech queue', () => {
  it('speaks one line at a time, in order', () => {
    const be = new FakeBackend(); let t = 0;
    const q = new SpeechQueue(be, () => t);
    q.push([L('a', 2), L('b', 2)]);
    expect(be.spoken).toEqual(['a']);
    t += 500; be.finish();
    expect(be.spoken).toEqual(['a', 'b']);
  });

  it('drops stale lines', () => {
    const be = new FakeBackend(); let t = 0;
    const q = new SpeechQueue(be, () => t);
    q.push([L('a', 2), L('stale', 1, 'low')]);
    t += 5000; be.finish();
    expect(be.spoken).toEqual(['a']);
    expect(q.speaking).toBeNull();
  });

  it('important lines interrupt small talk and clear less important queued lines', () => {
    const be = new FakeBackend(); let t = 0;
    const q = new SpeechQueue(be, () => t);
    q.push([L('six of clubs', 2), L('draws', 1, 'low')]);
    q.push([L('Queen of spades!', 4)]);
    expect(be.cancels).toBe(1);
    expect(be.spoken).toEqual(['six of clubs', 'Queen of spades!']);
    expect(q.pending.length).toBe(0);
  });

  it('a move replaces pending and current tips', () => {
    const be = new FakeBackend(); const t = 0;
    const q = new SpeechQueue(be, () => t);
    q.push([L('Your turn — match hearts', 3, 'tip')]);
    q.push([L('Eight of clubs', 2)]);
    expect(be.cancels).toBe(1);
    expect(be.spoken.at(-1)).toBe('Eight of clubs');
    q.push([L('tip 1', 3, 'tip')]);
    q.push([L('tip 2', 3, 'tip')]);
    expect(q.pending.map(x => x.text)).toEqual(['tip 2']);
  });

  it('never piles up more than three lines', () => {
    const be = new FakeBackend(); const t = 0;
    const q = new SpeechQueue(be, () => t);
    q.push([L('big', 5, 'big')]);
    q.push([L('m1', 2), L('m2', 2), L('m3', 2), L('m4', 2), L('low', 1, 'low')]);
    expect(q.pending.length).toBeLessThanOrEqual(3);
    expect(q.pending.map(x => x.text)).not.toContain('low');
  });

  it('a late callback from a cancelled line does not skip the next one', () => {
    const be = new FakeBackend(); const t = 0;
    const q = new SpeechQueue(be, () => t);
    q.push([L('a', 2)]);
    const stale = be.done!;
    q.push([L('B', 5, 'big')]);
    q.push([L('c', 2)]);
    stale();                         // the cancelled utterance reports "end" late
    expect(q.speaking?.text).toBe('B');
    be.finish();
    expect(q.speaking?.text).toBe('c');
  });

  it('stays silent when the backend cannot speak', () => {
    const be = new FakeBackend(); be.ok = false;
    const q = new SpeechQueue(be, () => 0);
    q.push([L('a', 2)]);
    expect(q.speaking).toBeNull();
    q.clear();
  });
});

describe('voice choice', () => {
  const V = (name: string, lang: string, localService = true): VoiceLike => ({ name, lang, localService });
  it('prefers natural / online voices in the right language and region', () => {
    const vs = [V('Albert', 'en-US'), V('Daniel', 'en-GB'), V('Microsoft Libby Online (Natural) - English (United Kingdom)', 'en-GB', false), V('Google русский', 'ru-RU', false), V('Milena', 'ru-RU')];
    expect(pickVoice(vs, 'en')?.name).toMatch(/Libby/);
    expect(pickVoice(vs, 'ru')?.name).toBe('Google русский');
    expect(pickVoice(vs, 'lv')).toBeNull();
    expect(scoreVoice(V('Albert', 'en-US'), 'en')).toBeLessThan(0);
    expect(pickVoice([V('Mónica', 'es_ES'), V('Paulina', 'es-MX')], 'es')?.name).toBe('Mónica');
  });
  it('falls back to a related language, else silence', () => {
    const vs = [V('Milena', 'ru-RU'), V('Daniel', 'en-GB')];
    expect(resolveSpeakLang(vs, 'kk')).toBe('ru');
    expect(resolveSpeakLang(vs, 'lv')).toBe('en');
    expect(resolveSpeakLang(vs, 'ru')).toBe('ru');
    expect(resolveSpeakLang([V('Anna', 'de-DE')], 'lv')).toBeNull();
    expect(resolveSpeakLang([V('Ioana', 'ro-RO')], 'ro')).toBe('ro');
  });
});
