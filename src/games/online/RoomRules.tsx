import { motion } from 'motion/react';
import { useStrings } from '../../i18n/pick';
import { sfx } from '../../sound';
import { DURAK_STRINGS } from '../durak/strings';
import type { DurakRules } from '../durak/engine';
import { THOUSAND } from '../thousand/strings';
import type { ThousandRules } from '../thousand/engine';
import { ZOLE } from '../zole/strings';
import type { ZoleRules } from '../zole/engine';
import { ZOLE_ONLINE_DEALS } from './adapters/zole';
import type { OnlineGameId } from './protocol';
import { ONLINE_STRINGS } from './strings';

/** The room's rules in the waiting room: the host edits them, everybody else sees them. Labels come from each game's strings. */
export function RoomRules({ game, rules, seats, editable, onChange }: { game: OnlineGameId; rules: unknown; seats: number; editable: boolean; onChange: (r: unknown) => void }) {
  const S = useStrings(ONLINE_STRINGS);
  return (
    <div className={`gm-rules ${editable ? '' : 'ro'}`}>
      <div className="label">{S.rules}</div>
      {game === 'zole' && <ZoleRulesEd r={rules as ZoleRules} ed={editable} set={onChange} />}
      {game === 'durak' && <DurakRulesEd r={rules as DurakRules} seats={seats} ed={editable} set={onChange} />}
      {game === 'thousand' && <ThousandRulesEd r={rules as ThousandRules} ed={editable} set={onChange} />}
    </div>
  );
}

function ZoleRulesEd({ r, ed, set }: { r: ZoleRules; ed: boolean; set: (r: ZoleRules) => void }) {
  const s = useStrings(ZOLE);
  return (
    <>
      <Seg id="zd" label={s.lobby.deals} ed={ed} value={r.deals} options={ZOLE_ONLINE_DEALS.map(v => ({ v, l: String(v) }))} onChange={v => set({ ...r, deals: v })} />
      <Switch ed={ed} on={r.mazaZole} label={s.lobby.maza} onChange={v => set({ ...r, mazaZole: v })} />
      <Switch ed={ed} on={r.pules} label={s.lobby.pules} onChange={v => set({ ...r, pules: v })} />
    </>
  );
}

function DurakRulesEd({ r, seats, ed, set }: { r: DurakRules; seats: number; ed: boolean; set: (r: DurakRules) => void }) {
  const s = useStrings(DURAK_STRINGS);
  return (
    <>
      <Seg id="dv" label={s.variant} ed={ed} value={r.transfer} options={[{ v: false, l: s.podkidnoy }, { v: true, l: s.perevodnoy }]} onChange={v => set({ ...r, transfer: v })} />
      <Seg id="dd" label={s.deck} ed={ed} value={r.deck} options={[{ v: 36 as const, l: s.cards(36) }, { v: 24 as const, l: s.cards(24), off: seats > 4 }]} onChange={v => set({ ...r, deck: v })} />
    </>
  );
}

function ThousandRulesEd({ r, ed, set }: { r: ThousandRules; ed: boolean; set: (r: ThousandRules) => void }) {
  const s = useStrings(THOUSAND);
  const keys: (keyof ThousandRules)[] = ['marriageToBid', 'barrel', 'bolts', 'step10', 'samosval'];
  return <>{keys.map(k => <Switch key={k} ed={ed} on={r[k]} label={s.lobby.toggles[k].label} onChange={v => set({ ...r, [k]: v })} />)}</>;
}

function Seg<T extends string | number | boolean>({ id, label, value, options, onChange, ed }: {
  id: string; label: string; value: T; options: { v: T; l: string; off?: boolean }[]; onChange: (v: T) => void; ed: boolean;
}) {
  return (
    <div className="gm-rrow">
      <span className="gm-rl">{label}</span>
      <div className="gm-seg" role="radiogroup" aria-label={label}>
        {options.map(o => (
          <button key={String(o.v)} role="radio" aria-checked={o.v === value} className={o.v === value ? 'on' : ''} disabled={!ed || o.off}
            onClick={() => { if (o.v !== value) { sfx.tap(); onChange(o.v); } }}>
            {o.v === value && <motion.i layoutId={`gm-${id}`} className="pill" />}<span>{o.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Switch({ on, label, onChange, ed }: { on: boolean; label: string; onChange: (v: boolean) => void; ed: boolean }) {
  return (
    <button className={`gm-sw ${on ? 'on' : ''}`} role="switch" aria-checked={on} disabled={!ed} onClick={() => { sfx.tap(); onChange(!on); }}>
      <span>{label}</span><span className="sw" aria-hidden><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} /></span>
    </button>
  );
}
