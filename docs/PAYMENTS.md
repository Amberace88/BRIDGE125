# Diamonds payments — owner setup (Stripe Checkout)

Bridge 125 sells **Diamonds** (💎, premium currency) through **Stripe Checkout**. The code is finished; payments stay
switched off ("Payments coming soon") until the three secrets below exist. No secret is ever stored in the repo.

| Pack      | Diamonds | Bonus | Price (VAT incl.) |
|-----------|---------:|------:|------------------:|
| `dm_100`  |      100 |     — |             €0.99 |
| `dm_550`  |      550 |  +10% |             €4.99 |
| `dm_1200` |    1 200 |  +20% |             €9.99 |
| `dm_2600` |    2 600 |  +30% |            €19.99 |
| `dm_7000` |    7 000 |  +40% |            €49.99 |

Prices live in two places that a unit test keeps in sync: `src/social/gifts.ts` (`DIAMOND_PACKS`) and
`public.diamond_packs` (`supabase/migration_010_social.sql`). The Worker builds each Checkout line item from the pack
(`price_data`), so **you do not need to create Products or Prices in Stripe**.

## How it works

1. The player taps **Buy** → `POST /api/pay/checkout` (the Worker checks the player's Supabase session) → the Worker
   creates a Checkout Session and the browser goes to `checkout.stripe.com`.
2. After paying, Stripe sends `checkout.session.completed` to `https://bridge125.com/api/pay/webhook`.
3. The Worker verifies the `Stripe-Signature` header (HMAC-SHA256, constant-time compare, 5-minute timestamp
   tolerance) and calls `credit_diamonds()` in Supabase with the service-role key. The credit is idempotent on the
   Checkout session id (Stripe retries never credit twice), the Diamonds come from `diamond_packs` (never from the
   request), and the amount paid must cover the pack price.
4. The player lands on `/?pay=ok`, sees "Payment received", and the balance refreshes.
5. A full refund in the Stripe dashboard sends `charge.refunded` → `refund_payment()` removes those Diamonds (down to
   0 if some were already spent) and marks the purchase **Refunded** in the player's purchase history.

## Step by step

### 0. Database (once)
Run `supabase/migration_010_social.sql` in the Supabase SQL editor (after 001–009; safe to re-run).

### 1. Stripe account
1. Create an account at <https://dashboard.stripe.com/register> (business: your SL, country Spain, currency EUR).
2. Complete **Settings → Business details** and **Payouts** (bank account) — needed before live payments.
3. Optional: **Settings → Tax → Stripe Tax** (activate, add your Spanish VAT registration and OSS if you sell to other
   EU countries). Then set `STRIPE_AUTOMATIC_TAX` to `"1"` in `wrangler.jsonc`. Prices are configured as
   VAT-inclusive (`tax_behavior: inclusive`), so the player always pays exactly the shown price.
4. **Settings → Checkout and Payment Links → Branding**: logo, brand colour `#C9A54C`, background `#0B3E33`.

### 2. API key
**Developers → API keys** → copy the **Secret key** (`sk_test_…` in test mode, later `sk_live_…`).
A *restricted* key also works: grant **Checkout Sessions: Write** only.

### 3. Webhook
**Developers → Webhooks → Add endpoint**
- Endpoint URL: `https://bridge125.com/api/pay/webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`
- After saving, reveal the **Signing secret** (`whsec_…`).

### 4. Supabase service-role key
Supabase dashboard → **Project Settings → API Keys** → copy the **secret** key (`sb_secret_…`) or the legacy
**service_role** key (`eyJ…`). Both work. It is used only by the Worker, only for `credit_diamonds` and
`refund_payment` (those functions are not callable by players).

### 5. Put the three secrets on the Worker
From the repo folder (Wrangler asks for each value; nothing is written to disk):

```bash
npx wrangler secret put STRIPE_SECRET_KEY          # sk_test_… (later sk_live_…)
npx wrangler secret put STRIPE_WEBHOOK_SECRET      # whsec_…
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY  # sb_secret_… or the service_role key
```

Or in the Cloudflare dashboard: **Workers & Pages → bridge125 → Settings → Variables and Secrets → Add → Secret**.
The public values (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PUBLIC_ORIGIN`, `STRIPE_AUTOMATIC_TAX`) are already in
`wrangler.jsonc`.

Check: `https://bridge125.com/api/pay/status` must answer `{"enabled":true}`. The Shop's Diamonds tab then shows
**Buy** buttons instead of "Payments coming soon".

### 6. Test (test mode)
1. Sign in, open **Shop → Diamonds**, buy the €0.99 pack.
2. Card `4242 4242 4242 4242`, any future date, any CVC, any postcode.
   - 3-D Secure: `4000 0027 6000 3184` · declined: `4000 0000 0000 0002`
3. Back on the site: toast "Payment received", balance +100 💎, **Profile → Wallet → Purchase history** shows it.
4. Stripe → **Developers → Webhooks → your endpoint** shows a `200` delivery. A `400 signature` means the
   `whsec_` secret is wrong; a `500 credit` means the service-role key or migration 010 is missing.
5. Refund the test payment in Stripe → the Diamonds disappear and the purchase shows **Refunded**.

Local testing: `stripe listen --forward-to http://127.0.0.1:8787/api/pay/webhook` prints a temporary `whsec_…`; put
it in `.dev.vars` (`STRIPE_WEBHOOK_SECRET=…`, never commit that file) together with the two other secrets.

### 7. Go live
Activate the account in Stripe, switch the dashboard to **Live**, create the live webhook (same URL, same events) and
replace both Stripe secrets with the live ones (`wrangler secret put …` again). Nothing else changes.

## Compliance notes (already built in)
- **No loot boxes**: every purchase names exactly what it gives; gifts are fixed items with fixed prices.
- **Clear prices incl. VAT** on every pack card ("Prices include VAT").
- **Purchase history** with refunds in the Profile wallet (`<WalletPanel />`), plus every Diamond movement.
- **Withdrawal / refunds**: digital content delivered instantly — the shop states that the EU 14-day withdrawal right
  ends once delivery starts, and gives `hello@bridge125.com` for mistakes. Add the same sentence to your Terms page.
- Admin and god accounts get gifts free for testing (recorded as `admin = true`, never counted as revenue) and can
  add test Diamonds with `select public.admin_grant_diamonds('<user uuid>', 500);` (god: only to themselves).
- Chat reports land in `public.chat_reports`; read them with `select * from public.admin_chat_reports(100, true);`
  and close one with `select public.admin_resolve_report(<id>, 'actioned');`.
