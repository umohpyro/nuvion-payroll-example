import assert from "node:assert/strict";
import { test } from "node:test";
import { CORRIDORS, last4, paymentDetailBody, routingProblem } from "./corridors.ts";
import type { ApiTransfer, FxQuote } from "./nuvion.ts";
import { planBatch, referenceFor, secondsLeft, summarize, timeline } from "./payroll.ts";

test("planBatch skips blank rows and totals the rest", () => {
  const p = planBatch([{ contractorId: "A", amount: "100" }, { contractorId: "B", amount: "" }, { contractorId: "C", amount: "50.25" }], 20000, "USD");
  assert.deepEqual(p.rows, [{ contractorId: "A", minor: 10000 }, { contractorId: "C", minor: 5025 }]);
  assert.equal(p.total, 15025);
});

test("planBatch rejects empty batches, bad amounts, duplicates and overspend", () => {
  assert.throws(() => planBatch([{ contractorId: "A", amount: "" }], 100, "USD"), /at least one/);
  assert.throws(() => planBatch([{ contractorId: "A", amount: "1.234" }], 100000, "USD"), /greater than zero/);
  assert.throws(() => planBatch([{ contractorId: "A", amount: "1" }, { contractorId: "A", amount: "2" }], 100000, "USD"), /only once/);
  assert.throws(() => planBatch([{ contractorId: "A", amount: "10" }, { contractorId: "B", amount: "10.01" }], 2000, "USD"), /\$20\.01 but \$20\.00 is available/);
});

test("secondsLeft never goes negative", () => {
  assert.equal(secondsLeft(10_000, 4_000), 6);
  assert.equal(secondsLeft(10_000, 20_000), 0);
});

test("the reference comes from the quote", () => assert.equal(referenceFor("01HXYZ4680ABCDEFGHJKMNPQRS"), "payroll-01HXYZ4680ABCDEFGHJKMNPQRS"));

test("summarize counts paid and failed", () => {
  assert.deepEqual(summarize([{ contractorId: "A", ok: true }, { contractorId: "B", ok: false }, { contractorId: "C", ok: true }]), { paid: 2, failed: 1 });
});

const t = (status: ApiTransfer["status"], reason?: string): ApiTransfer => ({
  id: "T", account_id: "A", amount: 5000, currency: "USD", status, status_reason: reason, type: "outflow", payment_type: "bank-transfer",
  narration: "n", applicable_fee: 0, unique_reference: "r", created: 1000, updated: 2000,
});
const q: FxQuote = { id: "Q", from: "USD", to: "GBP", amount_from: 5000, amount_to: 3950, rate: 0.79, quote: { status: "used", expires_at: 1, valid_for: 0 }, created: 900 };

test("timeline shows the locked rate first and ends on the current status", () => {
  assert.deepEqual(timeline(t("successful"), q).map((s) => [s.label, s.state]), [["Rate locked", "done"], ["Payment created", "done"], ["Delivered", "done"]]);
  assert.deepEqual(timeline(t("new"), null).map((s) => [s.label, s.state]), [["Payment created", "current"]]);
  const failed = timeline(t("failed", "invalid_payment_request"), q);
  assert.equal(failed.at(-1)?.state, "failed");
  assert.equal(failed.at(-1)?.detail, "invalid_payment_request");
  assert.equal(timeline(t("pending"), q).at(-1)?.state, "current");
});

test("routing is validated per corridor", () => {
  assert.equal(routingProblem("GBP", { bankName: "Barclays", sortCode: "04-00-04", accountNumber: "12345678" }), null);
  assert.match(routingProblem("GBP", { bankName: "Barclays", sortCode: "0400", accountNumber: "12345678" })!, /Sort code/);
  const eur = { bankName: "Commerzbank", country: "DE", iban: "DE89 3704 0044 0532 0130 00", swiftBic: "COBADEFFXXX" };
  assert.equal(routingProblem("EUR", eur), null);
  assert.match(routingProblem("EUR", { ...eur, country: "FR" })!, /starts with FR/);
  assert.match(routingProblem("EUR", { ...eur, swiftBic: "X" })!, /BIC/);
  assert.equal(routingProblem("NGN", { bankName: "Access Bank", bankCode: "044", accountNumber: "0690000031" }), null);
  assert.match(routingProblem("NGN", { bankName: "Access Bank", bankCode: "", accountNumber: "0690000031" })!, /Choose the bank/);
});

test("payment detail bodies carry the cleaned rail fields", () => {
  assert.deepEqual(paymentDetailBody("GBP", { bankName: " Barclays ", sortCode: "04-00-04", accountNumber: "12345678" }), { payment_method: "bank-transfer", currency: "GBP", bank_name: "Barclays", country: "GB", sort_code: "040004", account_number: "12345678" });
  assert.equal(paymentDetailBody("EUR", { bankName: "B", country: "DE", iban: "de89 3704 0044 0532 0130 00", swiftBic: "cobadeffxxx" }).iban, "DE89370400440532013000");
  assert.equal(last4("EUR", { iban: "DE89 3704 0044 0532 0130 00" }), "3000");
  assert.equal(CORRIDORS.NGN.country, "NG");
});
