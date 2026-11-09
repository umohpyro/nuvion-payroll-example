"use client";

import { Contact, House, ReceiptText, Send, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";

const LINKS = [
  { href: "/", label: "Home", icon: House },
  { href: "/contractors", label: "Contractors", icon: Contact },
  { href: "/pay", label: "Pay", icon: Send },
  { href: "/people", label: "People", icon: Users },
  { href: "/payments", label: "Payments", icon: ReceiptText },
];

export function SiteHeader() {
  const pathname = usePathname();
  const current = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const settings = current("/settings");
  return (
    <>
      <header className="sticky top-0 z-30 bg-band text-band-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-[10px] bg-c text-sm font-extrabold text-c-foreground" aria-hidden>P</span>
            <span className="text-lg font-extrabold tracking-tight">Payroll</span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-sand-fixed">Sandbox</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-semibold md:flex">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={current(href) ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-3.5 py-2 transition-colors ${current(href) ? "bg-c text-c-foreground" : "text-band-foreground/75 hover:bg-white/10 hover:text-band-foreground"}`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={settings ? "page" : undefined}
              className={`grid size-10 place-items-center rounded-full transition-colors ${settings ? "bg-c text-c-foreground" : "bg-white/10 text-band-foreground hover:bg-white/20"}`}
            >
              <Settings className="size-4" aria-hidden />
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      {/* Phones: the five main sections sit in a tab bar under the thumb. */}
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-band pb-[env(safe-area-inset-bottom)] text-band-foreground md:hidden">
        <ul className="grid grid-cols-5">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} aria-current={current(href) ? "page" : undefined} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold text-band-foreground/70 aria-[current=page]:text-band-foreground">
                <span className={`grid h-6 w-10 place-items-center rounded-full ${current(href) ? "bg-c text-c-foreground" : ""}`}><Icon className="size-4" aria-hidden /></span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
