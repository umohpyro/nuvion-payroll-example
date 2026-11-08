import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAmount, parseAmount, toDecimal } from "./money.ts";

test("toDecimal round-trips through parseAmount", () => {
  for (const minor of [1, 99, 100, 1250, 1325, 100000001]) assert.equal(parseAmount(toDecimal(minor)), minor);
});

test("parses decimal input into the smallest unit", () => {
  assert.equal(parseAmount("12"), 1200);
  assert.equal(parseAmount("12.5"), 1250);
  assert.equal(parseAmount("0.01"), 1);
  assert.equal(parseAmount(" 100.00 "), 10000);
});

test("rejects zero, negatives, three decimals and junk", () => {
  for (const bad of ["0", "0.00", "-1", "1.234", "1,5", "abc", "", "1e3", "9999999999999"]) assert.equal(parseAmount(bad), null, bad);
});

test("formats stablecoins by ticker and fiat by currency", () => {
  assert.equal(formatAmount(1250, "USC"), "12.50 USDC");
  assert.equal(formatAmount(100000000, "UST"), "1,000,000.00 USDT");
  assert.equal(formatAmount(1250, "USD"), "$12.50");
});
