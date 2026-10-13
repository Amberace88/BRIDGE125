# Merch fulfilment — owner setup (Stripe + Printful / Gelato / Prodigi / Printify)

English first, **Latviešu valodā — zemāk** ([pāriet](#latviski)).

The code is finished. Real merch orders stay **off** (the store keeps showing "Notify me") until Stripe, the Supabase
service key and **at least one print provider** are configured *and* a product variant is mapped to that provider.
No key or token is ever stored in the repo — you add them yourself with `npx wrangler secret put`.

---

## 1. "Won't Bridge 125 and Rojo y Gualda get mixed up?"

**No — it is built so they cannot.** Four independent locks:

1. **Separate store per brand.** Bridge 125 gets its *own* store at every provider (Printful store, Printify shop) or its
   *own* account (Gelato, Prodigi). Rojo y Gualda keeps its store/account; nothing of it is touched.
2. **The Worker proves which store it talks to before every order** (the "brand guard", `worker/merchBrand.ts`):
   - Printful / Printify: the configured `PRINTFUL_STORE_ID` / `PRINTIFY_SHOP_ID` must exist for the token **and that
     store's name must contain "Bridge 125"**. If you ever paste the Rojo y Gualda store id or token, every order is
     refused and waits in *Admin → Pasūtījumi* as "needs attention" — nothing is sent.
   - Gelato / Prodigi (their keys are account-wide): the account must contain **no orders that are not Bridge 125's**.
     If the key belongs to an account that already has Rojo y Gualda orders, the Worker refuses to send anything.
   - The same check runs before checkout, so a customer is never charged for something that would be refused.
3. **Every external order is tagged**: order/item references start with `b125-`, metadata `brand = bridge125`
   (Gelato, Prodigi), packing slip "Bridge 125 · bridge125.com" (Printful), sender/return company "Bridge 125"
   (Gelato). The database only accepts `brand = 'bridge125'`; Stripe sessions of another brand are ignored.
4. **Webhooks are filtered**: a status callback for another store, or for an order without the `b125-` prefix, is
   ignored, and statuses are always re-read from the provider API with the Bridge 125 key.

Branding on parcels (packing slip, logo, return address) is configured **per store / per account** at the provider —
which is exactly why each brand gets its own.

### Same e-mail for the API?

| Provider | Same login e-mail as Rojo y Gualda? | How |
|---|---|---|
| **Printful** | ✅ yes | One account, several stores. Add a new store "Bridge 125" and create a token that only has access to that store. |
| **Printify** | ✅ yes | One account, several shops. Add a new shop "Bridge 125"; the Worker always uses `PRINTIFY_SHOP_ID`. |
| **Gelato** | ⚠️ use a separate account | API keys see the whole account, so Bridge 125 needs its own account. Use an e-mail alias, e.g. `yourname+bridge125@gmail.com` (Gmail delivers it to your normal inbox). |
| **Prodigi** | ⚠️ use a separate account | Same reason. Alias e-mail as above; branding (packing slip, inserts) is per account. |

You do **not** need all four. One is enough to start; two give a fallback (if the first provider rejects an order the
Worker automatically tries the next one, *only* while no order exists at the first).

---

## 2. How it works

```
Store (cart) ── POST /api/merch/checkout ──► Worker: prices from src/merch/catalog.ts (never from the browser),
                                             provider check + brand guard, Stripe Checkout Session
Customer pays on checkout.stripe.com (address, phone, e-mail collected by Stripe; guests welcome)
Stripe ── checkout.session.completed ──► /api/pay/webhook (same endpoint as Diamonds) → merch_orders row
                                         (idempotent on the session id) → each item routed by
                                         src/merch/fulfillment.ts → one provider order per provider
Provider ── status / tracking callbacks ──► /api/merch/hooks/<provider>?t=<secret> → status re-read from the API
Cron every 10 min ── retries due orders (1, 5, 15 min, 1 h, 3 h, 6 h, 12 h, 24 h) + refreshes stale statuses
Player ── Profile → My orders (timeline + tracking links) · Admin → Pasūtījumi (filter, retry, resolve, providers)
```

Files: `worker/merch*.ts` (routes, Stripe, providers, brand guard, queue), `src/merch/fulfillment.ts` (which provider
makes what, variant ids, print files, shipping zones), `src/merch/checkout.ts` + `src/merch/orders.ts` (client),
`src/merch/MyOrders.tsx`, `src/merch/OrdersAdmin.tsx`, `supabase/migration_021_merch_orders.sql`.

---

## 3. Step by step

### 0. Database (once)
Run `supabase/migration_021_merch_orders.sql` in the Supabase SQL editor (after 001–020; safe to re-run).

### 1. Stripe (already set up for Diamonds)
Nothing new is required: merch uses the same `STRIPE_SECRET_KEY` and the same webhook endpoint
`https://bridge125.com/api/pay/webhook`. Check that the endpoint has the events `checkout.session.completed`,
`checkout.session.async_payment_succeeded` and `charge.refunded` (docs/PAYMENTS.md, step 3).

Optional: a separate endpoint `https://bridge125.com/api/merch/webhook` with its own signing secret
(`npx wrangler secret put STRIPE_MERCH_WEBHOOK_SECRET`). Not needed if you use the shared one.

Tax: prices include VAT (`tax_behavior: inclusive`). With Stripe Tax active, `STRIPE_AUTOMATIC_TAX = "1"` in
`wrangler.jsonc` also covers merch (the shipping address decides the VAT rate).

### 2. Printful (same account as Rojo y Gualda is fine)
1. Printful dashboard → **Stores → Add store → "Manual order platform / API"**. Name it **`Bridge 125`** (the name
   must contain "Bridge 125" — the Worker checks it).
2. In that store's **Settings**: *Packing slip* — logo `public/logo-mark.svg` (export PNG), store name "Bridge 125",
   message, return address; *Branding* — optional pack-ins. *Billing* — card for production costs.
3. **developers.printful.com → Your tokens → Create token**: access level **store** (choose the Bridge 125 store
   only), scopes: orders, stores (read), catalog (read), webhooks, file library. Copy the token.
4. The store id: shown in the store's URL in the dashboard, or in *Admin → Pasūtījumi → Piegādātāji* after step 5
   (an error message lists the stores the token can see).
5. Secrets:
   ```bash
   npx wrangler secret put PRINTFUL_TOKEN       # the store-level token
   npx wrangler secret put PRINTFUL_STORE_ID    # numeric id of the Bridge 125 store
   ```
6. Webhooks: *Admin → Pasūtījumi → Piegādātāji → Printful → "Izveidot webhookus"*. The response shows `secret_key`;
   store it with `npx wrangler secret put PRINTFUL_WEBHOOK_SECRET` to enable signature checks (optional — the URL
   carries a secret token and statuses are re-read from the API anyway).

### 3. Gelato (own account)
1. Sign up at gelato.com with an alias e-mail (`yourname+bridge125@gmail.com`). Company/brand name **Bridge 125**.
2. Settings → **Branding / Packaging**: Bridge 125 logo, sender name; billing card.
3. **Developer → API keys → Create** → copy the key.
4. `npx wrangler secret put GELATO_API_KEY` (optional `GELATO_STORE_ID` if you use Gelato stores).
5. **Developer → Webhooks**: URL from *Admin → Piegādātāji → Gelato → Webhook URL*, events
   `order_status_updated`, `order_item_status_updated`, `order_item_tracking_code_updated`.
6. Do not place Rojo y Gualda orders in this account — the brand guard would (correctly) stop all Bridge 125 orders.

### 4. Prodigi (own account)
1. Sign up at prodigi.com (dashboard) with an alias e-mail; brand **Bridge 125**; *Settings → Branding*: packing
   slip / inserts; billing.
2. **Settings → Integrations → API**: copy the API key (sandbox key for testing: set `PRODIGI_SANDBOX` to `"1"` in
   `wrangler.jsonc` vars).
3. `npx wrangler secret put PRODIGI_API_KEY`
4. Callbacks are automatic (every order carries its own callback URL).

### 5. Printify (same account as Rojo y Gualda is fine)
1. Printify → **My stores → Add new store → "API"** (or "Other / Manual"). Name it **`Bridge 125`**.
2. **Account → Connections → Personal access tokens → Generate** (scopes: shops.read, catalog.read, orders.read,
   orders.write, products.read, webhooks.read, webhooks.write).
3. Shop id: *Admin → Piegādātāji* shows the visible shops when the id is wrong; or `GET /v1/shops.json`.
4. ```bash
   npx wrangler secret put PRINTIFY_TOKEN
   npx wrangler secret put PRINTIFY_SHOP_ID
   ```
5. Webhooks: *Admin → Piegādātāji → Printify → "Izveidot webhookus"* (signed with a secret derived on the Worker).
6. The deck: design the 36-card deck once in Printify's editor (files `merch-print/deck/*.png`), save it as a product
   in the Bridge 125 shop and put its product id + variant id in `src/merch/fulfillment.ts` (`deck` → printify).

### 6. Map products → provider variants (`src/merch/fulfillment.ts`)
*Admin → Pasūtījumi → Piegādātāji → Kataloga meklēšana* lists the provider catalogue (Printful catalog variants,
Gelato productUids, Prodigi SKUs, Printify blueprint variants or your shop's products). Paste ids into the route's
`variants` using keys `<colour>/<size>` (`'ink/L': 4017`, `'ink/*'`, `'*/L'`, `'*'`). The card "Kartēti varianti"
shows coverage. Deploy (batch it with other changes). Only mapped variants of configured providers become buyable;
`GET /api/merch/status` returns them as `sellable`.

### 7. Print files
`npm run build` publishes `merch-print/**` (png/jpg/pdf) to `dist/print/<content-hash>/<path>` with a private
manifest. URLs are immutable (a changed file gets a new URL, so providers never print a cached old version) and
unguessable; `/print/manifest.json` is never served. Alternative: upload the folder to a public bucket (e.g.
Supabase Storage `print`) and set `MERCH_PRINT_BASE_URL` (var) to its base URL.

### 8. Test
1. Stripe **test mode** keys; set `"MERCH_DRAFT_ORDERS": "1"` in `wrangler.jsonc` → Printful drafts, Gelato draft
   orders, Printify orders not sent to production, Prodigi only with `PRODIGI_SANDBOX=1`.
2. Buy in the store with card `4242 4242 4242 4242`.
3. *Admin → Pasūtījumi*: the order appears, the provider order id is filled; open the provider dashboard and check
   the draft carries the `b125-…` reference, Bridge 125 packing slip and the right print file.
4. Set `MERCH_DRAFT_ORDERS` back to `"0"`, switch Stripe to live keys. Done.

### 9. Shipping, tax, e-mails
- Flat shipping per zone in `SHIPPING_ZONES` (`src/merch/fulfillment.ts`): EU €5.90 (free from €75),
  UK/CH/NO/IS €9.90 (free from €120), US/CA/AU/NZ €14.90. Optional allow-list: `MERCH_COUNTRIES = "LV,LT,EE,ES"`.
  `MERCH_LIVE_SHIPPING = "1"` asks Printful / Prodigi for live rates and falls back to the flat rate.
- E-mails without any new paid service: **order confirmation** = Stripe receipt (Stripe → Settings → Customer
  emails → "Successful payments"); **shipping + tracking** = the provider's customer notifications (Printful: store
  *Settings → Customer notifications*; Gelato: *Settings → Notifications*; Printify sends them for API orders);
  the player also sees tracking in *Profile → My orders*.
- Refunds: a full refund in Stripe marks the order *Refunded*; orders not yet sent are cancelled automatically, sent
  ones are flagged "needs attention" — cancel them in the provider dashboard if not printed yet.

### All secrets and vars

| Name | Kind | Needed for |
|---|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` | secret | already set (docs/PAYMENTS.md) |
| `PRINTFUL_TOKEN`, `PRINTFUL_STORE_ID` (+ optional `PRINTFUL_WEBHOOK_SECRET`) | secret | Printful |
| `GELATO_API_KEY` (+ optional `GELATO_STORE_ID`) | secret | Gelato |
| `PRODIGI_API_KEY` | secret | Prodigi (`PRODIGI_SANDBOX` var = "1" for sandbox) |
| `PRINTIFY_TOKEN`, `PRINTIFY_SHOP_ID` | secret | Printify |
| `STRIPE_MERCH_WEBHOOK_SECRET`, `MERCH_HOOK_SECRET` | secret | optional |
| `MERCH_DRAFT_ORDERS`, `MERCH_LIVE_SHIPPING`, `MERCH_COUNTRIES`, `MERCH_CONTACT_EMAIL`, `MERCH_RETURN_ADDRESS`, `MERCH_PRINT_BASE_URL` | var (`wrangler.jsonc`) | behaviour |

A provider whose secrets are missing is simply off. `GET /api/merch/status` → `{"enabled": false}` until Stripe + the
service key + one provider exist; every money-moving endpoint answers `503 {"error":"unavailable","reason":"not_configured"}`.

### When something goes wrong
*Admin → Pasūtījumi* (filter "Tikai problēmas"): each provider order shows status, attempts, the last error and the
provider's status. **↻ Mēģināt vēlreiz** re-queues and submits at once (after you fixed a mapping, secret or brand
problem); **✓ Atrisināts** marks one you handled by hand (with a note); **Atcelt** stops it. Transient errors retry
automatically with backoff for ~2 days, then become "needs attention".

### Endpoints
| | |
|---|---|
| `GET /api/merch/status` | enabled, providers, sellable variants, zones |
| `POST /api/merch/checkout` | `{ items:[{productId,colour,size,qty}], lang, consent:true, country? }` → `{ url }` |
| `POST /api/pay/webhook` / `/api/merch/webhook` | Stripe |
| `GET /api/merch/order?sid=cs_…` | thank-you page status (no personal data) |
| `POST /api/merch/hooks/<provider>?t=…` | provider callbacks |
| `GET /api/merch/admin/providers`, `GET /api/merch/admin/catalog`, `POST /api/merch/admin/{retry,run,register-hooks}` | admin only |

### Limitations
- Provider variant ids are empty until you map them (step 6) — by design nothing is sold before that.
- Printful v2 webhook signature format and Printify webhook topics follow the providers' docs as of 2026-10; if a
  signature check ever fails, unset `PRINTFUL_WEBHOOK_SECRET` — the cron keeps statuses fresh every 6 h regardless.
- One shipping price per checkout zone (Stripe Checkout cannot change the price after the address is typed);
  the store can pass `country` to pick the zone up front.
- Gelato / Prodigi have no "store name" API, so their guard is "no foreign orders on this account".

---

<a id="latviski"></a>
# Merch izpilde — iestatīšana (latviski)

Kods ir gatavs. Īsti merch pasūtījumi ir **izslēgti** (veikalā paliek "Paziņot man"), kamēr nav iestatīts Stripe,
Supabase servisa atslēga un **vismaz viens drukas piegādātājs**, *un* preces variantam nav piesaistīts šī piegādātāja
ID. Neviena atslēga netiek glabāta repozitorijā — tās pievieno tu pats ar `npx wrangler secret put`.

## 1. "Vai Bridge 125 un Rojo y Gualda nesajauksies?"

**Nē — tas ir uzbūvēts tā, ka nevar.** Četras neatkarīgas slēdzenes:

1. **Katram zīmolam savs veikals.** Bridge 125 katram piegādātājam ir *savs* veikals (Printful store, Printify shop)
   vai *savs* konts (Gelato, Prodigi). Rojo y Gualda veikals/konts paliek neaizskarts.
2. **Pirms katra pasūtījuma Worker pārbauda, ar kuru veikalu runā** ("zīmola sargs", `worker/merchBrand.ts`):
   - Printful / Printify: iestatītajam `PRINTFUL_STORE_ID` / `PRINTIFY_SHOP_ID` jābūt redzamam šim tokenam **un
     veikala nosaukumā jābūt "Bridge 125"**. Ja kļūdas pēc ieliksi Rojo y Gualda veikala ID vai tokenu, katrs
     pasūtījums tiek atteikts un gaida *Admin → Pasūtījumi* kā "jāpievērš uzmanība" — nekas netiek nosūtīts.
   - Gelato / Prodigi (atslēga redz visu kontu): kontā **nedrīkst būt neviena pasūtījuma, kas nav Bridge 125**. Ja
     atslēga pieder kontam ar Rojo y Gualda pasūtījumiem, Worker neko nesūta.
   - Tā pati pārbaude notiek pirms apmaksas — pircējs nekad nemaksā par to, ko nevarētu izpildīt.
3. **Katrs ārējais pasūtījums ir marķēts**: atsauces sākas ar `b125-`, metadati `brand = bridge125`, pavadzīme
   "Bridge 125 · bridge125.com", sūtītājs "Bridge 125". Datubāze pieņem tikai `brand = 'bridge125'`.
4. **Webhooki tiek filtrēti**: cita veikala vai bez `b125-` prefiksa notikumi tiek ignorēti; statusu vienmēr pārlasa
   no piegādātāja API ar Bridge 125 atslēgu.

Zīmola noformējums uz pakām (pavadzīme, logo, atgriešanas adrese) piegādātājiem tiek iestatīts **katram veikalam /
kontam atsevišķi** — tieši tāpēc katram zīmolam vajag savu.

### Vai API var izmantot to pašu e-pastu?

| Piegādātājs | Tas pats e-pasts kā Rojo y Gualda? | Kā |
|---|---|---|
| **Printful** | ✅ jā | Viens konts, vairāki veikali. Pievieno jaunu veikalu "Bridge 125" un izveido tokenu tikai šim veikalam. |
| **Printify** | ✅ jā | Viens konts, vairāki shopi. Pievieno shopu "Bridge 125"; Worker vienmēr lieto `PRINTIFY_SHOP_ID`. |
| **Gelato** | ⚠️ atsevišķs konts | API atslēga redz visu kontu. Izmanto e-pasta aizstājvārdu, piem. `tavsvards+bridge125@gmail.com` (Gmail to piegādā tavā parastajā pastkastē). |
| **Prodigi** | ⚠️ atsevišķs konts | Tas pats iemesls; zīmola iestatījumi ir konta līmenī. |

Visus četrus **nevajag**. Sākumam pietiek ar vienu; divi dod rezervi (ja pirmais atsaka pasūtījumu, Worker
automātiski mēģina nākamo — *tikai* kamēr pie pirmā pasūtījums vēl nav izveidots).

## 2. Soli pa solim

**0. Datubāze.** Supabase SQL redaktorā palaid `supabase/migration_021_merch_orders.sql` (pēc 001–020; drīkst palaist atkārtoti).

**1. Stripe.** Jau iestatīts Diamonds pirkumiem — merch izmanto to pašu atslēgu un webhook
`https://bridge125.com/api/pay/webhook`. Pārbaudi, ka ir notikumi `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `charge.refunded`. (Pēc izvēles atsevišķs endpoint
`/api/merch/webhook` ar `STRIPE_MERCH_WEBHOOK_SECRET`.)

**2. Printful** (tas pats konts kā Rojo y Gualda — der):
1. *Stores → Add store → "Manual order platform / API"*, nosaukums **`Bridge 125`**.
2. Veikala *Settings*: pavadzīme (Bridge 125 logo, nosaukums, ziņa, atgriešanas adrese), zīmols, maksājumu karte.
3. *developers.printful.com → Your tokens → Create token*: līmenis **store** (tikai Bridge 125 veikals); tiesības:
   orders, stores, catalog, webhooks, file library.
4. `npx wrangler secret put PRINTFUL_TOKEN` un `npx wrangler secret put PRINTFUL_STORE_ID` (veikala ID redzams
   paneļa adresē; ja ID ir nepareizs, *Admin → Piegādātāji* parāda tokenam redzamos veikalus).
5. *Admin → Pasūtījumi → Piegādātāji → Printful → "Izveidot webhookus"*; atbildē esošo `secret_key` ieliec ar
   `npx wrangler secret put PRINTFUL_WEBHOOK_SECRET` (pēc izvēles).

**3. Gelato** (savs konts): reģistrējies ar aizstājvārda e-pastu, zīmols **Bridge 125**, *Branding* iestatījumi,
*Developer → API keys* → `npx wrangler secret put GELATO_API_KEY`. *Developer → Webhooks*: URL no *Admin →
Piegādātāji → Gelato*, notikumi `order_status_updated`, `order_item_status_updated`, `order_item_tracking_code_updated`.
Šajā kontā neliec Rojo y Gualda pasūtījumus.

**4. Prodigi** (savs konts): reģistrējies ar aizstājvārda e-pastu, *Settings → Branding*, *Integrations → API* →
`npx wrangler secret put PRODIGI_API_KEY` (testēšanai sandbox atslēga + `"PRODIGI_SANDBOX": "1"`). Callback adrese
tiek pievienota katram pasūtījumam automātiski.

**5. Printify** (tas pats konts — der): *My stores → Add new store → "API"*, nosaukums **`Bridge 125`**;
*Account → Connections → Personal access token* → `npx wrangler secret put PRINTIFY_TOKEN` un
`npx wrangler secret put PRINTIFY_SHOP_ID`; webhooki — poga *"Izveidot webhookus"* admin panelī. Kāršu kavu (36
kārtis, `merch-print/deck/*.png`) vienreiz noformē Printify redaktorā, saglabā kā produktu Bridge 125 shopā un
tā produkta ID + varianta ID ieraksti `src/merch/fulfillment.ts` (`deck` → printify).

**6. Preču piesaiste** (`src/merch/fulfillment.ts`): *Admin → Piegādātāji → Kataloga meklēšana* parāda piegādātāja
katalogu. ID ieraksti maršruta `variants` ar atslēgām `<krāsa>/<izmērs>` (`'ink/L': 4017`, `'ink/*'`, `'*'`).
Kartīte "Kartēti varianti" rāda pārklājumu. Izvieto (kopā ar citām izmaiņām, lai netērētu deploy). Pārdodami ir
tikai piesaistītie varianti pie iestatītiem piegādātājiem.

**7. Drukas faili.** `npm run build` publicē `merch-print/**` uz `/print/<satura-hash>/<ceļš>` (nemaināmi,
neuzminami URL; manifests nav publisks). Alternatīva: publisks bucket + `MERCH_PRINT_BASE_URL`.

**8. Tests.** Stripe testa atslēgas, `"MERCH_DRAFT_ORDERS": "1"` (melnraksti, nekas netiek ražots), pirkums ar
karti `4242 4242 4242 4242`, pārbaudi *Admin → Pasūtījumi* un piegādātāja panelī `b125-…` atsauci, pavadzīmi un
drukas failu. Tad `MERCH_DRAFT_ORDERS` atpakaļ uz `"0"` un Stripe live atslēgas.

**9. Piegāde, PVN, e-pasti.** Fiksēta piegāde pa zonām (`SHIPPING_ZONES`): ES €5.90 (bez maksas no €75), UK/CH/NO/IS
€9.90 (no €120), US/CA/AU/NZ €14.90. Cenas ar PVN; Stripe Tax ar `STRIPE_AUTOMATIC_TAX = "1"`. E-pasti bez jauna
maksas servisa: apstiprinājums = Stripe čeks (*Settings → Customer emails*), piegāde + izsekošana = piegādātāja
klientu paziņojumi (Printful/Gelato iestatījumos, Printify API pasūtījumiem sūta pats); spēlētājs izsekošanu redz arī
*Profils → Mani pasūtījumi*. Pilna atmaksa Stripe: nenosūtītie tiek atcelti automātiski, nosūtītie atzīmēti
"jāpievērš uzmanība" — atcel tos piegādātāja panelī, ja vēl nav nodrukāti.

**Ja kaut kas nogāja greizi:** *Admin → Pasūtījumi → "Tikai problēmas"*. **↻ Mēģināt vēlreiz** — pēc kļūdas
labošanas; **✓ Atrisināts** — ja izdarīji ar roku (ar piezīmi); **Atcelt** — apturēt. Īslaicīgas kļūdas tiek
mēģinātas automātiski ~2 dienas (cron ik 10 min), tad nonāk "jāpievērš uzmanība".
