import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { useApp } from '../store';
import { isIosSafari, useInstall } from '../install';
import { Sheet } from './Sheets';
import { sfx } from '../sound';

const SITE = 'https://bridge125.com/?source=qr';

function QR({ text }: { text: string }) {
  const { n, d } = useMemo(() => {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { n, d };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="qr" role="img" aria-label={text} shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} rx="2" fill="#fff" />
      <path d={d} fill="#0B1F1A" />
    </svg>
  );
}

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
);
const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4M12 7v5M9.5 9.5 12 12l2.5-2.5" />
  </svg>
);
const Check = () => <span className="okdot" aria-hidden>✓</span>;

export function InstallSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  const ins = useInstall();
  const [just, setJust] = useState(false);
  const steps = ins.platform === 'ios' ? t.install.ios : ins.platform === 'android' ? t.install.android : t.install.desktop;
  const icons = ins.platform === 'ios' ? [<ShareIcon key="a" />, <PlusIcon key="b" />, <Check key="c" />]
    : ins.platform === 'android' ? [<MenuIcon key="a" />, <PlusIcon key="b" />, <Check key="c" />]
    : [<MonitorIcon key="a" />, <MenuIcon key="b" />, <Check key="c" />];

  const install = async () => {
    const ok = await ins.prompt();
    if (ok) { setJust(true); sfx.good(); }
  };

  return (
    <Sheet onClose={onClose}>
      <div className="insthead">
        <motion.img src="/icon-192.png" alt="" width={76} height={76} className="insticon"
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} />
        <div>
          <h2 className="serif">{t.install.title}</h2>
          <div className="mute instfree">{t.install.free}</div>
        </div>
      </div>
      <p className="instsub">{t.install.sub}</p>

      <ul className="instben">
        {t.install.benefits.map((b, i) => (
          <motion.li key={b} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.07 }}>
            <span className="bicon">{['♠', '♥', '♦'][i]}</span>{b}
          </motion.li>
        ))}
      </ul>

      <AnimatePresence mode="wait">
        {ins.installed || just ? (
          <motion.div key="done" className="instdone" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <span>✓</span>{t.install.done}
          </motion.div>
        ) : ins.canPrompt ? (
          <motion.button key="cta" className="btn acc big" onClick={install} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <span aria-hidden>⬇</span>{t.install.cta}
          </motion.button>
        ) : (
          <motion.ol key="steps" className="inststeps" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {steps.map((s, i) => (
              <motion.li key={s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}>
                <span className="stepn">{i + 1}</span>
                <span className="stepi">{icons[i]}</span>
                <span className="stept">{s}</span>
              </motion.li>
            ))}
            {ins.platform === 'ios' && !isIosSafari() && <div className="instwarn">{t.install.iosOther}</div>}
          </motion.ol>
        )}
      </AnimatePresence>

      {ins.platform === 'desktop' && (
        <div className="instqr">
          <QR text={SITE} />
          <div><b>{t.install.qr}</b><div className="mute" style={{ fontSize: 13, marginTop: 4 }}>bridge125.com</div></div>
        </div>
      )}

      <button className="btn ghost" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>{ins.installed || just ? t.close : t.install.later}</button>
    </Sheet>
  );
}
