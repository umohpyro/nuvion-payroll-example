import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { SettingsForm } from "@/components/settings-form";
import { Skeleton } from "@/components/ui/skeleton";
import { readConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell title="Settings" intro="Connect your own Nuvion sandbox. Every contractor, quote and payment in this demo runs in your tenant with your key, so you can confirm it in your own dashboard. Nothing is shared with other visitors.">
      <div className="max-w-3xl">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Form />
        </Suspense>
      </div>
    </PageShell>
  );
}

async function Form() {
  const cfg = await readConfig();
  return <SettingsForm connectedEntityId={cfg?.entityId ?? null} />;
}
