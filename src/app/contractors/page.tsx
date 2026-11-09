import type { Metadata } from "next";
import { Suspense } from "react";
import { ContractorForm } from "@/components/contractor-form";
import { Ledger, LedgerRow } from "@/components/ledger";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CORRIDORS } from "@/lib/corridors";
import { listContractors } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "Contractors" };

export default function ContractorsPage() {
  return (
    <PageShell eyebrow="Payroll · Contractors" title="Contractors" intro="Each contractor is a Nuvion counterparty with bank details attached as a payment detail. Add them once and pay them as often as you like.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Book />
      </Suspense>
    </PageShell>
  );
}

async function Book() {
  const contractors = await listContractors();
  return (
    <div className="space-y-6">
      {contractors.length === 0 ? (
        <p className="rounded-[22px] bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">None yet. Add your first below.</p>
      ) : (
        <Ledger title="Your contractors" count={`${contractors.length}`}>
          {contractors.map((c) => (
            <LedgerRow key={c.id} name={c.name} sub={`${CORRIDORS[c.corridor].label} · ${c.bank} ••${c.last4}`} />
          ))}
        </Ledger>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Add a contractor</CardTitle>
          <CardDescription>The bank details are checked against the rail before they are saved. Use fictional test data; this is the sandbox.</CardDescription>
        </CardHeader>
        <CardContent><ContractorForm /></CardContent>
      </Card>
    </div>
  );
}
