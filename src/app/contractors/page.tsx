import type { Metadata } from "next";
import { Suspense } from "react";
import { ContractorForm } from "@/components/contractor-form";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CORRIDORS } from "@/lib/corridors";
import { listContractors } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "Contractors" };

export default function ContractorsPage() {
  return (
    <PageShell title="Contractors" intro="Each contractor is a Nuvion counterparty with bank details attached as a payment detail. Add them once and pay them as often as you like.">
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
      <Card>
        <CardHeader><CardTitle>Your contractors</CardTitle></CardHeader>
        <CardContent>
          {contractors.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet. Add your first below.</p>
          ) : (
            <ul className="divide-y text-sm">
              {contractors.map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-3">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-muted-foreground">{CORRIDORS[c.corridor].label} · {c.bank} ••{c.last4}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
