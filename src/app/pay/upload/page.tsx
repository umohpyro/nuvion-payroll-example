import { Download } from "lucide-react";
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
    <PageShell eyebrow="Payroll · Pay run" title="Upload a pay run" intro="Pay many people from one CSV. Every row is checked here before anything is sent, and you see each FX quote before you pay.">
      <div className="space-y-6">
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <Upload />
        </Suspense>
        <details className="rounded-[22px] bg-card p-4 text-sm shadow-card ring-1 ring-foreground/10 sm:p-5">
          <summary className="cursor-pointer font-bold">File format and sample</summary>
          <p className="mt-3 font-semibold">Use fake details only.</p>
          <p className="mt-2 text-muted-foreground">
            One row per person, up to {MAX_ROWS}. <code className="font-mono">currency</code> is the payout currency: GBP, EUR or NGN. Fill only the bank columns for that currency
            (GBP: <code className="font-mono">sort_code</code>, <code className="font-mono">account_number</code>; EUR: <code className="font-mono">country</code>, <code className="font-mono">iban</code>, <code className="font-mono">swift_bic</code>;
            NGN: <code className="font-mono">bank_code</code>, <code className="font-mono">account_number</code>). <code className="font-mono">amount</code> is in the currency of the account you pay from.
          </p>
          <p className="mt-2 break-words font-mono text-xs text-muted-foreground">{COLUMNS.join(",")}</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-2">
            <a href="/pay/upload/sample.csv" download className="inline-flex items-center gap-1.5 font-semibold text-c-text underline underline-offset-4"><Download className="size-4" aria-hidden />Download a sample CSV</a>
            <span className="text-muted-foreground">or</span>
            <Link href="/pay" className="underline underline-offset-4">pay people one at a time</Link>
          </p>
        </details>
      </div>
    </PageShell>
  );
}

async function Upload() {
  const accounts = (await listAccounts()).filter((a) => a.balance.available > 0);
  if (accounts.length === 0) return <p className="text-sm text-muted-foreground">None of this entity&apos;s accounts has an available balance. Fund an account in your sandbox dashboard, then come back.</p>;
  return <RunUpload accounts={accounts.map((a) => ({ id: a.id, label: a.display_name, currency: a.currency, availableMinor: a.balance.available }))} />;
}
