import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatDate } from "@/lib/money";
import { NuvionError, nuvion, type ApiTransfer, type FxQuote } from "@/lib/nuvion";
import { timeline } from "@/lib/payroll";
import { getConfig } from "@/lib/config";
import { getQuoteById, listContractors } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "Payment" };

export default function PaymentPage({ params }: PageProps<"/payments/[id]">) {
  return (
    <PageShell title="Payment" intro="Read from Nuvion on every visit, so it always shows the current state.">
      <Suspense fallback={<Skeleton className="h-64 w-full max-w-2xl" />}>
        <Payment params={params} />
      </Suspense>
    </PageShell>
  );
}

const DOT = { done: "bg-ok", current: "bg-warn", failed: "bg-destructive" } as const;

async function Payment({ params }: { params: PageProps<"/payments/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9A-Z]{26}$/.test(id)) notFound();

  let t: ApiTransfer;
  try {
    t = await nuvion<ApiTransfer>("GET", `/transfers/${id}?entity_id=${(await getConfig()).entityId}`);
  } catch (e) {
    if (e instanceof NuvionError && e.httpStatus === 404) notFound();
    throw e;
  }
  const quoteId = t.meta?.fx_quote_id;
  const [quote, contractors] = await Promise.all([
    quoteId ? getQuoteById(quoteId).catch((): FxQuote | null => null) : Promise.resolve(null),
    listContractors(),
  ]);
  const who = contractors.find((c) => c.id === t.counterparty_id)?.name ?? "Contractor";
  const steps = timeline(t, quote);
  const unsettled = t.status === "new" || t.status === "pending";

  return (
    <Card className="max-w-2xl">
      {unsettled && <AutoRefresh />}
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3 text-2xl">
          <span className="tabular-nums">{formatAmount(t.amount, t.currency)}</span> <StatusBadge status={t.status} />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          To {who}
          {quote ? <> · they receive <strong className="text-foreground tabular-nums">{formatAmount(quote.amount_to, quote.to)}</strong></> : null}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {unsettled && <p className="text-muted-foreground">Still processing. This page refreshes on its own.</p>}
        <ol aria-label="Payment timeline" className="space-y-0">
          {steps.map((s, i) => (
            <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
              {i < steps.length - 1 && <span className="absolute top-5 bottom-0 left-[7px] w-px bg-border" aria-hidden />}
              <span className={`mt-1 size-4 shrink-0 rounded-full ${DOT[s.state]}`} aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{s.label}</p>
                <p className="text-muted-foreground">{s.detail}</p>
                <p className="text-xs text-muted-foreground">{formatDate(s.at)}</p>
              </div>
            </li>
          ))}
        </ol>
        <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Narration</dt><dd>{t.narration}</dd>
          <dt className="text-muted-foreground">Fee</dt><dd className="tabular-nums">{formatAmount(t.applicable_fee, t.currency)}</dd>
          <dt className="text-muted-foreground">Reference</dt><dd className="break-all font-mono">{t.unique_reference}</dd>
          <dt className="text-muted-foreground">Transfer ID</dt><dd className="break-all font-mono">{t.id}</dd>
        </dl>
        <Link href="/payments" className="inline-block underline underline-offset-4">Back to payments</Link>
      </CardContent>
    </Card>
  );
}
