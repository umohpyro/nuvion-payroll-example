import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL?.trim() || "http://localhost:3000"), // makes the Open Graph image URL absolute
  title: { default: "Contractor Payroll", template: "%s · Contractor Payroll" },
  description: "An example payroll app that pays contractors abroad through the Nuvion sandbox: add contractors, see the FX quote, pay one or a batch, and follow each payment. No real funds move.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("theme")||"system";if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}` }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* usePathname() reads the URL, so the header streams in behind a placeholder of the same height. */}
        <Suspense fallback={<div className="h-[57px] bg-band" />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t py-8 text-center text-sm text-muted-foreground">
          <p className="mx-auto max-w-3xl px-4">Sandbox only. Nothing here is real and no contractor is paid. Your API key is sealed in an encrypted cookie in this browser and expires after eight hours.</p>
        </footer>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
