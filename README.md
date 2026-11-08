# Nuvion contractor payroll example

A small payroll app that pays contractors in other countries through [Nuvion](https://docs.nuvion.co). Add contractors, see an FX quote before paying, pay one contractor or a batch, and follow a timeline for each payment. It has **no database**: Nuvion holds all state. It runs on Next.js 16, React 19, Tailwind CSS 4 and shadcn/ui.

Live demo: https://payroll.umoh.name.ng (bring your own sandbox key).

## What it shows

| Page | What it demonstrates | Nuvion calls |
|---|---|---|
| Overview `/` | Account balances, contractor count, recent payments | `GET /accounts`, `GET /counterparties`, `GET /transfers` |
| Contractors `/contractors` | A contractor is an individual counterparty plus a bank payment detail, validated per rail | `POST /counterparties`, `POST /payment-details`, `GET /bank-codes/NG` |
| Pay `/pay` | One FX quote per contractor, the amount they receive, a countdown, then pay one or a batch | `POST /fx-quotes`, `GET /fx-quotes/{id}`, `POST /transfers` (`bank-transfer` with `fx_quote_id`) |
| Payments `/payments` | Payment list and a timeline per payment | `GET /transfers`, `GET /transfers/{id}` |
| Settings `/settings` | Bring your own key: look up your approved entities and connect one | `GET /entities`, `GET /accounts` |

Supported contractor corridors: United Kingdom (GBP, Faster Payments), euro area (EUR, SEPA) and Nigeria (NGN, NIP). Each uses the routing fields documented in [Send a Payout](https://docs.nuvion.co/guides/send-a-payout).

## Run it

Nothing about your Nuvion account is stored on the server or shared between visitors: each visitor connects their own sandbox on the **Settings** page, and everything runs in their own tenant, so you can confirm it in your own dashboard.

You need Node.js 20.9 or later, a Nuvion **sandbox** account, an approved entity, and an account on that entity with an available balance (for example USD).

```bash
npm install
npm run dev
```

Open http://localhost:3000/settings, paste your sandbox API key (from the sandbox dashboard, [Settings > Developers](https://app.nuvion.dev/dashboard/settings); see [how API keys work](https://docs.nuvion.co/authentication)), pick an approved entity and connect. Your key is sealed in an `httpOnly` cookie that expires after eight hours.

| Variable | Description |
|---|---|
| `SESSION_SECRET` | Required in production: a long random string that seals the cookie. Local development generates one for you |
| `PUBLIC_APP_URL` | Optional. The public URL, used for the Open Graph image |
| `NUVION_API_URL` | Optional. Must be a `*.nuvion.dev` host |

## How a payment works

1. **Contractor.** `POST /counterparties` with `type: individual` and the contractor's address, then `POST /payment-details` with the rail's routing fields. The app stores the corridor, bank and last four digits in the counterparty's `meta`, so the list needs no database. If the payment detail fails, the counterparty is deactivated.
2. **Quote.** `POST /fx-quotes` with `from_currency` set to the paying account's currency, `to_currency` set to the contractor's, `amount_from` and the `account_id` to debit. The page shows the rate, what the contractor receives and how long the lock lasts.
3. **Pay.** `POST /transfers` with `payment_type: bank-transfer`, the contractor's `payment_detail_id` and `counterparty_id`, the quote's `amount_from` and `fx_quote_id`. The action re-reads each quote first and checks it is `active` and matches the account and the contractor's currency. `unique_reference` is derived from the quote ID, so a double click can't pay twice.
4. **Batch.** A batch is one quote and one transfer per contractor, run in turn. One failure does not stop the others, and the result lists each contractor.
5. **Timeline.** The payment page reads the transfer and its quote on every visit and refreshes while the transfer is `new` or `pending`.

## What the sandbox can and can't do

Run against `https://api.nuvion.dev` in other Nuvion examples: FX quotes and the counterparty, payment detail and transfer calls work, but bank payouts do not settle. A payout is created as `new`, then ends `failed` within seconds (for example with `invalid_payment_request`), and the `applicable_fee` it reports is not debited. So the timeline for a sandbox payment normally ends at **Failed** with Nuvion's reason, and the app shows that as it is. This repository has not been run end to end with a real key.

## Things to know

- **A quote locks one rate for a short window and can be used once.** `valid_for` varies per quote, so the page counts down from `quote.expires_at`.
- **Amounts are integers in the smallest unit,** so `1250` is 12.50. Typed amounts are parsed once, at the edge.
- **Fees are known only after the transfer exists.** `applicable_fee` appears on the payment page. The batch check compares amounts to the available balance and lets Nuvion reject any shortfall with `error_transfer_insufficient_funds`.
- **Counterparties cannot be deleted** and creating one is not idempotent, so the app deactivates one it could not finish.
- **`search` on counterparties matches names only,** so the app prefixes contractor nicknames and reads `meta` back from the list.
- **There is no per-step payment history.** The timeline is built from the quote, the transfer's `created`, `updated`, `status` and `status_reason`.

## Before this is real payroll

- Webhooks (`outflows.*`) to track payments without polling.
- Real authentication, roles and an approval step for batches.
- More corridors, each with its own routing fields.
- Rate limiting and an audit trail on the server actions.

## How it is built

```
src/lib/nuvion.ts       Typed API client and error type
src/lib/payroll-api.ts  Contractors, accounts, transfers, payment details
src/lib/corridors.ts    Per-rail routing fields and validation
src/lib/payroll.ts      Batch plan, quote countdown, payment timeline
src/lib/config.ts       The visitor's key and entity, sealed in an httpOnly cookie
src/lib/seal.ts         AES-256-GCM seal and open
src/app/actions.ts      addContractor, getQuotes, payBatch server actions
src/app/payments/[id]   Payment timeline read from Nuvion
```

Server Actions are public endpoints, so each one validates its input with zod, takes only IDs and typed amounts from the browser, and reads currencies, rates and bank details back from Nuvion.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests for amounts, corridors, batches, the timeline and the cookie seal |
| `npm run typecheck` | Type-check |
| `npm run lint` | Lint |
