import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { PayForm } from "@/components/pay-form";
import { Skeleton } from "@/components/ui/skeleton";
import { listAccounts, listContractors } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "Pay contractors" };

export default function PayPage() {
  return (
    <PageShell eyebrow="Payroll · Pay" title="Pay contractors" intro="Enter an amount for one contractor or several. You see each contractor's FX quote and the amount they receive before anything is sent.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Pay />
      </Suspense>
    </PageShell>
  );
}

async function Pay() {
  const [accounts, contractors] = await Promise.all([listAccounts(), listContractors()]);
  const funded = accounts.filter((a) => a.balance.available > 0);
  if (contractors.length === 0) return <p className="text-sm text-muted-foreground">Add a contractor first on the <Link href="/contractors" className="underline underline-offset-4">Contractors</Link> page.</p>;
  if (funded.length === 0) return <p className="text-sm text-muted-foreground">None of this entity&apos;s accounts has an available balance. Fund an account in your sandbox dashboard, then come back.</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Paying many people? <Link href="/pay/upload" className="font-semibold text-c-text underline underline-offset-4">Upload a CSV pay run</Link>.</p>
      <PayForm
        accounts={funded.map((a) => ({ id: a.id, label: a.display_name, currency: a.currency, availableMinor: a.balance.available }))}
        contractors={contractors.map((c) => ({ id: c.id, name: c.name, corridor: c.corridor, bank: c.bank, last4: c.last4 }))}
      />
    </div>
  );
}
