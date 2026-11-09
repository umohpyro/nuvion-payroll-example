import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { Ledger, LedgerRow } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { RunProgress } from "@/components/run-progress";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatDate } from "@/lib/money";
import { listContractors, loadTransfers } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <PageShell eyebrow="Payroll · Payments" title="Payments" intro="Every contractor payment from this entity. Open one to see its timeline.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Rows />
      </Suspense>
    </PageShell>
  );
}

async function Rows() {
  const [transfers, contractors] = await Promise.all([loadTransfers(), listContractors()]);
  const payments = transfers.filter((t) => t.type === "outflow" && t.payment_type === "bank-transfer");
  const name = (id?: string) => contractors.find((c) => c.id === id)?.name ?? "Contractor";
  const paid = payments.filter((t) => t.status === "successful").length;
  const failed = payments.filter((t) => t.status === "failed").length;
  const pending = payments.length - paid - failed;

  if (payments.length === 0) {
    return <p className="rounded-[22px] bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">No payments yet. <Link href="/pay" className="font-semibold text-c-text underline underline-offset-4">Pay a contractor</Link>.</p>;
  }

  return (
    <div className="space-y-4">
      {pending > 0 && <AutoRefresh />}
      <section className="rounded-[22px] bg-card p-4 shadow-card ring-1 ring-foreground/10 sm:p-5">
        <h2 className="mb-3 text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">All payments</h2>
        <RunProgress paid={paid} pending={pending} failed={failed} />
      </section>
      <Ledger title="Payments, newest first" count={`${payments.length}`}>
        {payments.map((t) => (
          <LedgerRow
            key={t.id}
            name={name(t.counterparty_id)}
            sub={formatDate(t.created)}
            href={`/payments/${t.id}`}
            tone={t.status === "successful" ? "ok" : t.status === "failed" ? "bad" : "warn"}
            right={<><span className="font-bold tabular-nums">{formatAmount(t.amount, t.currency)}</span><StatusBadge status={t.status} /></>}
          />
        ))}
      </Ledger>
    </div>
  );
}
