import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Badge, Mini, ScoreLine } from '../screens/Guide';
import { useApp } from '../store';
import { rankLabel } from '../i18n';
import type { Rank } from '../engine/engine';
import { useStrings } from '../i18n/pick';
import { HOME } from '../i18n/home';

const rise = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { delay: (i % 4) * 0.06, type: 'spring' as const, stiffness: 170, damping: 22 },
});

function Fan({ ids, w, step = 7, delay = 0 }: { ids: string[]; w: number; step?: number; delay?: number }) {
  return (
    <div className="rp-fan">
      {ids.map((id, k) => <Mini key={id} id={id} w={w} rot={(k - (ids.length - 1) / 2) * step} delay={delay + k * 0.06} />)}
    </div>
  );
}

const Back = ({ w = 40 }: { w?: number }) => <span className="rp-back" style={{ width: w, height: w * 1.43 }} aria-hidden />;

/** The whole rule set on one page, in the visual language of the guide. */
export function RulesPanel({ onGuide, onPractice }: { onGuide: () => void; onPractice: () => void }) {
  const { t, lang } = useApp();
  const L = (x: Rank) => rankLabel(x, lang);
  const r = useStrings(HOME).rules;
  const sp = r.special;

  const specials: { key: keyof typeof sp; ids: string[]; tone: 'acc' | 'bad' | 'info' }[] = [
    { key: 'A', ids: ['AH'], tone: 'info' },
    { key: '6', ids: ['6D'], tone: 'info' },
    { key: '7', ids: ['7C'], tone: 'bad' },
    { key: '8', ids: ['8H'], tone: 'bad' },
    { key: '9', ids: ['9S'], tone: 'acc' },
    { key: 'J', ids: ['JD'], tone: 'acc' },
    { key: 'QS', ids: ['QS'], tone: 'bad' },
    { key: 'K', ids: ['KS', 'KH', 'KC', 'KD'], tone: 'acc' },
  ];

  const points: { ids: string[]; v: number; label: string; note?: string }[] = [
    { ids: ['AS'], v: 15, label: L('A') },
    { ids: ['KH', 'QD', 'JC', '10S'], v: 10, label: (['K', 'Q', 'J', '10'] as Rank[]).map(L).join(' · ') },
    { ids: ['6S'], v: 5, label: '6♠' },
    { ids: ['9H', '8D', '7C', '6H'], v: 0, label: '9 · 8 · 7 · 6', note: r.except6S },
  ];

  const example = [{ id: 'AH', v: 15 }, { id: 'KC', v: 10 }, { id: '6S', v: 5 }, { id: '9D', v: 0 }];

  return (
    <section id="rules" className="rp" aria-labelledby="rp-title">
      <motion.header className="rp-head" {...rise()}>
        <span className="rp-kicker">{r.kicker}</span>
        <h2 id="rp-title" className="serif">{r.title}</h2>
        <p>{r.sub}</p>
        <span className="rp-deal"><i aria-hidden>♠</i>{r.deal}</span>
      </motion.header>

      {/* basics */}
      <div className="rp-basics">
        <Block n={1} h={r.basics[0].h} p={r.basics[0].p} i={0}>
          <div className="rp-illus">
            <Mini id="9H" w={44} />
            <span className="garrow" aria-hidden>→</span>
            <div className="rp-row"><Mini id="9C" w={40} mark="ok" rot={-5} delay={0.1} /><Mini id="KH" w={40} mark="ok" delay={0.16} /><Mini id="QC" w={40} mark="no" dim rot={5} delay={0.22} /></div>
          </div>
        </Block>
        <Block n={2} h={r.basics[1].h} p={r.basics[1].p} i={1}>
          <div className="rp-illus">
            <div className="rp-deck"><Back /><Back /><Back /></div>
            <span className="garrow" aria-hidden>→</span>
            <Badge tone="info" delay={0.2}>+1</Badge>
            <span className="rp-or">/</span>
            <Badge tone="info" delay={0.3}>{t.pass}</Badge>
          </div>
        </Block>
        <Block n={3} h={r.basics[2].h} p={r.basics[2].p} i={2}>
          <div className="rp-illus">
            <Fan ids={['10S', '10D', '10C']} w={40} />
            <span className="garrow" aria-hidden>→</span>
            <Badge delay={0.3}>0 ✓</Badge>
          </div>
        </Block>
      </div>

      {/* special cards */}
      <h3 className="rp-h serif">{r.specialTitle}</h3>
      <div className="rp-specials">
        {specials.map((s, i) => (
          <motion.article key={s.key} className={`rp-spec ${s.key === 'QS' ? 'hot' : ''}`} {...rise(i)}>
            <div className="rp-speccards">
              {s.ids.length > 1 ? <Fan ids={s.ids} w={34} step={9} /> : <Mini id={s.ids[0]} w={48} rot={-4} />}
            </div>
            <div className="rp-spectext">
              <div className="rp-spechead"><h4>{sp[s.key].h}</h4><Badge tone={s.tone} delay={0.15}>{sp[s.key].tag}</Badge></div>
              <p>{sp[s.key].p}</p>
            </div>
          </motion.article>
        ))}
      </div>

      {/* combos + jacks */}
      <h3 className="rp-h serif">{r.combosTitle}</h3>
      <div className="rp-combos">
        {[{ ids: ['QS', '6S'], badge: '+6' }, { ids: ['8H', '8C', '8S'], badge: '+6' }].map((c, i) => (
          <motion.article key={i} className="rp-combo" {...rise(i)}>
            <div className="rp-illus">
              <Fan ids={c.ids} w={42} />
              <span className="garrow" aria-hidden>→</span>
              <Badge tone="bad" delay={0.35}>{c.badge}</Badge>
            </div>
            <h4>{r.combos[i].h}</h4>
            <p>{r.combos[i].p}</p>
          </motion.article>
        ))}
        <motion.article className="rp-combo rp-jacks" {...rise(2)}>
          <div className="rp-ladder">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="rp-rung">
                <Fan ids={['JS', 'JH', 'JC', 'JD'].slice(0, n)} w={30} step={10} delay={n * 0.05} />
                <Badge tone="acc" delay={0.2 + n * 0.08}>×{n + 1}</Badge>
              </div>
            ))}
          </div>
          <h4>{r.jacksTitle}</h4>
          <p>{r.jacksP}</p>
        </motion.article>
      </div>

      {/* points — crystal clear */}
      <div className="rp-pointsWrap">
        <motion.div className="rp-pointsHead" {...rise()}>
          <h3 className="rp-h serif" style={{ margin: 0 }}>{r.pointsTitle}</h3>
          <p>{r.pointsSub}</p>
        </motion.div>
        <div className="rp-points">
          {points.map((g, i) => (
            <motion.div key={i} className={`rp-pt ${g.v ? '' : 'zero'}`} {...rise(i)}>
              <Fan ids={g.ids} w={g.ids.length > 1 ? 36 : 44} step={g.ids.length > 1 ? 8 : 0} />
              <b className="serif">{g.v}</b>
              <span className="lab">{g.label}</span>
              {g.note && <span className="note">{g.note}</span>}
            </motion.div>
          ))}
        </div>
        <motion.div className="rp-example" {...rise()}>
          <span className="rp-extitle">{r.exampleTitle}</span>
          <div className="rp-eq">
            <span className="rp-eqlabel">{r.exampleLeft}</span>
            <div className="rp-eqcards">
              {example.map((x, i) => (
                <span key={x.id} className="rp-eqcard">
                  <Mini id={x.id} w={34} delay={i * 0.05} />
                  <b>{x.v}</b>
                  {i < example.length - 1 && <em aria-hidden>+</em>}
                </span>
              ))}
              <span className="rp-eqsum">= <b>30</b></span>
            </div>
          </div>
          <div className="rp-eq">
            <span className="rp-eqlabel">{r.exampleJacks}</span>
            <div className="rp-eqcards">
              <span className="rp-eqsum">30 × <Badge tone="acc">3</Badge> = <b className="big">90</b></span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* score */}
      <h3 className="rp-h serif">{r.scoreTitle}</h3>
      <motion.div className="rp-score" {...rise()}>
        <ScoreLine />
        <div className="rp-facts">
          <span className="f burn"><i />{r.facts.burn}</span>
          <span className="f end"><i />{r.facts.end}</span>
          <span className="f low"><i />{r.facts.low}</span>
          <span className="f kings"><i />{r.facts.kings}</span>
        </div>
      </motion.div>

      {/* bluff */}
      <motion.div className="rp-bluff" {...rise()}>
        <div className="rp-bluffcards" aria-hidden>
          <Back w={40} />
          <Mini id="7H" w={40} rot={8} />
        </div>
        <div>
          <h4>{r.bluffTitle}</h4>
          <p>{r.bluffP}</p>
          <small>{r.bluffOff}</small>
        </div>
      </motion.div>

      <div className="rp-cta">
        <button className="btn ghost" onClick={onGuide}>{r.guide} <span aria-hidden>→</span></button>
        <button className="btn acc" onClick={onPractice}><span className="suitspin">♠</span>{r.practice}</button>
      </div>
    </section>
  );
}

function Block({ n, h, p, i, children }: { n: number; h: string; p: string; i: number; children: ReactNode }) {
  return (
    <motion.article className="rp-block" {...rise(i)}>
      <div className="rp-blockhead"><span className="stepnum serif">{n}</span><h4>{h}</h4></div>
      <p>{p}</p>
      {children}
    </motion.article>
  );
}
