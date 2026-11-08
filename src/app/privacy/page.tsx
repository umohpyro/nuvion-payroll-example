import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy" intro="This app keeps nothing about you. Here is exactly what happens to what you type.">
      <ul className="max-w-2xl list-disc space-y-3 pl-5 text-sm">
        <li>There is no database. The app stores nothing about visitors.</li>
        <li>Your sandbox API key and chosen entity are kept in one cookie, sealed with AES-256-GCM, marked httpOnly, and expiring after eight hours. Disconnecting on the Settings page deletes it.</li>
        <li>Contractor details and payments go straight to your own Nuvion sandbox account. They are not copied anywhere else.</li>
        <li>This is an independent demo. Use fake details only. It is not financial, tax or legal advice.</li>
      </ul>
    </PageShell>
  );
}
