import { AnimatePresence, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { SOCIAL_STRINGS } from '../i18n/social';
import { fmtBm } from '../shop/catalog';
import type { TableGeo } from '../screens/Table';
import type { RoomApi } from '../online/useRoom';
import { ChatGlyph, ChatPanel, SeatBubbles, useChatUi, useMutes } from './ChatDock';
import { GiftFlight, SeatGifts, TipFlight } from './GiftFx';
import { PlayerSheet } from './PlayerSheet';
import { DiamondSheet } from './DiamondPacks';
import '../styles/social.css';

/** Social state for one online table: chat dock, mutes, the open player card. */
export function useTableSocial(r: RoomApi) {
  const S = useStrings(SOCIAL_STRINGS);
  const mutes = useMutes();
  const ui = useChatUi(r.chat, r.chatBase, r.you, mutes, k => S.chat.quick[k]);
  const [sheet, setSheet] = useState<number | null>(null);
  const [dmSheet, setDmSheet] = useState(false);
  const slowUntil = r.chatErr ? r.chatErr.at + r.chatErr.wait : 0;
  return { S, mutes, ui, sheet, setSheet, dmSheet, setDmSheet, slowUntil };
}
export type TableSocialState = ReturnType<typeof useTableSocial>;

/** The frameless chat glyph for Table's `myRowExtra`. */
export function SocialGlyph({ s }: { s: TableSocialState }) {
  return <ChatGlyph ui={s.ui} S={s.S} />;
}

/** Everything drawn over the felt: seat gifts, chat bubbles, gift / tip flights and the chat dock. Pass as Table's `overlay`. */
export function SocialOverlay({ geo, r, s }: { geo: TableGeo; r: RoomApi; s: TableSocialState }) {
  const app = useApp();
  const reduce = !!useReducedMotion();
  const { S } = s;
  // small screens: the dock steps aside when it is my turn (it would cover my hand)
  useEffect(() => { if (geo.myTurn && !geo.desk) s.ui.setOpen(false); }, [geo.myTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = r.game?.players.length ?? r.room?.seats.length ?? 0;
  const seatAt = (i: number) => (i >= 0 && i < n ? geo.seat(i) : { x: geo.W / 2, y: -30 });
  const panelStyle = geo.desk
    ? { left: 16, width: Math.min(330, Math.max(270, geo.W / 2 - 440)), bottom: geo.H - geo.myRowTop + 12, height: Math.max(260, Math.min(460, geo.myRowTop - 140)) }
    : { left: 8, right: 8, bottom: 'calc(8px + var(--safe-b))', height: Math.min(geo.H * 0.58, 450) };

  return (
    <div className="soclayer">
      <SeatGifts list={r.seatGifts} seat={geo.seat} me={geo.me} avSize={geo.avSize} n={n} />
      {!geo.dealing && <SeatBubbles bubbles={s.ui.bubbles} seat={geo.seat} me={geo.me} W={geo.W} minY={geo.table.y + geo.table.h + 6} avSize={geo.avSize} />}
      {r.giftFx.map(ev => (
        <GiftFlight key={ev.id} ev={ev} from={seatAt(ev.from)} to={seatAt(ev.to)} reduce={reduce} onDone={r.doneGift} W={geo.W} H={geo.H}
          label={`${S.gift.names[ev.gift] ?? ev.gift} · ${S.gift.flyBy(ev.from === geo.me ? S.chat.you : ev.fromName)}`} />
      ))}
      {r.tipFx.map(ev => (
        <TipFlight key={ev.id} ev={ev} from={seatAt(ev.from)} to={seatAt(ev.to)} reduce={reduce} onDone={r.doneTip} W={geo.W} H={geo.H} label={`+${fmtBm(ev.amount)} BM`} />
      ))}
      <AnimatePresence>
        {s.ui.open && (
          <ChatPanel key="dock" ui={s.ui} S={S} chat={r.chat} you={r.you} mutes={s.mutes} signedIn={!!app.session} slowUntil={s.slowUntil}
            style={panelStyle} desk={geo.desk} sendChat={r.sendChat} sendQuick={r.sendQuick} report={r.report} />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Player card + Diamonds sheet (fixed, outside the table stage). */
export function SocialSheets({ r, s, onAuth }: { r: RoomApi; s: TableSocialState; onAuth?: () => void }) {
  const info = s.sheet != null ? r.room?.seats[s.sheet] : undefined;
  return (
    <>
      <AnimatePresence>
        {s.sheet != null && info && (
          <PlayerSheet key={'p' + s.sheet} seat={s.sheet} info={info} S={s.S}
            muted={s.mutes.isMuted(info.name)} onToggleMute={() => s.mutes.toggle(info.name)}
            onClose={() => s.setSheet(null)}
            onGift={gift => r.sendGift(s.sheet!, gift)} onTip={amount => r.sendTip(s.sheet!, amount)}
            onGetDiamonds={() => { s.setSheet(null); s.setDmSheet(true); }} onAuth={onAuth} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {s.dmSheet && <DiamondSheet key="dm" onClose={() => s.setDmSheet(false)} onAuth={onAuth} />}
      </AnimatePresence>
    </>
  );
}
