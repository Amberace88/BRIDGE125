import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp, type AuthErr } from '../store';
import { Sheet } from './Sheets';
import { CardFace } from '../components/CardView';
import { sfx } from '../sound';

export type AuthMode = 'in' | 'up' | 'forgot' | 'newpass' | 'link';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LAST = 'b125.lastEmail';
const lastEmail = () => { try { return localStorage.getItem(LAST) ?? ''; } catch { return ''; } };
const rememberEmail = (e: string) => { try { localStorage.setItem(LAST, e); } catch { /* */ } };

function strength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0;
  let s = 0;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return (s >= 2 ? (s === 3 ? 3 : 2) : 1) as 1 | 2 | 3;
}

function Field({ label, hint, error, children, right }: { label: string; hint?: string; error?: string | null; children: ReactNode; right?: ReactNode }) {
  return (
    <div className={`afield ${error ? 'bad' : ''}`}>
      <div className="aflabel"><label>{label}</label>{right}</div>
      {children}
      <AnimatePresence initial={false}>
        {(error || hint) && (
          <motion.div key={error ? 'e' : 'h'} className={error ? 'aferr' : 'afhint'} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {error || hint}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete, id, show, onToggle, labels, autoFocus }: {
  value: string; onChange: (v: string) => void; autoComplete: string; id: string; show: boolean; onToggle: () => void; labels: [string, string]; autoFocus?: boolean;
}) {
  return (
    <div className="pwwrap">
      <input id={id} className="field" type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)} spellCheck={false} autoCapitalize="none" />
      <button type="button" className="pweye" onClick={onToggle} aria-label={show ? labels[1] : labels[0]} aria-pressed={show}>
        {show ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.1 6.1C3.9 7.6 2.5 9.8 2 12c1 2.5 5 7 10 7 1.7 0 3.2-.5 4.6-1.2" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}

export function AuthSheet({ onClose, onLegal, initial = 'in' }: { onClose: () => void; onLegal: (k: 'privacy' | 'terms') => void; initial?: AuthMode }) {
  const app = useApp();
  const { t } = app;
  const a = t.acct;
  const [mode, setMode] = useState<AuthMode>(app.recovery ? 'newpass' : initial);
  const [email, setEmail] = useState(lastEmail);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [name, setName] = useState(app.name);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const wasSignedIn = useRef(!!app.session);

  // signed in by any route (password, link, code) → celebrate and close
  useEffect(() => {
    if (app.session && !wasSignedIn.current && !done && mode !== 'newpass') {
      setDone(mode === 'up' ? a.welcomeNew(name.trim() || t.guest) : a.welcomeBack); sfx.good(); setTimeout(onClose, 1500);
    }
  }, [app.session]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (app.recovery) setMode('newpass'); }, [app.recovery]);

  const go = (m: AuthMode) => { setMode(m); setErr(null); setTouched(false); setSent(false); setPw(''); setPw2(''); };
  const msg = (e: AuthErr) => a.err[e];
  const emailBad = !EMAIL_RE.test(email.trim());
  const st = strength(pw);

  const submitIn = async () => {
    setTouched(true);
    if (emailBad) { setErr(a.err.badEmail); return; }
    if (!pw) return;
    setBusy(true); setErr(null);
    const e = email.trim().toLowerCase();
    const r = await app.signInPassword(e, pw);
    setBusy(false);
    if (r) { setErr(msg(r)); sfx.alert(); return; }
    rememberEmail(e);
  };

  const submitUp = async () => {
    setTouched(true);
    if (!name.trim() || emailBad || pw.length < 8) return;
    setBusy(true); setErr(null);
    const e = email.trim().toLowerCase();
    const r = await app.signUpPassword(e, pw, name.trim());
    setBusy(false);
    if (r === 'exists') { rememberEmail(e); go('in'); setErr(a.err.exists); return; }
    if (r) { setErr(msg(r)); return; }
    rememberEmail(e);
  };

  const submitForgot = async () => {
    setTouched(true);
    if (emailBad) { setErr(a.err.badEmail); return; }
    setBusy(true); setErr(null);
    const r = await app.resetPassword(email.trim().toLowerCase());
    setBusy(false);
    if (r) { setErr(msg(r)); return; }
    setSent(true); sfx.tap();
  };

  const submitNew = async () => {
    setTouched(true);
    if (pw.length < 8 || pw !== pw2) return;
    setBusy(true); setErr(null);
    const r = await app.updatePassword(pw);
    setBusy(false);
    if (r) { setErr(msg(r)); return; }
    setDone(a.pwSaved); sfx.good(); app.endRecovery(); setTimeout(onClose, 1600);
  };

  const title = mode === 'up' ? a.titleUp : mode === 'forgot' ? a.forgotTitle : mode === 'newpass' ? a.newTitle : mode === 'link' ? t.auth.title : a.titleIn;
  const sub = mode === 'up' ? a.subUp : mode === 'forgot' ? a.forgotSub : mode === 'newpass' ? a.newSub : mode === 'link' ? t.auth.sub : a.subIn;
  const pwLabels: [string, string] = [a.show, a.hide];

  return (
    <Sheet onClose={() => { if (mode === 'newpass') app.endRecovery(); onClose(); }}>
      <div className="authhead">
        <div className="authcards" aria-hidden>
          {[{ c: { id: 'JD', r: 'J' as const, s: 'D' as const }, r: -14, x: -8 }, { c: { id: 'QS', r: 'Q' as const, s: 'S' as const }, r: 6, x: 8 }].map(({ c, r, x }, i) => (
            <motion.div key={c.id} className="card" style={{ width: 50, height: 72, left: 4, top: 4, ['--cw' as string]: '50px' }}
              initial={{ rotate: 0, x: 0, opacity: 0 }} animate={{ rotate: r, x, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 220, damping: 16 }}>
              <CardFace card={c} lang={app.lang} />
            </motion.div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={done ? 'done' : mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <h2 className="serif">{done ? '✓' : title}</h2>
            <p className="mute">{done ?? sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {done ? (
        <motion.div className="authdone" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <span>✓</span>
        </motion.div>
      ) : (
        <>
          {(mode === 'in' || mode === 'up') && (
            <div className="authtabs" role="tablist">
              {(['in', 'up'] as const).map(m => (
                <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => go(m)}>
                  {mode === m && <motion.span layoutId="authtab" className="authpill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <b>{m === 'in' ? a.tabIn : a.tabUp}</b>
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mode} initial={{ opacity: 0, x: mode === 'up' ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mode === 'up' ? -24 : 24 }} transition={{ duration: 0.2 }}>

              {mode === 'in' && (
                <form className="authform" onSubmit={e => { e.preventDefault(); submitIn(); }} noValidate>
                  <Field label={a.email} error={touched && emailBad ? a.err.badEmail : null}>
                    <input className="field" type="email" inputMode="email" autoComplete="username email" value={email} autoFocus={!email}
                      onChange={e => setEmail(e.target.value)} placeholder="you@example.com" spellCheck={false} autoCapitalize="none" />
                  </Field>
                  <Field label={a.password} right={<button type="button" className="alink" onClick={() => go('forgot')}>{a.forgot}</button>}>
                    <PasswordInput id="pw-in" value={pw} onChange={setPw} autoComplete="current-password" show={show} onToggle={() => setShow(s => !s)} labels={pwLabels} autoFocus={!!email} />
                  </Field>
                  <ErrBox err={err} />
                  <button className="btn acc big" type="submit" disabled={busy || !pw}>{busy ? <span className="spinner" /> : a.signIn}</button>
                  <div className="divider"><span>{a.or}</span></div>
                  <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={() => go('link')}>✉ {a.useLink}</button>
                  <p className="authswitch">{a.noAccount} <button type="button" className="alink" onClick={() => go('up')}>{a.signUp} →</button></p>
                </form>
              )}

              {mode === 'up' && (
                <form className="authform" onSubmit={e => { e.preventDefault(); submitUp(); }} noValidate>
                  <ul className="benefits compact">
                    {t.auth.benefits.map((b, i) => <li key={b}><span className="bicon">{['♠', '♥', '♦'][i]}</span>{b}</li>)}
                  </ul>
                  <Field label={a.name} hint={a.nameHint} error={touched && !name.trim() ? a.namePh : null}>
                    <input className="field" autoComplete="nickname" maxLength={20} value={name} autoFocus onChange={e => setName(e.target.value)} placeholder={a.namePh} />
                  </Field>
                  <Field label={a.email} error={touched && emailBad ? a.err.badEmail : null}>
                    <input className="field" type="email" inputMode="email" autoComplete="email" value={email}
                      onChange={e => setEmail(e.target.value)} placeholder="you@example.com" spellCheck={false} autoCapitalize="none" />
                  </Field>
                  <Field label={a.password} error={touched && pw.length < 8 ? a.err.short : null}>
                    <PasswordInput id="pw-up" value={pw} onChange={setPw} autoComplete="new-password" show={show} onToggle={() => setShow(s => !s)} labels={pwLabels} />
                    <div className={`pwmeter s${st}`} aria-live="polite">
                      <div className="bars">{[1, 2, 3].map(i => <i key={i} className={st >= i ? 'on' : ''} />)}</div>
                      <span>{pw ? a.strength[st] : a.pwHint}</span>
                    </div>
                  </Field>
                  <ErrBox err={err} />
                  <button className="btn acc big" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : a.signUp}</button>
                  <p className="mute legalnote">{t.legal.agree[0]} <button type="button" onClick={() => onLegal('terms')}>{t.legal.agree[1]}</button> {t.legal.agree[2]} <button type="button" onClick={() => onLegal('privacy')}>{t.legal.agree[3]}</button>.</p>
                  <p className="authswitch">{a.haveAccount} <button type="button" className="alink" onClick={() => go('in')}>{a.signIn} →</button></p>
                </form>
              )}

              {mode === 'forgot' && (
                <form className="authform" onSubmit={e => { e.preventDefault(); submitForgot(); }} noValidate>
                  {sent ? (
                    <motion.div className="sentbox" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                      <span className="sentico">✉</span><div>{a.resetSent(email.trim())}</div>
                    </motion.div>
                  ) : (
                    <>
                      <Field label={a.email} error={touched && emailBad ? a.err.badEmail : null}>
                        <input className="field" type="email" inputMode="email" autoComplete="email" value={email} autoFocus
                          onChange={e => setEmail(e.target.value)} placeholder="you@example.com" spellCheck={false} autoCapitalize="none" />
                      </Field>
                      <ErrBox err={err} />
                      <button className="btn acc big" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : a.sendReset}</button>
                    </>
                  )}
                  <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={() => go('in')}>‹ {a.back}</button>
                </form>
              )}

              {mode === 'newpass' && (
                <form className="authform" onSubmit={e => { e.preventDefault(); submitNew(); }} noValidate>
                  <Field label={a.newPw} error={touched && pw.length < 8 ? a.err.short : null}>
                    <PasswordInput id="pw-new" value={pw} onChange={setPw} autoComplete="new-password" show={show} onToggle={() => setShow(s => !s)} labels={pwLabels} autoFocus />
                    <div className={`pwmeter s${st}`}><div className="bars">{[1, 2, 3].map(i => <i key={i} className={st >= i ? 'on' : ''} />)}</div><span>{pw ? a.strength[st] : a.pwHint}</span></div>
                  </Field>
                  <Field label={a.repeatPw} error={touched && pw2 !== pw ? a.mismatch : null}>
                    <PasswordInput id="pw-new2" value={pw2} onChange={setPw2} autoComplete="new-password" show={show} onToggle={() => setShow(s => !s)} labels={pwLabels} />
                  </Field>
                  <ErrBox err={err} />
                  <button className="btn acc big" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : a.savePw}</button>
                </form>
              )}

              {mode === 'link' && <LinkFlow email={email} setEmail={setEmail} onBack={() => go('in')} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </Sheet>
  );
}

function ErrBox({ err }: { err: string | null }) {
  return (
    <AnimatePresence>
      {err && (
        <motion.div className="autherr" role="alert" initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto', x: [0, -6, 6, -3, 3, 0] }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35 }}>
          {err}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Passwordless sign-in: email a one-time code / magic link. */
function LinkFlow({ email, setEmail, onBack }: { email: string; setEmail: (e: string) => void; onBack: () => void }) {
  const app = useApp();
  const { t } = app;
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (wait <= 0) return; const tm = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(tm); }, [wait]);
  useEffect(() => { if (step === 'code') setTimeout(() => refs.current[0]?.focus(), 250); }, [step]);

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr(t.acct.err.badEmail); return; }
    setBusy(true); setErr(null);
    const res = await app.signIn(e);
    setBusy(false);
    if (res) { setErr(t.acct.err.generic); return; }
    rememberEmail(e); setEmail(e); setStep('code'); setWait(60); setDigits(Array(6).fill(''));
  };
  const verify = async (code: string) => {
    setBusy(true); setErr(null);
    const res = await app.verifyCode(email.trim().toLowerCase(), code);
    setBusy(false);
    if (res) { setErr(t.auth.wrong); setDigits(Array(6).fill('')); refs.current[0]?.focus(); }
  };
  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) {
      const arr = clean.slice(0, 6).split('');
      setDigits(Array(6).fill('').map((_, k) => arr[k] ?? ''));
      if (arr.length === 6) verify(arr.join('')); else refs.current[arr.length]?.focus();
      return;
    }
    const next = digits.slice(); next[i] = clean; setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every(d => d)) verify(next.join(''));
  };

  return step === 'email' ? (
    <form className="authform" onSubmit={e => { e.preventDefault(); send(); }} noValidate>
      <Field label={t.acct.email}>
        <input className="field" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" spellCheck={false} autoCapitalize="none" />
      </Field>
      <ErrBox err={err} />
      <button className="btn acc big" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : t.auth.cont}</button>
      <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={onBack}>🔑 {t.acct.usePassword}</button>
    </form>
  ) : (
    <div className="authform">
      <div className="sentbox"><span className="sentico">✉</span><div>{t.auth.codeSub(email)}</div></div>
      <motion.div className="otp" animate={err ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
        {digits.map((d, i) => (
          <input key={i} ref={el => { refs.current[i] = el; }} className={`otpbox ${d ? 'filled' : ''}`} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? 6 : 1} value={d} aria-label={`${i + 1}`} onChange={e => setDigit(i, e.target.value)}
            onKeyDown={e => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }} />
        ))}
      </motion.div>
      <ErrBox err={err} />
      <p className="mute" style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.5 }}>{t.auth.orLink}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
        <button className="alink" onClick={() => { setStep('email'); setErr(null); }}>{t.auth.change}</button>
        <button className="alink" disabled={wait > 0 || busy} style={{ opacity: wait > 0 ? 0.5 : 1 }} onClick={send}>{wait > 0 ? t.auth.resendIn(wait) : t.auth.resend}</button>
      </div>
      <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={onBack}>🔑 {t.acct.usePassword}</button>
    </div>
  );
}
