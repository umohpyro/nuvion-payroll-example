import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";

const RULE = { ok: "border-l-ok", bad: "border-l-destructive", warn: "border-l-warn", none: "border-l-transparent" };

/** A pay ledger: titled card, one row per person, optional total line at the foot. */
export function Ledger({ title, count, total, children }: { title: string; count?: string; total?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[22px] bg-card shadow-card ring-1 ring-foreground/10">
      <header className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
        <h2 className="text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">{title}</h2>
        {count && <span className="text-xs font-semibold text-muted-foreground">{count}</span>}
      </header>
      <ul className="divide-y border-t">{children}</ul>
      {total && <div className="flex items-center justify-between gap-3 border-t bg-c-soft px-4 py-3 sm:px-5">{total}</div>}
    </section>
  );
}

/** One person on the ledger. The left rule carries the row's status colour; `children` holds anything that needs the full row width. */
export function LedgerRow({ name, title, sub, href, tone = "none", right, children }: { name: string; title?: string; sub?: ReactNode; href?: string; tone?: keyof typeof RULE; right?: ReactNode; children?: ReactNode }) {
  const body = (
    <div className="flex items-center gap-3">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title ?? name}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      {right && <div className="flex shrink-0 flex-col items-end gap-1 text-sm sm:flex-row sm:items-center sm:gap-4">{right}</div>}
    </div>
  );
  return (
    <li className={`border-l-4 ${RULE[tone]}`}>
      {href ? <Link href={href} className="block px-4 py-3 hover:bg-c-soft/60 sm:px-5">{body}</Link> : <div className="px-4 py-3 sm:px-5">{body}</div>}
      {children && <div className="space-y-1 px-4 pb-3 text-sm sm:pl-[4.75rem] sm:pr-5">{children}</div>}
    </li>
  );
}
