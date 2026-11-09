"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getQuotes, payBatch, type RowQuote } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CORRIDORS, type CorridorId } from "@/lib/corridors";
import { formatAmount, parseAmount } from "@/lib/money";
import { secondsLeft, summarize, type BatchResult } from "@/lib/payroll";

export interface AccountOption { id: string; label: string; currency: string; availableMinor: number }
export interface ContractorOption { id: string; name: string; corridor: CorridorId; bank: string; last4: string }

export function PayForm({ accounts, contractors }: { accounts: AccountOption[]; contractors: ContractorOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<RowQuote[] | null>(null);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const account = accounts.find((a) => a.id === accountId);

  useEffect(() => {
    if (!quotes) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [quotes]);

  const good = (quotes ?? []).flatMap((q) => (q.ok ? [{ contractorId: q.contractorId, quote: q.quote }] : []));
  const expired = good.some((g) => secondsLeft(g.quote.expiresAt, now) === 0);
  const soonest = good.length ? Math.min(...good.map((g) => secondsLeft(g.quote.expiresAt, now))) : 0;
  const total = good.reduce((s, g) => s + g.quote.amountFrom, 0);
  const typed = contractors.filter((c) => parseAmount(amounts[c.id] ?? ""));
  const name = (id: string) => contractors.find((c) => c.id === id)?.name ?? "Contractor";
  const reset = () => { setQuotes(null); setResults(null); };

  if (results) {
    const { paid, failed } = summarize(results);
    return (
      <div className="space-y-4" aria-live="polite">
        <p className="text-lg font-bold">{paid} submitted{failed ? `, ${failed} not submitted` : ""}</p>
        <p className="text-sm text-muted-foreground">Submitted means Nuvion accepted the transfer. Open a payment to follow it until it is paid or failed.</p>
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {results.map((r) => (
            <li key={r.contractorId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="font-medium">{name(r.contractorId)}</span>
              {r.ok ? <Link href={`/payments/${r.transferId}`} className="font-semibold text-c-text underline underline-offset-4">View payment</Link> : <span className="text-destructive">{r.error}</span>}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link href="/payments" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground">All payments</Link>
          <Button variant="outline" onClick={() => { setAmounts({}); reset(); }}>Pay more</Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (quotes && !expired && good.length) {
            const r = await payBatch({ accountId, items: good.map((g) => ({ contractorId: g.contractorId, quoteId: g.quote.id })) });
            if (!r.ok) return void toast.error(r.error);
            if (r.results.length === 1 && r.results[0].ok) return void router.push(`/payments/${r.results[0].transferId}`);
            setResults(r.results);
            return;
          }
          const r = await getQuotes({ accountId, rows: contractors.map((c) => ({ contractorId: c.id, amount: amounts[c.id] ?? "" })) });
          if (!r.ok) return void toast.error(r.error);
          setQuotes(r.quotes);
          setNow(Date.now());
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="pay-from">Pay from</Label>
        <NativeSelect id="pay-from" className="max-w-md" value={accountId} onChange={(e) => { setAccountId(e.target.value); reset(); }}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label} · {formatAmount(a.availableMinor, a.currency)}</option>)}
        </NativeSelect>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Amounts to send{account ? ` (${account.currency})` : ""}</p>
        <p className="mb-3 text-sm text-muted-foreground">Leave a contractor blank to skip them. One filled row is a single payment; several make a batch.</p>
        <ul className="divide-y rounded-xl border bg-card">
          {contractors.map((c) => {
            const q = quotes?.find((x) => x.contractorId === c.id);
            return (
              <li key={c.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">{CORRIDORS[c.corridor].currency} · {c.bank} ••{c.last4}</span>
                  </span>
                  <AmountInput
                    aria-label={`Amount for ${c.name}`}
                    value={amounts[c.id] ?? ""}
                    onValue={(v) => { setAmounts({ ...amounts, [c.id]: v }); reset(); }}
                    placeholder="0.00"
                  />
                </div>
                {q?.ok && (
                  <p className="rounded-lg bg-secondary px-3 py-2 text-sm" aria-live="polite">
                    {c.name} receives <strong className="tabular-nums">{formatAmount(q.quote.amountTo, q.quote.toCurrency)}</strong> at 1 {account?.currency} = {q.quote.rate} {q.quote.toCurrency}
                    <span className="text-muted-foreground"> · {secondsLeft(q.quote.expiresAt, now) === 0 ? "expired" : `locked for ${secondsLeft(q.quote.expiresAt, now)}s`}</span>
                  </p>
                )}
                {q && !q.ok && <p className="text-sm text-destructive">{q.error}</p>}
              </li>
            );
          })}
        </ul>
      </div>

      {quotes && good.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {good.length} payment{good.length === 1 ? "" : "s"} totalling <strong className="text-foreground">{formatAmount(total, account?.currency ?? "USD")}</strong>
          {expired ? ". A quote expired. Get new quotes." : `. Shortest lock: ${soonest}s. A transfer fee may apply and shows on each payment.`}
        </p>
      )}

      <Button type="submit" size="lg" className="h-11 rounded-full px-6" disabled={pending || typed.length === 0}>
        {pending ? "Working…" : quotes && !expired && good.length ? `Pay ${good.length} contractor${good.length === 1 ? "" : "s"}` : quotes ? "Get new quotes" : "Get quotes"}
      </Button>
    </form>
  );
}
