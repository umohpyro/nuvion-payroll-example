import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { RunUpload } from "@/components/run-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { COLUMNS, MAX_ROWS } from "@/lib/csv";
import { listAccounts } from "@/lib/payroll-api";

export const metadata: Metadata = { title: "Upload a pay run" };

export default function UploadPage() {
  return (
    <PageShell title="Upload a pay run" intro="Pay many people from one CSV. Every row is checked here before anything is sent, and you see each FX quote before you pay.">
      <div className="max-w-3xl space-y-6">
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">Use fake details only. File format</p>
          <p className="mt-2 text-muted-foreground">
            One row per person, up to {MAX_ROWS}. <code className="font-mono">currency</code> is the payout currency: GBP, EUR or NGN. Fill only the bank columns for that currency
            (GBP: <code className="font-mono">sort_code</code>, <code className="font-mono">account_number</code>; EUR: <code className="font-mono">country</code>, <code className="font-mono">iban</code>, <code className="font-mono">swift_bic</code>;
            NGN: <code className="font-mono">bank_code</code>, <code className="font-mono">account_number</code>). <code className="font-mono">amount</code> is in the currency of the account you pay from.
          </p>
          <p className="mt-2 break-words font-mono text-xs text-muted-foreground">{COLUMNS.join(",")}</p>
          <a href="/pay/upload/sample.csv" download className="mt-3 inline-block font-semibold text-pink-text underline underline-offset-4">Download a sample CSV</a>
          <span className="text-muted-foreground"> or </span>
          <Link href="/pay" className="underline underline-offset-4">pay people one at a time</Link>
        </div>
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <Upload />
        </Suspense>
      </div>
    </PageShell>
  );
}

async function Upload() {
  const accounts = (await listAccounts()).filter((a) => a.balance.available > 0);
  if (accounts.length === 0) return <p className="text-sm text-muted-foreground">None of this entity&apos;s accounts has an available balance. Fund an account in your sandbox dashboard, then come back.</p>;
  return <RunUpload accounts={accounts.map((a) => ({ id: a.id, label: a.display_name, currency: a.currency, availableMinor: a.balance.available }))} />;
}
