import { CORRIDORS, isCorridor, routingProblem, type CorridorId, type Routing } from "./corridors.ts";
import { parseAmount } from "./money.ts";

/** One pay run is one CSV: a row per person, with everything needed to pay them. */
export const COLUMNS = ["first_name", "last_name", "email", "address_line1", "city", "postcode", "currency", "country", "bank_name", "bank_code", "sort_code", "account_number", "iban", "swift_bic", "amount"] as const;
export type Column = (typeof COLUMNS)[number];

export const MAX_ROWS = 20;
/** Shortcut: 100 KB is far more than 20 rows need; raise it together with MAX_ROWS. */
export const MAX_BYTES = 100_000;

/** A row that passed every check. `minor` is the amount in the smallest unit of the account being paid from. */
export interface RunRow {
  firstName: string;
  lastName: string;
  email: string;
  line1: string;
  city: string;
  postcode: string;
  corridor: CorridorId;
  routing: Routing;
  minor: number;
}

export interface ParsedRow {
  /** Line number in the file, counting the header as line 1, so errors point at the spreadsheet row. */
  line: number;
  row: RunRow | null;
  errors: string[];
}

/** Splits CSV text into records. Handles quoted fields, doubled quotes, commas and newlines inside quotes, and CRLF. */
export function splitCsv(text: string): string[][] {
  const out: string[][] = [];
  let rec: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { rec.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      rec.push(cell); cell = "";
      if (rec.some((c) => c.trim())) out.push(rec);
      rec = [];
    } else cell += ch;
  }
  rec.push(cell);
  if (rec.some((c) => c.trim())) out.push(rec);
  return out;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates every row of a pay run and returns each row with its own list of problems. Throws for file-level problems. */
export function parseRun(text: string): ParsedRow[] {
  if (text.length > MAX_BYTES) throw new Error("This file is too large. A pay run is at most 20 rows.");
  const records = splitCsv(text);
  if (records.length === 0) throw new Error("The file is empty.");
  const header = records[0].map((h) => h.trim().toLowerCase());
  const missing = COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`Missing column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Download the sample for the exact header.`);
  const body = records.slice(1);
  if (body.length === 0) throw new Error("The file has a header but no rows.");
  if (body.length > MAX_ROWS) throw new Error(`A pay run is at most ${MAX_ROWS} rows. This file has ${body.length}.`);

  const seen = new Map<string, number>();
  return body.map((rec, i): ParsedRow => {
    const line = i + 2;
    const get = (c: Column) => (rec[header.indexOf(c)] ?? "").trim();
    const errors: string[] = [];
    const need = (c: Column, label: string, max: number) => {
      const v = get(c);
      if (!v) errors.push(`${label} is required.`);
      else if (v.length > max) errors.push(`${label} is longer than ${max} characters.`);
      return v;
    };
    const firstName = need("first_name", "first_name", 60);
    const lastName = need("last_name", "last_name", 60);
    const email = need("email", "email", 120);
    if (email && !EMAIL.test(email)) errors.push("email is not a valid address.");
    const line1 = need("address_line1", "address_line1", 80);
    const city = need("city", "city", 60);
    const postcode = need("postcode", "postcode", 12);

    const cur = get("currency").toUpperCase();
    const corridor = isCorridor(cur) ? cur : null;
    if (!corridor) errors.push(`currency must be one of ${Object.keys(CORRIDORS).join(", ")}.`);

    const routing: Routing = { country: get("country").toUpperCase(), bankName: get("bank_name"), bankCode: get("bank_code"), sortCode: get("sort_code"), accountNumber: get("account_number"), iban: get("iban"), swiftBic: get("swift_bic") };
    if (corridor) {
      const bad = routingProblem(corridor, routing);
      if (bad) errors.push(bad);
    }

    const minor = parseAmount(get("amount"));
    if (!minor) errors.push("amount must be greater than zero with at most 2 decimals.");

    // The same person twice in one run is almost always a paste mistake, so it is an error rather than a double payment.
    const key = `${firstName} ${lastName}`.toLowerCase() + `|${email.toLowerCase()}`;
    if (firstName && lastName && email) {
      const first = seen.get(key);
      if (first) errors.push(`This person already appears on line ${first}.`);
      else seen.set(key, line);
    }

    if (errors.length || !corridor || !minor) return { line, row: null, errors };
    return { line, row: { firstName, lastName, email, line1, city, postcode, corridor, routing, minor }, errors };
  });
}

/** Fake people only. The NGN bank code is a placeholder: pick a real one from the bank list on the Contractors page. */
export const SAMPLE_CSV = `${COLUMNS.join(",")}
Ada,Lovelace,ada.test@example.com,12 Test Street,London,EC1A 1BB,GBP,,Test Bank UK,,200000,55779911,,,100.00
Jean,Dupont,jean.test@example.com,5 Rue Test,Berlin,10115,EUR,DE,Test Bank DE,,,,DE89370400440532013000,COBADEFFXXX,250.50
Chidi,Okafor,chidi.test@example.com,7 Test Avenue,Lagos,100001,NGN,,Test Bank NG,044,,0123456789,,,75.00
`;
