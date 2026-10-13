import { motion } from 'motion/react';
import { Fragment, type ReactNode } from 'react';
import { useApp } from '../store';
import { CONTACT_EMAIL } from '../i18n3';
import { intlLocale } from '../i18n';
import { BINDING_NOTE, LEGAL_VERSION, OWNER, legalText, type LegalKind } from '../legal/docs';
import '../legal/legal.css';

export type { LegalKind };

/** Owner placeholders like [COMPANY NAME] stay visibly highlighted until they are filled in (src/legal/docs.ts). */
function rich(text: string): ReactNode {
  const parts = text.split(/(\[[A-Z][A-Z .,'’-]*\])/);
  return parts.length === 1 ? text : parts.map((x, i) => (i % 2 ? <mark key={i} className="ph">{x}</mark> : <Fragment key={i}>{x}</Fragment>));
}

/** "name — what it is" list items: the name in bold. */
function item(text: string): ReactNode {
  const i = text.indexOf(' — ');
  return i > 0 && i < 60 ? <><b>{rich(text.slice(0, i))}</b> — {rich(text.slice(i + 3))}</> : rich(text);
}

export function Legal({ kind, onClose, onSwitch }: { kind: LegalKind; onClose: () => void; onSwitch: (k: LegalKind) => void }) {
  const { t, lang } = useApp();
  const doc = legalText(kind, lang);
  const note = BINDING_NOTE[lang];
  const date = new Date(LEGAL_VERSION + 'T12:00:00Z').toLocaleDateString(intlLocale(lang), { year: 'numeric', month: 'long', day: 'numeric' });

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
        <motion.article key={kind + lang} className="gwrap legal" lang={lang === 'lv' ? 'lv' : 'en'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <header className="gintro">
            {note && <p className="legalbind" lang={lang}>{note}</p>}
            <h1 className="serif">{doc.title}</h1>
            <p>{rich(doc.intro)}</p>
            <div className="legaldate">{t.legal.updated}: {date}</div>
          </header>
          {doc.sections.map((s, i) => (
            <section key={i} className="legalsec">
              <h2><span>{String(i + 1).padStart(2, '0')}</span>{s.h}</h2>
              {s.p.map((p, k) => <p key={k}>{rich(p)}</p>)}
              {s.list && <ul>{s.list.map((x, k) => <li key={k}>{item(x)}</li>)}</ul>}
              {s.after?.map((p, k) => <p key={'a' + k}>{rich(p)}</p>)}
            </section>
          ))}
          <section className="legalsec contact">
            <h2><span>✉</span>{t.legal.contact}</h2>
            <p>{rich(`${OWNER.company} · ${OWNER.address}`)}</p>
            <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </section>
        </motion.article>
      </div>
    </motion.div>
  );
}
