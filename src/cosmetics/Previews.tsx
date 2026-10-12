import { memo, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../store';
import { ACCENTS, BACKS, TABLES, backCss } from '../theme';
import { CardFace } from '../components/CardView';
import type { Card } from '../engine/engine';
import { UserAvatar } from '../media/UserAvatar';
import { cosmetic, type Cosmetic, type Slot } from '../shop/catalog';
import { AvatarFrame } from './AvatarFrame';
import { PlayerName, TitleBadge } from './Badges';
import { VictoryEffect } from './VictoryEffect';
import { bannerCss, emotesOf, NAME_COLORS } from './data';
import { pick } from '../i18n/pick';
import { SHOP_STRINGS } from '../i18n/shop';

/** Previews shared by the Shop and the Profile wardrobe. All of them are pure CSS + DOM (no canvas). */

export const tableOf = (id: string) => TABLES.find(t => t.id === id) ?? TABLES[0];

/** A card back in the same anatomy as the real one (.bk): border, ♠ medallion, legendary foil sweep. */
export const BackCard = memo(function BackCard({ id, table, w, style, className = '' }: { id: string; table?: string; w: number; style?: CSSProperties; className?: string }) {
  const app = useApp();
  const fx = BACKS.find(b => b.id === id && b.id !== 'match')?.fx;
  return (
    <span className={`czback ${fx ? 'czfoil' : ''} ${className}`.trim()} style={{ width: w, height: Math.round(w * 1.43), background: backCss(id, table ?? app.table), ...style }}>
      <i />
    </span>
  );
});

const FAN: Card[] = [{ id: 'AS', r: 'A', s: 'S' }, { id: 'KH', r: 'K', s: 'H' }, { id: 'QS', r: 'Q', s: 'S' }, { id: '10D', r: '10', s: 'D' }, { id: '7C', r: '7', s: 'C' }];

/** Fanned real cards in a given face style (data-face wrapper → styles/cosmetics.css). */
export const FaceFan = memo(function FaceFan({ face, w, n = 3, spread = 13, cards }: { face: string; w: number; n?: number; spread?: number; cards?: Card[] }) {
  const { lang } = useApp();
  const list = (cards ?? (n === 2 ? [FAN[0], FAN[1]] : n === 3 ? [FAN[0], FAN[1], FAN[3]] : FAN)).slice(0, n);
  const h = Math.round(w * 1.43);
  return (
    <div className="czfan" data-face={face} style={{ width: w + (list.length - 1) * w * 0.42, height: h + w * 0.25 }}>
      {list.map((c, i) => {
        const k = i - (list.length - 1) / 2;
        return (
          <div key={c.id} className="card" style={{ width: w, height: h, ['--cw' as string]: `${w}px`, left: `calc(50% - ${w / 2}px + ${k * w * 0.42}px)`, top: Math.abs(k) * w * 0.07,
            transform: `rotate(${k * spread}deg)`, transformOrigin: '50% 120%', zIndex: i }}>
            <CardFace card={c} lang={lang} />
          </div>
        );
      })}
    </div>
  );
});

/** The local player's avatar inside a frame. */
export const FramedMe = memo(function FramedMe({ frame, size }: { frame: string; size: number }) {
  return <AvatarFrame id={frame} size={size}><UserAvatar size={size} ring={false} /></AvatarFrame>;
});

/** Avatar + name (colour) + title — what other players see at your seat. */
export function SeatCard({ frame, title, namecolor, size = 44, className = '' }: { frame: string; title: string; namecolor: string; size?: number; className?: string }) {
  const app = useApp();
  return (
    <div className={`czseat ${className}`.trim()}>
      <FramedMe frame={frame} size={size} />
      <div className="czseatname">
        <PlayerName name={app.name || app.t.guest} color={namecolor} />
        <TitleBadge id={title} size="sm" />
      </div>
    </div>
  );
}

/** Profile card with a banner backdrop. */
export function BannerCard({ banner, frame, title, namecolor, compact = false }: { banner: string; frame: string; title: string; namecolor: string; compact?: boolean }) {
  return (
    <div className={`czbanner ${compact ? 'compact' : ''}`} style={{ background: bannerCss(banner) }}>
      <span className="czbannersheen" aria-hidden />
      <SeatCard frame={frame} title={title} namecolor={namecolor} size={compact ? 34 : 52} />
    </div>
  );
}

/* ================================================================== thumbnails (grid tiles) */

function TableThumb({ id }: { id: string }) {
  const tb = tableOf(id);
  return (
    <div className="czth czth-table" style={{ background: tb.css, backgroundColor: tb.tone }}>
      <span className="czrim" />
      <BackCard id="match" table={id} w={22} style={{ transform: 'rotate(-10deg) translate(-8px, 2px)' }} />
      <BackCard id="match" table={id} w={22} style={{ transform: 'rotate(8deg) translate(6px, -2px)', marginLeft: -14 }} />
    </div>
  );
}

/** Small square-ish preview of any item, used by wardrobe tiles. `slot` picks which side of a set to show. */
export function ItemThumb({ id, slot, table }: { id: string; slot: Slot | 'pack'; table?: string }) {
  const app = useApp();
  const tb = tableOf(table ?? app.table);
  const felt = { background: tb.css, backgroundColor: tb.tone };
  switch (slot) {
    case 'table': return <TableThumb id={id} />;
    case 'back': return <div className="czth" style={felt}><BackCard id={id} table={table ?? app.table} w={40} /></div>;
    case 'accent': {
      const a = ACCENTS.find(x => x.id === id) ?? ACCENTS[0];
      return <div className="czth" style={felt}><span className="czgem" style={{ background: `radial-gradient(circle at 35% 30%, ${a.hi}, ${a.base} 55%, ${a.lo})` }} /></div>;
    }
    case 'face': return <div className="czth czth-face" style={felt}><FaceFan face={id} w={30} n={2} spread={10} /></div>;
    case 'frame': return <div className="czth czth-frame"><FramedMe frame={id} size={34} /></div>;
    case 'victory': return <div className="czth czth-vx" style={felt}><VictoryEffect id={id} contained loop /><span className="czvxlabel serif">✦</span></div>;
    case 'emotes': return <div className="czth czth-em">{emotesOf(id).slice(0, 4).map(e => <span key={e}>{e}</span>)}</div>;
    case 'title': return <div className="czth czth-title">{id === 't_none' ? <span className="czdash">—</span> : <TitleBadge id={id} />}</div>;
    case 'namecolor': {
      const nc = NAME_COLORS.find(n => n.id === id);
      return <div className="czth czth-nc"><PlayerName name="Aa" color={nc?.id} className="serif" /></div>;
    }
    case 'banner': return <div className="czth czth-banner" style={{ background: bannerCss(id) }}><span className="czbannersheen" aria-hidden /></div>;
    case 'pack': {
      const c = cosmetic(id);
      return (
        <div className="czth czth-pack" style={felt}>
          {(c?.grants ?? []).slice(0, 3).map((g, i) => (
            <span key={g} className="czpackbit" style={{ ['--i' as string]: i - 1 }}><ItemThumb id={g} slot={cosmetic(g)?.slots[0] ?? 'table'} table={table} /></span>
          ))}
        </div>
      );
    }
  }
}

/* ================================================================== big previews (Shop detail / cards) */

/** Big, theatrical preview for the new categories (theme items keep the Shop's own previews). */
export function CosmeticStage({ c, slot }: { c: Cosmetic; slot: Slot | 'pack' }): ReactNode {
  const app = useApp();
  const tb = tableOf(app.table);
  const felt = { background: tb.css, backgroundColor: tb.tone };
  switch (slot) {
    case 'face': return <div className="czstage" style={felt}><span className="czrim" /><FaceFan face={c.id} w={46} n={5} spread={9} /></div>;
    case 'frame': return <div className="czstage czstage-frame" style={felt}><span className="czrim" /><FramedMe frame={c.id} size={62} /></div>;
    case 'victory': return <div className="czstage" style={felt}><span className="czrim" /><span className="czwin serif">{pick(SHOP_STRINGS, app.lang).level.win}</span><VictoryEffect id={c.id} contained loop /></div>;
    case 'emotes': return (
      <div className="czstage czstage-em" style={felt}>
        <span className="czrim" />
        <div className="czemgrid">{emotesOf(c.id).map((e, i) => <span key={e} style={{ animationDelay: `${i * 0.12}s` }}>{e}</span>)}</div>
      </div>
    );
    case 'title': case 'namecolor': return (
      <div className="czstage czstage-seat" style={felt}>
        <span className="czrim" />
        <SeatCard frame="fr_brass" title={slot === 'title' ? c.id : 't_none'} namecolor={slot === 'namecolor' ? c.id : 'nc_default'} size={38} />
      </div>
    );
    case 'banner': return <div className="czstage czstage-banner"><BannerCard banner={c.id} frame="fr_brass" title="t_none" namecolor="nc_default" /></div>;
    case 'pack': return (
      <div className="czstage czstage-pack" style={felt}>
        <span className="czrim" />
        <div className="czpackgrid">
          {(c.grants ?? []).map(g => <span key={g}><ItemThumb id={g} slot={cosmetic(g)?.slots[0] ?? 'table'} /></span>)}
        </div>
      </div>
    );
    default: return null;
  }
}
