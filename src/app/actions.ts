"use server";

import { z } from "zod";
import { CORRIDOR_IDS, CORRIDORS, routingProblem, type CorridorId } from "@/lib/corridors";
import { getConfig } from "@/lib/config";
import { ConfigError } from "@/lib/env";
import { UserError } from "@/lib/errors";
import { formatAmount } from "@/lib/money";
import { NuvionError, nuvion, type ApiTransfer, type BankCode, type FxQuote } from "@/lib/nuvion";
import { planBatch, referenceFor, type BatchResult } from "@/lib/payroll";
import { createContractor, getQuoteById, listAccounts, listContractors, paymentDetailFor } from "@/lib/payroll-api";

/*
 * Server Actions are public POST endpoints, so every input is validated here. The browser sends IDs and typed
 * amounts; currencies, rates and bank details are read back from Nuvion.
 */

export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string; code?: string };

async function guard<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof NuvionError) return { ok: false, error: friendly(e), code: e.type };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check your input." };
    if (e instanceof UserError) return { ok: false, error: e.message };
    if (e instanceof ConfigError) return { ok: false, error: `${e.message} Connect your sandbox on the Settings page.`, code: "config" };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Turns Nuvion error types into sentences an operator can act on. */
function friendly(e: NuvionError): string {
  switch (e.type) {
    case "error_transfer_insufficient_funds":
      return e.message;
    case "error_fx_quote_used":
      return "This quote was already used. Get a new one.";
    case "error_fx_quote_amount_mismatch":
      return "The amount no longer matches the quote. Get a new one.";
    case "error_duplicate_resource":
      return "This payment was already submitted. Check Payments before trying again.";
    case "error_system_dependency_unavailable":
      return "Nuvion could not reach a provider. Wait a moment and try again.";
    default:
      return e.summary;
  }
}

const id = z.string().regex(/^[0-9A-Z]{26}$/, "Invalid ID.");
const text = (label: string, max = 60) => z.string().trim().min(1, `Enter ${label}.`).max(max);

/* ---------------- Contractors ---------------- */

const contractorSchema = z.object({
  firstName: text("a first name"),
  lastName: text("a last name"),
  email: z.string().trim().email("Enter a valid email.").max(120),
  line1: text("a street address", 80),
  city: text("a city"),
  postcode: text("a postcode", 12),
  corridor: z.enum(CORRIDOR_IDS as [CorridorId, ...CorridorId[]]),
  routing: z.object({
    country: z.string().optional(),
    sortCode: z.string().optional(),
    accountNumber: z.string().optional(),
    iban: z.string().optional(),
    swiftBic: z.string().optional(),
    bankCode: z.string().optional(),
    bankName: z.string().max(80).optional(),
  }),
});

export async function addContractor(input: z.input<typeof contractorSchema>) {
  return guard(async () => {
    const v = contractorSchema.parse(input);
    const bad = routingProblem(v.corridor, v.routing);
    if (bad) throw new UserError(bad);
    await createContractor(v);
    return {};
  });
}

/** The Nigerian bank directory, so the operator picks a bank instead of typing a code. Not paginated, about 540 rows. */
export async function loadBanks() {
  return guard(async () => {
    const r = await nuvion<BankCode[]>("GET", "/bank-codes/NG");
    return { banks: r.filter((b) => b.bank_code).map((b) => ({ code: b.bank_code!, name: b.bank_name })) };
  });
}

/* ---------------- Quotes ---------------- */

const quotesSchema = z.object({
  accountId: id,
  rows: z.array(z.object({ contractorId: id, amount: z.string().max(20) })).min(1).max(20),
});

export interface QuoteView {
  id: string;
  rate: number;
  amountFrom: number;
  amountTo: number;
  toCurrency: string;
  expiresAt: number;
}
export type RowQuote = { contractorId: string } & ({ ok: true; quote: QuoteView } | { ok: false; error: string });

