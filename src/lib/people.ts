import type { ApiTransfer } from "./nuvion.ts";

export interface PayeeStatus {
  /** The payee's most recent payout, or null when they have never been paid. */
  latest: ApiTransfer | null;
  /** How many payouts the loaded transfers hold for them. */
  count: number;
}

/**
 * Each payee's latest payout status across all runs. Transfers are matched to payees by counterparty ID and
 * compared by their `created` time, so the order Nuvion returns them in does not matter.
 */
export function latestByPayee(payeeIds: string[], transfers: ApiTransfer[]): Map<string, PayeeStatus> {
  const out = new Map<string, PayeeStatus>(payeeIds.map((id) => [id, { latest: null, count: 0 }]));
  for (const t of transfers) {
    if (t.type !== "outflow" || t.payment_type !== "bank-transfer" || !t.counterparty_id) continue;
    const s = out.get(t.counterparty_id);
    if (!s) continue;
    s.count++;
    if (!s.latest || t.created > s.latest.created) s.latest = t;
  }
  return out;
}

/** The reference for one row of one run. The run ID is made once per uploaded file, so a retry of the same run cannot pay twice. */
export const runReference = (runId: string, line: number) => `payroll-run-${runId}-${line}`;
export const isRunId = (v: string) => /^[a-f0-9]{12}$/.test(v);
