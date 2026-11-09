import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CORRIDORS } from "@/lib/corridors";
import { formatAmount, formatDate } from "@/lib/money";
import { latestByPayee } from "@/lib/people";
import { listContractors, loadTransfers } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <PageShell title="People" intro="Each person's latest payout status across every run, one-off or from a CSV.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Rows />
      </Suspense>
    </PageShell>
  );
}

async function Rows() {
  const [contractors, transfers] = await Promise.all([listContractors(), loadTransfers(100)]);
  const status = latestByPayee(contractors.map((c) => c.id), transfers);
  const unsettled = [...status.values()].some((s) => s.latest?.status === "new" || s.latest?.status === "pending");

  return (
    <Card>
      {unsettled && <AutoRefresh />}
      <CardContent className="overflow-x-auto">
        {contractors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one yet. <Link href="/pay/upload" className="underline underline-offset-4">Upload a pay run</Link> or <Link href="/contractors" className="underline underline-offset-4">add a contractor</Link>.</p>
        ) : (
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Person</th>
                <th className="py-2 pr-4 font-medium">Latest payout</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Payouts</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((c) => {
                const s = status.get(c.id)!;
                return (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <span className="block font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{CORRIDORS[c.corridor].currency} · {c.bank} ••{c.last4}</span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {s.latest ? <Link href={`/payments/${s.latest.id}`} className="underline-offset-4 hover:underline"><span className="tabular-nums">{formatAmount(s.latest.amount, s.latest.currency)}</span> · {formatDate(s.latest.created)}</Link> : <span className="text-muted-foreground">Never paid</span>}
                    </td>
                    <td className="py-3 pr-4">{s.latest ? <StatusBadge status={s.latest.status} /> : <span className="text-muted-foreground">None</span>}</td>
                    <td className="py-3 text-right tabular-nums">{s.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Based on the 100 most recent transfers.</p>
      </CardContent>
    </Card>
  );
}
