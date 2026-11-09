"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/contractors", label: "Contractors" },
  { href: "/pay", label: "Pay" },
  { href: "/people", label: "People" },
  { href: "/payments", label: "Payments" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const current = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <header className="sticky top-0 z-30 bg-band text-band-foreground">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-sm font-extrabold text-primary-foreground" aria-hidden>P</span>
          <span className="text-lg font-extrabold tracking-tight">Contractor Payroll</span>
          <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold text-sand-fixed">Sandbox</span>
        </Link>
        <nav aria-label="Main" className="flex w-full items-center gap-1 overflow-x-auto pb-1 text-sm font-medium sm:w-auto sm:pb-0 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current(l.href) ? "page" : undefined}
              className={`rounded-full px-3 py-2 hover:bg-white/10 ${current(l.href) ? "bg-white/15 text-band-foreground" : "text-band-foreground/75 hover:text-band-foreground"}`}
            >
              {l.label}
            </Link>
          ))}
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  );
}
