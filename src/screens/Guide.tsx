import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Card, Rank, Suit } from '../engine/engine';
import { CardFace } from '../components/CardView';
import { useApp } from '../store';

const C = (id: string): Card => ({ id, r: id.slice(0, -1) as Rank, s: id.slice(-1) as Suit });

export function Mini({ id, w = 54, rot = 0, dim = false, mark, delay = 0 }: { id: string; w?: number; rot?: number; dim?: boolean; mark?: 'ok' | 'no'; delay?: number }) {
  const { lang } = useApp();
  return (
    <motion.div className="mini" style={{ width: w, height: w * 1.43, ['--cw' as string]: `${w}px`, opacity: dim ? 0.45 : 1 }}
      initial={{ y: 18, rotate: rot - 8, opacity: 0 }} whileInView={{ y: 0, rotate: rot, opacity: dim ? 0.45 : 1 }}
      viewport={{ once: true, margin: '-40px' }} transition={{ delay, type: 'spring', stiffness: 200, damping: 16 }}>
      <CardFace card={C(id)} lang={lang} />
      {mark && <span className={`mark ${mark}`}>{mark === 'ok' ? '✓' : '✕'}</span>}
    </motion.div>
  );
}

export function Badge({ children, tone = 'acc', delay = 0 }: { children: ReactNode; tone?: 'acc' | 'bad' | 'info'; delay?: number }) {
  return (
    <motion.span className={`gbadge ${tone}`} initial={{ scale: 0.4, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }} transition={{ delay, type: 'spring', stiffness: 320, damping: 14 }}>{children}</motion.span>
  );
}

const Arrow = () => <span className="garrow" aria-hidden>→</span>;

