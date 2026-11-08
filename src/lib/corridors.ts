/**
 * The payout corridors this app supports, each with the exact routing fields Nuvion requires for that rail
 * (docs: Send a Payout, step 2). Pure functions so they can be unit tested without Next.js.
 */
export type CorridorId = "GBP" | "EUR" | "NGN";

export const SEPA_COUNTRIES: Record<string, string> = { DE: "Germany", FR: "France", ES: "Spain", IT: "Italy", NL: "Netherlands", IE: "Ireland", BE: "Belgium", AT: "Austria", PT: "Portugal", FI: "Finland" };

export interface Corridor {
  id: CorridorId;
  currency: string;
  label: string;
  rail: string;
  /** Fixed country, or null when the contractor picks one (SEPA). */
  country: string | null;
}

export const CORRIDORS: Record<CorridorId, Corridor> = {
  GBP: { id: "GBP", currency: "GBP", label: "United Kingdom (GBP)", rail: "Faster Payments", country: "GB" },
  EUR: { id: "EUR", currency: "EUR", label: "Euro area (EUR)", rail: "SEPA", country: null },
  NGN: { id: "NGN", currency: "NGN", label: "Nigeria (NGN)", rail: "NIP", country: "NG" },
};
export const CORRIDOR_IDS = Object.keys(CORRIDORS) as CorridorId[];
export const isCorridor = (v: string): v is CorridorId => v in CORRIDORS;

/** Routing details as typed by the operator. Only the fields of the chosen corridor are read. */
export interface Routing {
  country?: string;
  sortCode?: string;
  accountNumber?: string;
  iban?: string;
  swiftBic?: string;
  bankCode?: string;
  bankName?: string;
}

const digits = (v: string | undefined, n: number) => {
  const s = (v ?? "").replace(/[\s-]/g, "");
  return new RegExp(`^\\d{${n}}$`).test(s) ? s : null;
};
const iban = (v: string | undefined) => {
  const s = (v ?? "").replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s) ? s : null;
};
const bic = (v: string | undefined) => {
  const s = (v ?? "").trim().toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s) ? s : null;
};

/** The first problem with the routing details, or null when they are complete. */
export function routingProblem(id: CorridorId, r: Routing): string | null {
  if (!r.bankName?.trim()) return "Enter the bank's name.";
  if (id === "GBP") {
    if (!digits(r.sortCode, 6)) return "Sort code must be 6 digits.";
    if (!digits(r.accountNumber, 8)) return "Account number must be 8 digits.";
  } else if (id === "EUR") {
    const country = r.country ?? "";
    if (!(country in SEPA_COUNTRIES)) return "Choose a euro area country.";
    const i = iban(r.iban);
    if (!i) return "Enter a valid IBAN.";
    if (!i.startsWith(country)) return `An IBAN for ${SEPA_COUNTRIES[country]} starts with ${country}.`;
    if (!bic(r.swiftBic)) return "Enter the bank's 8 or 11 character BIC.";
  } else {
    if (!r.bankCode?.trim()) return "Choose the bank.";
    if (!digits(r.accountNumber, 10)) return "Account number must be 10 digits.";
  }
  return null;
}

/** The body of POST /payment-details for this corridor (without entity, counterparty or holder name). */
export function paymentDetailBody(id: CorridorId, r: Routing): Record<string, unknown> {
  const base = { payment_method: "bank-transfer", currency: CORRIDORS[id].currency, bank_name: r.bankName!.trim() };
  if (id === "GBP") return { ...base, country: "GB", sort_code: digits(r.sortCode, 6), account_number: digits(r.accountNumber, 8) };
  if (id === "EUR") return { ...base, country: r.country, iban: iban(r.iban), swift_bic: bic(r.swiftBic) };
  return { ...base, country: "NG", bank_code: r.bankCode!.trim(), account_number: digits(r.accountNumber, 10) };
}

/** The last four characters of the account, for display. The full number stays in Nuvion. */
export function last4(id: CorridorId, r: Routing): string {
  const v = id === "EUR" ? iban(r.iban) : digits(r.accountNumber, id === "GBP" ? 8 : 10);
  return (v ?? "").slice(-4);
}
