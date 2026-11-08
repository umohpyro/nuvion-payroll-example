import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatDate } from "@/lib/money";
import { listContractors, loadTransfers } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <PageShell title="Payments" intro="Every contractor payment from this entity. Open one to see its timeline.">
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
  const unsettled = payments.some((t) => t.status === "new" || t.status === "pending");

  return (
    <Card>
      {unsettled && <AutoRefresh />}
      <CardContent className="overflow-x-auto">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet. <Link href="/pay" className="underline underline-offset-4">Pay a contractor</Link>.</p>
        ) : (
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">Contractor</th>
                <th className="py-2 pr-4 text-right font-medium">Sent</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap"><Link href={`/payments/${t.id}`} className="underline-offset-4 hover:underline">{formatDate(t.created)}</Link></td>
                  <td className="py-3 pr-4">{name(t.counterparty_id)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatAmount(t.amount, t.currency)}</td>
                  <td className="py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
