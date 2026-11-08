"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        The request failed. If your session ended, connect your sandbox again on the Settings page. Nothing real happened: this app only uses the Nuvion sandbox.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/settings" className={buttonVariants({ variant: "outline" })}>Open Settings</Link>
      </div>
    </div>
  );
}
