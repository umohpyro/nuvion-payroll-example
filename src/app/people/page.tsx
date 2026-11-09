import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { Ledger, LedgerRow } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { RunProgress } from "@/components/run-progress";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CORRIDORS } from "@/lib/corridors";
import { formatAmount, formatDate } from "@/lib/money";
import { latestByPayee } from "@/lib/people";
import { listContractors, loadTransfers } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <PageShell eyebrow="Payroll · People" title="People" intro="Each person's latest payout status across every run, one-off or from a CSV.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Rows />
      </Suspense>
    </PageShell>
  );
}

async function Rows() {
  const [contractors, transfers] = await Promise.all([listContractors(), loadTransfers(100)]);
  const status = latestByPayee(contractors.map((c) => c.id), transfers);
  const latest = contractors.map((c) => status.get(c.id)!.latest);
  const paid = latest.filter((t) => t?.status === "successful").length;
  const failed = latest.filter((t) => t?.status === "failed").length;
  const pending = latest.filter((t) => t?.status === "new" || t?.status === "pending").length;

  if (contractors.length === 0) {
    return <p className="rounded-[22px] bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">No one yet. <Link href="/pay/upload" className="font-semibold text-c-text underline underline-offset-4">Upload a pay run</Link> or <Link href="/contractors" className="font-semibold text-c-text underline underline-offset-4">add a contractor</Link>.</p>;
  }

  return (
    <div className="space-y-4">
      {pending > 0 && <AutoRefresh />}
      <section className="rounded-[22px] bg-card p-4 shadow-card ring-1 ring-foreground/10 sm:p-5">
        <h2 className="mb-3 text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">Latest payout, per person</h2>
        <RunProgress paid={paid} pending={pending} failed={failed} />
      </section>
      <Ledger title="Everyone you pay" count={`${contractors.length} ${contractors.length === 1 ? "person" : "people"}`}>
        {contractors.map((c) => {
          const s = status.get(c.id)!;
          const t = s.latest;
          return (
            <LedgerRow
              key={c.id}
              name={c.name}
              sub={`${CORRIDORS[c.corridor].currency} · ${c.bank} ••${c.last4} · ${s.count} ${s.count === 1 ? "payout" : "payouts"}`}
              href={t ? `/payments/${t.id}` : undefined}
              tone={!t ? "none" : t.status === "successful" ? "ok" : t.status === "failed" ? "bad" : "warn"}
              right={t
                ? <><span className="text-right"><span className="block font-bold tabular-nums">{formatAmount(t.amount, t.currency)}</span><span className="block text-xs text-muted-foreground">{formatDate(t.created)}</span></span><StatusBadge status={t.status} /></>
                : <span className="text-muted-foreground">Never paid</span>}
            />
          );
        })}
      </Ledger>
      <p className="text-xs text-muted-foreground">Based on the 100 most recent transfers.</p>
    </div>
  );
}
