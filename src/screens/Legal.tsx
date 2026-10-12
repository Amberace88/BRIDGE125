import { motion } from 'motion/react';
import { useApp } from '../store';
import { CONTACT_EMAIL, LEGAL, LEGAL_UPDATED } from '../i18n3';

export type LegalKind = 'privacy' | 'terms';

export function Legal({ kind, onClose, onSwitch }: { kind: LegalKind; onClose: () => void; onSwitch: (k: LegalKind) => void }) {
  const { t, lang } = useApp();
  const doc = LEGAL[kind][lang];
  const date = new Date(LEGAL_UPDATED + 'T12:00:00Z').toLocaleDateString(lang === 'uk' ? 'uk-UA' : lang, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <motion.div className="guide" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      <div className="guidehead">
        <button className="iconbtn" onClick={onClose} aria-label={t.close}>‹</button>
        <div className="gtabs" role="tablist">
          {(['privacy', 'terms'] as const).map(k => (
            <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => onSwitch(k)}>
              {kind === k && <motion.span layoutId="ltab" className="gtabpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span>{t.legal[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="guidebody">
        <motion.article key={kind + lang} className="gwrap legal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <header className="gintro">
            <h1 className="serif">{doc.title}</h1>
            <p>{doc.intro}</p>
            <div className="legaldate">{t.legal.updated}: {date}</div>
          </header>
          {doc.sections.map((s, i) => (
            <section key={i} className="legalsec">
              <h2><span>{String(i + 1).padStart(2, '0')}</span>{s.h}</h2>
              {s.p.map((p, k) => <p key={k}>{p}</p>)}
            </section>
          ))}
          <section className="legalsec contact">
            <h2><span>✉</span>{t.legal.contact}</h2>
            <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </section>
        </motion.article>
      </div>
    </motion.div>
  );
}
