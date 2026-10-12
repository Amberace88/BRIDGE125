import { motion, useDragControls } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useApp } from '../store';
import { ACCENTS, TABLES } from '../theme';
import { LANGS } from '../i18n';
import { Seg } from './Home';

export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const controls = useDragControls();
  return (
    <>
      <motion.div className="scrim" style={{ position: 'fixed' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet" style={{ position: 'fixed' }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        drag="y" dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose(); }}>
        <div className="grabzone" onPointerDown={e => controls.start(e)}><div className="grab" /></div>
        {children}
      </motion.div>
    </>
  );
}

export function ProfileSheet({ onClose, onAuth }: { onClose: () => void; onAuth: () => void }) {
  const app = useApp();
  const { t } = app;
  const [name, setName] = useState(app.name);
  const [saved, setSaved] = useState(false);
  const locked = !app.canPersonalize;
  const p = app.profile;

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>{(app.name || app.session?.user.email || t.guest).slice(0, 1).toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <h2 className="serif" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{app.name || t.guest}</h2>
          <div className="mute" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.session?.user.email ?? t.signIn}</div>
        </div>
      </div>

      {p && (
        <div className="stats">
          {[{ l: t.auth.stats.games, v: p.games_played }, { l: t.auth.stats.wins, v: p.wins }, { l: t.auth.stats.bm, v: p.bm.toLocaleString('fr-FR') }].map(s => (
            <div key={s.l}><b>{s.v}</b><span>{s.l}</span></div>
          ))}
        </div>
      )}

      {!app.session && app.online && (
        <button className="btn acc" style={{ width: '100%', marginTop: 16 }} onClick={onAuth}>{t.auth.title}</button>
      )}

      <div className="label">{t.language}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {LANGS.map(l => (
          <button key={l.id} className={`btn sm ${app.lang === l.id ? 'acc' : 'ghost'}`} onClick={() => app.saveProfile({ lang: l.id })}>{l.label}</button>
        ))}
      </div>

      <div className="label">{t.sound}</div>
      <Seg value={app.sound ? 'on' : 'off'} options={[{ v: 'on', l: t.on }, { v: 'off', l: t.off }]} onChange={v => app.set({ sound: v === 'on' })} />

      <div className="label">{t.yourName}</div>
      <form style={{ display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); app.saveProfile({ name: name.trim() }); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
        <input className="field" value={name} maxLength={20} onChange={e => setName(e.target.value)} placeholder={t.guest} />
        <button className="btn acc sm" style={{ height: 50, minWidth: 96 }} type="submit">{saved ? '✓' : t.save}</button>
      </form>

      <div className="label" style={{ fontSize: 15, color: 'var(--text)', fontWeight: 700, marginTop: 22 }}>{t.personalize}</div>
      <div className="locked">
        {locked && (
          <div className="lockmask">
            <div>🔒 {t.personalizeLocked}</div>
            {app.online && <button className="btn acc sm" style={{ marginTop: 10 }} onClick={onAuth}>{t.nav.signIn}</button>}
          </div>
        )}
        <div className="label" style={{ marginTop: 4 }}>{t.accent}</div>
        <div className="swatches">
          {ACCENTS.map(a => (
            <motion.button key={a.id} whileTap={{ scale: 0.9 }} aria-label={a.name} className={`swatch ${app.accent === a.id ? 'on' : ''}`}
              style={{ background: `radial-gradient(circle at 35% 30%, ${a.hi}, ${a.base} 55%, ${a.lo})` }}
              onClick={() => !locked && app.saveProfile({ accent: a.id })} />
          ))}
        </div>
        <div className="label">{t.background}</div>
        <div className="tables">
          {TABLES.map(tb => (
            <motion.button key={tb.id} whileTap={{ scale: 0.95 }} className={`tablepick ${app.table === tb.id ? 'on' : ''}`}
              style={{ background: tb.css, backgroundColor: tb.tone }} onClick={() => !locked && app.saveProfile({ table: tb.id })}>{tb.name}</motion.button>
          ))}
        </div>
      </div>

      {app.session && <button className="btn ghost" style={{ width: '100%', marginTop: 22 }} onClick={() => app.signOut()}>{t.signOut}</button>}
      <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onClose}>{t.close}</button>
    </Sheet>
  );
}
