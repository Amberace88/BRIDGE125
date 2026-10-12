import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { getSupabase } from '../supabase';
import { Sheet } from './Sheets';

interface Row { rank: number; username: string; wins: number; games_played: number; bm: number; is_me: boolean }

const MEDAL = ['#F3DE9C', '#D9DEE6', '#E0A878'];

export function Leaderboard({ onClose, onAuth }: { onClose: () => void; onAuth: () => void }) {
  const app = useApp();
  const { t } = app;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    getSupabase().then(sb => {
      if (!sb) { setErr(true); return; }
      sb.rpc('leaderboard', { lim: 50 }).then(({ data, error }) => {
        if (error) { setErr(true); return; }
        setRows((data ?? []) as Row[]);
      });
    }).catch(() => setErr(true));
  }, [app.profile?.games_played]);

  const top = rows?.filter(r => r.rank <= 3) ?? [];
  const rest = rows?.filter(r => r.rank > 3) ?? [];
  const pct = (r: Row) => (r.games_played ? Math.round((r.wins / r.games_played) * 100) : 0);
  // podium order: 2nd, 1st, 3rd
  const podium = [top.find(r => r.rank === 2), top.find(r => r.rank === 1), top.find(r => r.rank === 3)];

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <h2 className="serif" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{t.lb.title}</h2>
        <span className="mute" style={{ fontSize: 13 }}>{t.lb.sub}</span>
      </div>

      {!rows && !err && (
        <div className="lbskel">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="shimmerbar" style={{ animationDelay: `${i * 0.08}s` }} />)}</div>
      )}
      {err && <div className="lbempty">{t.lb.error}</div>}
      {rows && rows.length === 0 && <div className="lbempty">🏆<br />{t.lb.empty}</div>}

      {top.length > 0 && (
        <div className="podium">
          {podium.map((r, i) => r ? (
            <motion.div key={r.rank} className={`pod p${r.rank} ${r.is_me ? 'me' : ''}`} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: [0.15, 0, 0.3][i], type: 'spring', stiffness: 220, damping: 18 }}>
              <div className="podav" style={{ borderColor: MEDAL[r.rank - 1] }}>{r.username.slice(0, 1).toUpperCase()}<i style={{ background: MEDAL[r.rank - 1] }}>{r.rank}</i></div>
              <div className="podname">{r.is_me ? t.lb.you : r.username}</div>
              <div className="podwins"><b>{r.wins}</b> {t.lb.wins.toLowerCase()}</div>
              <div className="podbar" style={{ background: `linear-gradient(180deg, ${MEDAL[r.rank - 1]}33, transparent)` }} />
            </motion.div>
          ) : <div key={'e' + i} />)}
        </div>
      )}

      {rest.length > 0 && (
        <div className="lblist">
          <div className="lbrow head"><span>#</span><span /><span>{t.lb.wins}</span><span>{t.lb.games}</span><span>{t.lb.winRate}</span></div>
          {rest.map((r, i) => (
            <motion.div key={r.rank} className={`lbrow ${r.is_me ? 'me' : ''}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + Math.min(i, 12) * 0.03 }}>
              <span className="rk">{r.rank}</span>
              <span className="nm">{r.is_me ? `${r.username} (${t.lb.you})` : r.username}</span>
              <b>{r.wins}</b><span>{r.games_played}</span><span>{pct(r)}%</span>
            </motion.div>
          ))}
        </div>
      )}

      {!app.session && app.online && (
        <button className="btn acc" style={{ width: '100%', marginTop: 18 }} onClick={onAuth}>{t.lb.signIn}</button>
      )}
      <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onClose}>{t.close}</button>
    </Sheet>
  );
}
