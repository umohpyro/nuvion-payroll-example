import type { ReactNode } from "react";

export function PageShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="rounded-[28px] bg-linear-to-br from-band from-30% to-[#7a1030] p-6 text-band-foreground sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-band-foreground/90 text-pretty">{intro}</p>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
