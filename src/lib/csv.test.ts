import assert from "node:assert/strict";
import { test } from "node:test";
import { COLUMNS, MAX_ROWS, parseRun, SAMPLE_CSV, splitCsv } from "./csv.ts";
import type { ApiTransfer } from "./nuvion.ts";
import { isRunId, latestByPayee, runReference } from "./people.ts";

test("the sample file passes every check", () => {
  const rows = parseRun(SAMPLE_CSV);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.errors), [[], [], []]);
  assert.deepEqual(rows.map((r) => r.row?.minor), [10000, 25050, 7500]);
});

test("splitCsv handles quotes, commas in quotes, CRLF and a BOM", () => {
  assert.deepEqual(splitCsv('﻿a,"b,c","d ""e"""\r\n1,2,3\r\n'), [["a", "b,c", 'd "e"'], ["1", "2", "3"]]);
});

test("each bad row gets its own errors with spreadsheet line numbers", () => {
  const lines = SAMPLE_CSV.trim().split("\n");
  lines[1] = lines[1].replace("55779911", "123"); // bad GBP account number
  lines[2] = lines[2].replace("250.50", "0"); // zero amount
  lines[3] = lines[3].replace("NGN", "USD"); // unsupported currency
  const rows = parseRun(lines.join("\n"));
  assert.deepEqual(rows.map((r) => r.line), [2, 3, 4]);
  assert.match(rows[0].errors[0], /Account number must be 8 digits/);
  assert.match(rows[1].errors[0], /amount must be greater than zero/);
  assert.match(rows[2].errors[0], /currency must be one of/);
  assert.ok(rows.every((r) => r.row === null));
});

test("one bad row does not hide the good ones", () => {
  const lines = SAMPLE_CSV.trim().split("\n");
  lines[1] = lines[1].replace("55779911", "123");
  const rows = parseRun(lines.join("\n"));
  assert.equal(rows[0].row, null);
  assert.ok(rows[1].row && rows[2].row);
});

test("a person listed twice is flagged on the second line", () => {
  const lines = SAMPLE_CSV.trim().split("\n");
  const rows = parseRun([...lines, lines[1]].join("\n"));
  assert.match(rows[3].errors.join(" "), /already appears on line 2/);
});

test("file-level problems throw", () => {
  assert.throws(() => parseRun(""), /empty/);
  assert.throws(() => parseRun("first_name,last_name\nA,B"), /Missing columns: email/);
  assert.throws(() => parseRun(COLUMNS.join(",")), /no rows/);
  const many = [COLUMNS.join(","), ...Array(MAX_ROWS + 1).fill("a")].join("\n");
  assert.throws(() => parseRun(many), /at most 20 rows/);
});

const t = (id: string, cp: string, created: number, status: ApiTransfer["status"]): ApiTransfer => ({ id, counterparty_id: cp, created, updated: created, status, amount: 1, currency: "USD", type: "outflow", payment_type: "bank-transfer", narration: "", applicable_fee: 0, unique_reference: id, account_id: "A" });

test("latestByPayee picks the newest payout per person whatever the order", () => {
  const m = latestByPayee(["P1", "P2", "P3"], [t("a", "P1", 100, "failed"), t("b", "P1", 300, "successful"), t("c", "P1", 200, "pending"), t("d", "P2", 50, "new"), t("e", "OTHER", 999, "failed")]);
  assert.equal(m.get("P1")?.latest?.id, "b");
  assert.equal(m.get("P1")?.count, 3);
  assert.equal(m.get("P2")?.latest?.status, "new");
  assert.deepEqual(m.get("P3"), { latest: null, count: 0 });
  assert.equal(m.has("OTHER"), false);
});

test("run references are stable per run and line", () => {
  assert.equal(runReference("0123456789ab", 3), "payroll-run-0123456789ab-3");
  assert.ok(isRunId("0123456789ab") && !isRunId("xyz"));
});