export function Guide({ onClose, onPractice }: { onClose: () => void; onPractice: () => void }) {
  const { t } = useApp();
  const g = t.guide;
  const ids = ['basics', 'special', 'combos', 'scoring'] as const;
  const [active, setActive] = useState<(typeof ids)[number]>('basics');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scroller.current; if (!root) return;
    const io = new IntersectionObserver(es => {
      const vis = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id.replace('g-', '') as (typeof ids)[number]);
    }, { root, rootMargin: '-30% 0px -60% 0px' });
    ids.forEach(i => { const el = root.querySelector('#g-' + i); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id: string) => scroller.current?.querySelector('#g-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const r = t.rules;

  const specials: { cards: string[]; tag: string; rule: number; tone: 'acc' | 'bad' | 'info' }[] = [
    { cards: ['AH'], tag: g.tags.A, rule: 2, tone: 'info' },
    { cards: ['6D'], tag: g.tags['6'], rule: 3, tone: 'info' },
    { cards: ['7C'], tag: g.tags['7'], rule: 4, tone: 'bad' },
    { cards: ['8H'], tag: g.tags['8'], rule: 5, tone: 'bad' },
    { cards: ['9S'], tag: g.tags['9'], rule: 6, tone: 'acc' },
    { cards: ['JD'], tag: g.tags.J, rule: 7, tone: 'acc' },
    { cards: ['QS'], tag: g.tags.QS, rule: 8, tone: 'bad' },
    { cards: ['KS', 'KH', 'KC', 'KD'], tag: g.tags.K, rule: 9, tone: 'acc' },
  ];

  return (
    <motion.div className="guide" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      <div className="guidehead">
        <button className="iconbtn" onClick={onClose} aria-label={t.close}>‹</button>
        <div className="gtabs" role="tablist">
          {ids.map(id => (
            <button key={id} role="tab" aria-selected={active === id} className={active === id ? 'on' : ''} onClick={() => go(id)}>
              {active === id && <motion.span layoutId="gtab" className="gtabpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span>{g.tabs[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="guidebody" ref={scroller}>
        <div className="gwrap">
          <header className="gintro">
            <h1 className="serif">{g.title}</h1>
            <p>{g.intro}</p>
            <ScoreLine />
          </header>

          {/* BASICS */}
          <section id="g-basics" className="gsec">
            <h2 className="serif">{g.tabs.basics}</h2>
            <div className="steps">
              <Step n={1} h={g.steps[0].h} p={g.steps[0].p}>
                <div className="illus">
                  <div className="col"><Mini id="9H" w={58} /></div>
                  <Arrow />
                  <div className="row">
                    <Mini id="9C" mark="ok" delay={0.1} rot={-6} />
                    <Mini id="KH" mark="ok" delay={0.18} />
                    <Mini id="QC" mark="no" dim delay={0.26} rot={6} />
                  </div>
                </div>
              </Step>
              <Step n={2} h={g.steps[1].h} p={g.steps[1].p}>
                <div className="illus">
                  <div className="row tight"><Mini id="10S" rot={-8} /><Mini id="10D" rot={0} delay={0.08} /><Mini id="10C" rot={8} delay={0.16} /></div>
                  <Arrow />
                  <Badge delay={0.3}>0 ✓</Badge>
                </div>
              </Step>
              <Step n={3} h={g.steps[2].h} p={g.steps[2].p}>
                <div className="illus scores">
                  {[{ n: t.you, v: 38, c: 'ok' }, { n: t.botNames[1], v: 61, c: '' }, { n: t.botNames[0], v: 147, c: 'bad' }].map((s, i) => (
                    <motion.div key={s.n} className={`scorechip ${s.c}`} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                      <span>{s.n}</span><b>{s.v}</b>
                    </motion.div>
                  ))}
                </div>
              </Step>
            </div>
            <p className="gnote">{r[1].p}</p>
          </section>

          {/* SPECIAL CARDS */}
          <section id="g-special" className="gsec">
            <h2 className="serif">{g.tabs.special}</h2>
            <div className="specials">
              {specials.map((s, i) => (
                <motion.article key={s.tag} className="spec" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ delay: (i % 2) * 0.06 }}>
                  <div className="speccards">
                    {s.cards.map((id, k) => <Mini key={id} id={id} w={s.cards.length > 1 ? 40 : 56} rot={s.cards.length > 1 ? (k - 1.5) * 8 : -4} delay={k * 0.06} />)}
                  </div>
                  <div className="spectext">
                    <div className="spechead"><h3>{r[s.rule].h}</h3><Badge tone={s.tone}>{s.tag}</Badge></div>
                    <p>{r[s.rule].p}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          {/* COMBOS */}
          <section id="g-combos" className="gsec">
            <h2 className="serif">{g.tabs.combos}</h2>
            {[
              { cards: ['QS', '6S'], badge: '+6', tone: 'bad' as const },
              { cards: ['8H', '8C', '8S'], badge: '+6', tone: 'bad' as const },
              { cards: ['JS', 'JH', 'JC', 'JD'], badge: '×5', tone: 'acc' as const },
            ].map((cmb, i) => (
              <motion.article key={i} className="combo" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <div className="comboillus">
                  <div className="row tight">{cmb.cards.map((id, k) => <Mini key={id} id={id} w={50} rot={(k - (cmb.cards.length - 1) / 2) * 7} delay={k * 0.12} />)}</div>
                  <Arrow />
                  <Badge tone={cmb.tone} delay={0.5}>{cmb.badge}</Badge>
                </div>
                <div><h3>{g.combos[i].h}</h3><p>{g.combos[i].p}</p></div>
              </motion.article>
            ))}
          </section>

          {/* SCORING */}
          <section id="g-scoring" className="gsec">
            <h2 className="serif">{g.tabs.scoring}</h2>
            <p className="gnote" style={{ marginTop: 0 }}>{g.pointsTitle}</p>
            <div className="points">
              {[{ id: 'AS', p: 15 }, { id: 'KH', p: 10 }, { id: 'QD', p: 10 }, { id: 'JC', p: 10 }, { id: '10S', p: 10 }, { id: '6S', p: 5 }, { id: '9H', p: 0 }, { id: '8D', p: 0 }, { id: '7C', p: 0 }, { id: '6H', p: 0 }].map((x, i) => (
                <div key={x.id} className="pt"><Mini id={x.id} w={46} delay={i * 0.03} /><b className={x.p ? '' : 'zero'}>{x.p}</b></div>
              ))}
            </div>
            <ScoreLine />
          </section>

          <div className="gcta">
            <button className="btn acc big" onClick={onPractice}>♠ {g.cta}</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Step({ n, h, p, children }: { n: number; h: string; p: string; children: ReactNode }) {
  return (
    <motion.article className="step" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}>
      <div className="stepnum serif">{n}</div>
      <div className="stepbody">
        <h3>{h}</h3>
        <p>{p}</p>
        {children}
      </div>
    </motion.article>
  );
}

export function ScoreLine() {
  const { t } = useApp();
  const l = t.guide.line;
  return (
    <div className="scoreline" aria-hidden>
      <div className="nums"><span style={{ left: 0 }}>0</span><span className="n125" style={{ left: `${(125 / 140) * 100}%` }}>125</span><span className="n130" style={{ left: `${(130 / 140) * 100}%` }}>130</span></div>
      <div className="track">
        <motion.div className="fill" initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
        <span className="tick" style={{ left: 0 }} />
        <span className="tick burn" style={{ left: `${(125 / 140) * 100}%` }} />
        <span className="tick end" style={{ left: `${(130 / 140) * 100}%` }} />
      </div>
      <div className="legend">
        <span><i className="lg start" />{l.start}</span>
        <span><i className="lg burn" />{l.burn}</span>
        <span><i className="lg end" />{l.end}</span>
      </div>
    </div>
  );
}
