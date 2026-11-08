import { formatAmount, parseAmount } from "./money.ts";
import type { ApiTransfer, FxQuote } from "./nuvion.ts";

/** One line of the pay screen as the browser sends it: a contractor and a typed amount. */
export interface PayRow {
  contractorId: string;
  amount: string;
}

export interface PayPlan {
  rows: { contractorId: string; minor: number }[];
  total: number;
}

/**
 * Turns the typed rows into a plan. Blank amounts are skipped, a contractor may appear once, and the total
 * must fit the account's available balance. Throws a message the operator can act on.
 * Shortcut: the balance check ignores transfer fees, which Nuvion only reports once the transfer exists; Nuvion rejects any shortfall.
 */
export function planBatch(rows: PayRow[], available: number, currency: string): PayPlan {
  const seen = new Set<string>();
  const out: PayPlan["rows"] = [];
  for (const r of rows) {
    if (!r.amount.trim()) continue;
    if (seen.has(r.contractorId)) throw new Error("A contractor can appear only once in a batch.");
    seen.add(r.contractorId);
    const minor = parseAmount(r.amount);
    if (!minor) throw new Error("Amounts must be greater than zero with at most 2 decimals.");
    out.push({ contractorId: r.contractorId, minor });
  }
  if (out.length === 0) throw new Error("Enter an amount for at least one contractor.");
  const total = out.reduce((s, r) => s + r.minor, 0);
  if (total > available) throw new Error(`The batch totals ${formatAmount(total, currency)} but ${formatAmount(available, currency)} is available.`);
  return { rows: out, total };
}

/** Whole seconds a quote stays usable, never negative. */
export const secondsLeft = (expiresAt: number, now: number) => Math.max(0, Math.round((expiresAt - now) / 1000));

/** The transfer reference is derived from the quote, and a quote can be used once, so a double click can't pay twice. */
export const referenceFor = (quoteId: string) => `payroll-${quoteId}`;

export interface BatchResult {
  contractorId: string;
  ok: boolean;
  transferId?: string;
  error?: string;
}

export function summarize(results: BatchResult[]) {
  const paid = results.filter((r) => r.ok).length;
  return { paid, failed: results.length - paid };
}

export interface Step {
  label: string;
  detail: string;
  at: number;
  state: "done" | "current" | "failed";
}

/**
 * The payment's timeline from what the API exposes: the locked quote, the transfer's creation and its current
 * status. Nuvion keeps no per-step history, so intermediate states that came and went aren't shown.
 */
export function timeline(t: ApiTransfer, quote: FxQuote | null): Step[] {
  const steps: Step[] = [];
  if (quote) steps.push({ label: "Rate locked", detail: `1 ${quote.from} = ${quote.rate} ${quote.to}`, at: quote.created, state: "done" });
  const created = t.status === "new";
  steps.push({ label: "Payment created", detail: `${formatAmount(t.amount, t.currency)} debited from the account once processed`, at: t.created, state: created ? "current" : "done" });
  if (t.status === "pending") steps.push({ label: "Sent to the payment network", detail: t.status_reason ?? "In progress", at: t.updated, state: "current" });
  if (t.status === "successful") steps.push({ label: "Delivered", detail: "The contractor's bank has the funds", at: t.updated, state: "done" });
  if (t.status === "failed") steps.push({ label: "Failed", detail: t.status_reason ?? "The payment could not be completed", at: t.updated, state: "failed" });
  return steps;
}
