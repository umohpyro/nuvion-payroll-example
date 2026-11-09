import type { ReactNode } from "react";

/** Payroll hero: a ledger-paper band in plum. `stat` is the big figure on the right; `actions` are the buttons under the intro. */
export function PageShell({ eyebrow = "Payroll", title, intro, stat, actions, children }: { eyebrow?: string; title: string; intro: string; stat?: { label: string; value: string }; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="ledger-hero flex flex-col gap-6 rounded-[28px] p-6 text-band-foreground sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-bold tracking-[0.12em] text-sand-fixed uppercase">{eyebrow}</p>
          <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.8rem)] leading-tight font-extrabold tracking-[-0.02em]">{title}</h1>
          <p className="mt-2 max-w-xl text-band-foreground/90 text-pretty">{intro}</p>
          {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {stat && (
          <div className="shrink-0 sm:text-right">
            <p className="text-[0.72rem] font-bold tracking-[0.12em] text-sand-fixed uppercase">{stat.label}</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">{stat.value}</p>
          </div>
        )}
      </div>
      <div className="mt-6 sm:mt-8">{children}</div>
    </div>
  );
}

const pill = "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold transition-colors";
/** Hero buttons: pink fill for the main action, translucent for the second. */
export const heroPrimary = `${pill} bg-primary text-primary-foreground hover:bg-primary/90`;
export const heroSecondary = `${pill} bg-white/12 text-band-foreground hover:bg-white/20`;