/** One FX quote per contractor, each locked for its own window. A row that fails keeps the others usable. */
export async function getQuotes(input: z.input<typeof quotesSchema>) {
  return guard(async () => {
    const v = quotesSchema.parse(input);
    const [accounts, contractors, entity] = await Promise.all([listAccounts(), listContractors(), getConfig().then((c) => c.entityId)]);
    const account = accounts.find((a) => a.id === v.accountId);
    if (!account) throw new UserError("Choose an account to pay from.");
    let plan;
    try {
      plan = planBatch(v.rows, account.balance.available, account.currency);
    } catch (e) {
      throw new UserError((e as Error).message);
    }

    const quotes: RowQuote[] = await Promise.all(
      plan.rows.map(async (row): Promise<RowQuote> => {
        const c = contractors.find((x) => x.id === row.contractorId);
        if (!c) return { contractorId: row.contractorId, ok: false, error: "That contractor no longer exists." };
        const to = CORRIDORS[c.corridor].currency;
        if (to === account.currency) return { contractorId: c.id, ok: false, error: `This account is in ${to}. Pick an account in another currency.` };
        try {
          const q = await nuvion<FxQuote>("POST", "/fx-quotes", { entity_id: entity, from_currency: account.currency, to_currency: to, amount_from: row.minor, account_id: account.id });
          return { contractorId: c.id, ok: true, quote: { id: q.id, rate: q.rate, amountFrom: q.amount_from, amountTo: q.amount_to, toCurrency: q.to, expiresAt: q.quote.expires_at } };
        } catch (e) {
          return { contractorId: c.id, ok: false, error: e instanceof NuvionError ? friendly(e) : "Could not get a quote." };
        }
      }),
    );
    return { quotes };
  });
}

/* ---------------- Pay ---------------- */

const paySchema = z.object({ accountId: id, items: z.array(z.object({ contractorId: id, quoteId: id })).min(1).max(20) });

/**
 * Pays each contractor in turn. Every quote is re-read from Nuvion: it must be active and match the account and
 * the contractor's currency, and its ID makes the transfer reference, so a quote can pay out once.
 * One failure does not stop the rest; the result lists each contractor.
 */
export async function payBatch(input: z.input<typeof paySchema>) {
  return guard(async () => {
    const v = paySchema.parse(input);
    const [accounts, contractors, entity] = await Promise.all([listAccounts(), listContractors(), getConfig().then((c) => c.entityId)]);
    const account = accounts.find((a) => a.id === v.accountId);
    if (!account) throw new UserError("Choose an account to pay from.");
    let remaining = account.balance.available;
    const results: BatchResult[] = [];

    for (const item of v.items) {
      const fail = (error: string) => void results.push({ contractorId: item.contractorId, ok: false, error });
      try {
        const c = contractors.find((x) => x.id === item.contractorId);
        if (!c) { fail("That contractor no longer exists."); continue; }
        const quote = await getQuoteById(item.quoteId);
        if (quote.quote.status !== "active") { fail("The quote expired or was already used. Get a new one."); continue; }
        if (quote.from !== account.currency || quote.to !== CORRIDORS[c.corridor].currency) { fail("The quote does not match this account and contractor."); continue; }
        if (quote.amount_from > remaining) { fail(`Only ${formatAmount(remaining, account.currency)} is left for this payment.`); continue; }
        const detail = await paymentDetailFor(c);
        if (!detail) { fail("This contractor has no bank details in this currency."); continue; }
        const t = await nuvion<ApiTransfer>("POST", "/transfers", {
          entity_id: entity,
          account_id: account.id,
          payment_detail_id: detail,
          counterparty_id: c.id,
          amount: quote.amount_from,
          currency: account.currency,
          narration: `Contractor payment: ${c.name}`,
          payment_type: "bank-transfer",
          unique_reference: referenceFor(quote.id),
          fx_quote_id: quote.id,
        });
        remaining -= quote.amount_from + t.applicable_fee;
        results.push({ contractorId: c.id, ok: true, transferId: t.id });
      } catch (e) {
        fail(e instanceof NuvionError ? friendly(e) : "Something went wrong.");
      }
    }
    return { results };
  });
}
