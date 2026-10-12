import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { Sheet } from './Sheets';
import { CardFace } from '../components/CardView';
import { sfx } from '../sound';

export function AuthSheet({ onClose, onLegal }: { onClose: () => void; onLegal: (k: 'privacy' | 'terms') => void }) {
  const app = useApp();
  const { t } = app;
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (wait <= 0) return; const tm = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(tm); }, [wait]);
  useEffect(() => { if (step === 'code') setTimeout(() => refs.current[0]?.focus(), 250); }, [step]);
  useEffect(() => { if (app.session && step !== 'done') { setStep('done'); sfx.good(); setTimeout(onClose, 1400); } }, [app.session]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr(t.auth.email + '?'); return; }
    setBusy(true); setErr(null);
    const res = await app.signIn(e);
    setBusy(false);
    if (res) { setErr(res); return; }
    setEmail(e); setStep('code'); setWait(60); setDigits(Array(6).fill(''));
  };

  const verify = async (code: string) => {
    setBusy(true); setErr(null);
    const res = await app.verifyCode(email, code);
    setBusy(false);
    if (res) { setErr(t.auth.wrong); setDigits(Array(6).fill('')); refs.current[0]?.focus(); return; }
  };

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) { // paste
      const arr = clean.slice(0, 6).split('');
      const next = Array(6).fill('').map((_, k) => arr[k] ?? '');
      setDigits(next);
      if (arr.length === 6) verify(arr.join(''));
      else refs.current[arr.length]?.focus();
      return;
    }
    const next = digits.slice(); next[i] = clean; setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every(d => d)) verify(next.join(''));
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 70, height: 92, flexShrink: 0 }}>
          {[{ c: { id: 'JD', r: 'J' as const, s: 'D' as const }, r: -14, x: -8 }, { c: { id: 'QS', r: 'Q' as const, s: 'S' as const }, r: 6, x: 8 }].map(({ c, r, x }, i) => (
            <motion.div key={c.id} className="card" style={{ width: 56, height: 80, left: 4, top: 4, ['--cw' as string]: '56px' }}
              initial={{ rotate: 0, x: 0, opacity: 0 }} animate={{ rotate: r, x, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 220, damping: 16 }}>
              <CardFace card={c} lang={app.lang} />
            </motion.div>
          ))}
        </div>
        <div>
          <h2 className="serif" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.05 }}>{step === 'code' ? t.auth.codeTitle : step === 'done' ? t.auth.welcome : t.auth.title}</h2>
          <p className="mute" style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>{step === 'code' ? t.auth.codeSub(email) : t.auth.sub}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.div key="e" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ul className="benefits">
              {t.auth.benefits.map((b, i) => (
                <motion.li key={b} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
                  <span className="bicon">{['♠', '♥', '♦'][i]}</span>{b}
                </motion.li>
              ))}
            </ul>
            <form onSubmit={e => { e.preventDefault(); send(); }}>
              <label className="label" htmlFor="auth-email">{t.auth.email}</label>
              <input id="auth-email" className="field" type="email" inputMode="email" autoComplete="email" autoFocus
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              <button className="btn acc" type="submit" disabled={busy} style={{ width: '100%', marginTop: 12 }}>
                {busy ? <span className="spinner" /> : t.auth.cont}
              </button>
            </form>
            <p className="mute" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>{t.auth.hint}</p>
            <p className="mute legalnote">{t.legal.agree[0]} <button type="button" onClick={() => onLegal('terms')}>{t.legal.agree[1]}</button> {t.legal.agree[2]} <button type="button" onClick={() => onLegal('privacy')}>{t.legal.agree[3]}</button>.</p>
          </motion.div>
        )}
        {step === 'code' && (
          <motion.div key="c" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <motion.div className="otp" animate={err ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
              {digits.map((d, i) => (
                <input key={i} ref={el => { refs.current[i] = el; }} className={`otpbox ${d ? 'filled' : ''}`} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={i === 0 ? 6 : 1} value={d} aria-label={`${i + 1}`}
                  onChange={e => setDigit(i, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }} />
              ))}
            </motion.div>
            <button className="btn acc" disabled={busy || digits.some(d => !d)} style={{ width: '100%', marginTop: 16 }} onClick={() => verify(digits.join(''))}>
              {busy ? <span className="spinner" /> : t.auth.verify}
            </button>
            <p className="mute" style={{ fontSize: 12.5, marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>{t.auth.orLink}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13.5 }}>
              <button className="navlink" onClick={() => { setStep('email'); setErr(null); }}>{t.auth.change}</button>
              <button className="navlink" disabled={wait > 0 || busy} style={{ opacity: wait > 0 ? 0.5 : 1 }} onClick={send}>{wait > 0 ? t.auth.resendIn(wait) : t.auth.resend}</button>
            </div>
          </motion.div>
        )}
        {step === 'done' && (
          <motion.div key="d" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '24px 0', fontSize: 54, color: 'var(--acc-hi)' }}>✓</motion.div>
        )}
      </AnimatePresence>
      {err && step !== 'done' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#ff8a9a', fontSize: 13.5, marginTop: 10, textAlign: 'center' }}>{err}</motion.div>}
    </Sheet>
  );
}
