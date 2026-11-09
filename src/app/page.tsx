import { FileUp, Radar, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Ledger, LedgerRow } from "@/components/ledger";
import { heroPrimary, heroSecondary, PageShell } from "@/components/page-shell";
import { RunProgress } from "@/components/run-progress";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatDate } from "@/lib/money";
import { listAccounts, listContractors, loadTransfers } from "@/lib/payroll-api";

const STEPS = [
  { icon: FileUp, title: "Upload", text: "Drop a CSV, or enter amounts by hand." },
  { icon: Sparkles, title: "Quote", text: "See each FX rate and what they receive." },
  { icon: Send, title: "Pay", text: "One tap sends the whole run." },
  { icon: Radar, title: "Track", text: "Follow every person to paid or failed." },
];

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><Skeleton className="h-64 w-full rounded-[28px]" /></div>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const [accounts, contractors, transfers] = await Promise.all([listAccounts(), listContractors(), loadTransfers(50)]);
  const payments = transfers.filter((t) => t.type === "outflow" && t.payment_type === "bank-transfer");
  const name = (id?: string) => contractors.find((c) => c.id === id)?.name ?? "Contractor";
  const paid = payments.filter((t) => t.status === "successful").length;
  const failed = payments.filter((t) => t.status === "failed").length;
  const funded = accounts.filter((a) => a.balance.available > 0);
  const shown = (funded.length ? funded : accounts).slice(0, 5); // an entity can hold dozens of accounts; funded ones first keeps the card short
  const lead = shown[0];

  return (
    <PageShell
      title="Pay your people"
      intro="Pay contractors in other countries from one account. See the FX quote before you pay, and follow every payout to the end."
      stat={lead ? { label: `Available · ${lead.display_name}`, value: formatAmount(lead.balance.available, lead.currency) } : undefined}
      actions={
        <>
          <Link href="/pay/upload" className={heroPrimary}>Upload a pay run</Link>
          <Link href="/pay" className={heroSecondary}>Pay one person</Link>
        </>
      }
    >
      <div className="space-y-6">
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-[22px] bg-card p-4 shadow-card ring-1 ring-foreground/10">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-c text-c-foreground"><Icon className="size-5" aria-hidden /></span>
              <div>
                <p className="mt-3 text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">Step {i + 1}</p>
                <p className="font-extrabold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <section className="rounded-[22px] bg-card p-4 shadow-card ring-1 ring-foreground/10 sm:p-5">
              <h2 className="mb-3 text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">Latest payouts</h2>
              <RunProgress paid={paid} failed={failed} pending={payments.length - paid - failed} />
            </section>
            {payments.length === 0 ? (
              <p className="rounded-[22px] bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">No payouts yet. <Link href="/pay/upload" className="font-semibold text-c-text underline underline-offset-4">Upload a pay run</Link> or add a contractor first.</p>
            ) : (
              <Ledger title="Recent payouts" count={`${Math.min(5, payments.length)} of ${payments.length}`}>
                {payments.slice(0, 5).map((t) => (
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
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[22px] bg-card p-4 shadow-card ring-1 ring-foreground/10 sm:p-5">
              <h2 className="mb-2 text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">Accounts</h2>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">This entity has no accounts yet.</p>
              ) : (
                <ul className="divide-y">
                  {shown.map((a) => (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-sm font-medium">{a.display_name}</span>
                      <span className="shrink-0 font-bold tabular-nums">{formatAmount(a.balance.available, a.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {accounts.length > shown.length && <p className="mt-2 text-xs text-muted-foreground">and {accounts.length - shown.length} more accounts</p>}
            </section>
            <Link href="/people" className="flex items-center justify-between gap-3 rounded-[22px] bg-c-soft p-4 shadow-card ring-1 ring-foreground/10 sm:p-5">
              <span>
                <span className="block text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">People</span>
                <span className="block text-3xl font-extrabold tabular-nums">{contractors.length}</span>
              </span>
              <span className="text-sm font-semibold text-c-text underline underline-offset-4">See each person&apos;s status</span>
            </Link>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
