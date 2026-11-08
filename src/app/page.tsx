import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatDate } from "@/lib/money";
import { listAccounts, listContractors, loadTransfers } from "@/lib/payroll-api";

export default function OverviewPage() {
  return (
    <PageShell title="Overview" intro="Pay contractors in other countries from one account. Add them once, see the FX quote before you pay, and follow every payment to the end.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Overview />
      </Suspense>
    </PageShell>
  );
}

async function Overview() {
  const [accounts, contractors, transfers] = await Promise.all([listAccounts(), listContractors(), loadTransfers(50)]);
  const payments = transfers.filter((t) => t.type === "outflow" && t.payment_type === "bank-transfer");
  const name = (id?: string) => contractors.find((c) => c.id === id)?.name ?? "Contractor";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardDescription>Accounts</CardDescription></CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">This entity has no accounts yet.</p>
            ) : (
              <ul className="divide-y">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate font-medium">{a.display_name}</span>
                    <span className="shrink-0 text-lg font-bold tabular-nums">{formatAmount(a.balance.available, a.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Contractors</CardDescription>
            <CardTitle className="text-3xl font-extrabold tabular-nums">{contractors.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/contractors" className={buttonVariants({ variant: "outline" })}>Manage contractors</Link>
            <Link href="/pay" className={buttonVariants()}>Pay contractors</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent payments</CardTitle>
          <Link href="/payments" className="text-sm underline underline-offset-4">View all</Link>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet. Add a contractor, then pay them.</p>
          ) : (
            <ul className="divide-y text-sm">
              {payments.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link href={`/payments/${t.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{name(t.counterparty_id)}</span>
                      <span className="block text-xs text-muted-foreground">{formatDate(t.created)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular-nums">{formatAmount(t.amount, t.currency)}</span>
                      <StatusBadge status={t.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
