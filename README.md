# Bridge 125

The classic Бридж card game — web app (PWA). React + Vite + Motion, Supabase auth/profiles, hosted on Cloudflare Workers (static assets + Durable Objects).

- Live: https://bridge125.com (Cloudflare Pages project `bridge125`, also https://bridge125.pages.dev)
- Supabase project: `bridge125` (ref `iclxvshtxwukkhljetik`, free org "Bridge 125")

## Develop
    npm install
    npm run dev          # http://localhost:5173
    npx vitest run       # rules engine tests

## Online play
`worker/` is a Cloudflare Worker that serves the built app (`dist/`) and hosts game tables as Durable Objects
(`/api/room/<CODE>/ws`, WebSocket). The server runs the same rules engine, hides other players' cards,
plays for bots / absent players and keeps a 30 s turn timer.

    npm run build && npx wrangler dev     # http://localhost:8787 (app + online tables)

## Deploy
Push to `main` — Cloudflare Workers Builds runs `npm run build` and `npx wrangler deploy` automatically.

## Structure
- `src/engine/engine.ts` — rules engine (36 cards, all special cards, scoring, 125 → 0, 130 ends game)
- `src/engine/bot.ts` — bot AI (easy / normal)
- `src/i18n.ts` — EN / LV / RU / UK (RU/UK use В Д К Т on cards)
- `src/theme.ts` — accent colours and table backgrounds (personalisation for signed-in players)
- `src/screens/*` — Home, Game table, Results, Rules & Profile sheets
- `supabase/schema.sql` — profiles table, RLS, signup trigger, `record_game()` RPC
