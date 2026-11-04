// Tests for src/model.js. Run with:  node --test tests/
// No dependencies: node:test and node:assert only.
//
// Two groups of base-case checks:
//  1. "brief" — your original figures (the user_value fields in inputs.json)
//     must reproduce the results in the brief exactly. This checks the method.
//  2. "verified" — the verified inputs give the base case shown on the page.
//     Some expected values differ from the brief because verified inputs moved
//     them. README.md, "Changes from the brief", explains each one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const M = require('../src/model.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'data/inputs.json'), 'utf8'));

const PTS = 0.0001; // ±0.01 percentage points, in decimal
const LKRM = 0.1; // ±LKR 0.1m

/** Asserts a rate (decimal) equals an expected value given in percent, ±0.01 points. */
function rate(actual, expectedPct, label) {
  const diff = Math.abs(actual - expectedPct / 100);
  assert.ok(diff <= PTS + 1e-12, `${label}: got ${(actual * 100).toFixed(4)}%, expected ${expectedPct}% ±0.01`);
}
/** Asserts an amount (LKR m) ±0.1m. */
function amount(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= LKRM + 1e-9, `${label}: got LKR ${actual.toFixed(3)}m, expected ${expected}m ±0.1`);
}

/** Copy of inputs.json with the brief's original figures substituted. */
function briefData() {
  const d = structuredClone(data);
  d.inputs.gov_green.value = 10.15;
  d.inputs.gov_social_4y.value = 9.36;
  d.inputs.gov_social_5y.value = 9.5;
  d.inputs.gov_now_bid.value = 11.05; // brief: base case 11.05%
  d.inputs.gov_now_offer.value = 11.05;
  return d;
}

// ------------------------------------------------------------------ conversions

test('conversions: Social coupons on a semi-annual basis', () => {
  rate(M.annualToSemi(0.1115), 10.86, 'Social 4y 11.15% annual -> semi');
  rate(M.annualToSemi(0.114), 11.09, 'Social 5y 11.40% annual -> semi');
});

test('conversions: Green 10.75% semi-annual gives AER of about 11.03-11.04%', () => {
  // The sources quote AER 11.03% (truncated); exact value is 11.0389%.
  rate(M.semiToAnnual(0.1075), 11.04, 'Green AER');
});

test('conversions: round trips are exact', () => {
  for (const r of [0, 0.05, 0.0905, 0.1075, 0.1115, 0.114, 0.12839, 0.2]) {
    assert.ok(Math.abs(M.semiToAnnual(M.annualToSemi(r)) - r) < 1e-12, `annual->semi->annual ${r}`);
    assert.ok(Math.abs(M.annualToSemi(M.semiToAnnual(r)) - r) < 1e-12, `semi->annual->semi ${r}`);
  }
});

test('conversions: toSemiBasis respects frequency and rejects unknown ones', () => {
  assert.equal(M.toSemiBasis(0.1075, 'semi'), 0.1075);
  assert.equal(M.toSemiBasis(0.1115, 'annual'), M.annualToSemi(0.1115));
  assert.throws(() => M.toSemiBasis(0.1, 'quarterly'));
});

// ------------------------------------------------------------------ partial guarantee bounds

test('partial guarantee: share 0 equals no enhancement, share 1 equals full guarantee', () => {
  const cases = [
    [0.11295, 0.015439, 0.0067, 0],
    [0.11295, 0.015439, 0.0067, -0.003],
    [0.1105, 0.0155, 0.006, 0.004],
    [0.09, 0.03, 0, 0.005],
  ];
  for (const [g, u, gs, adj] of cases) {
    const p0 = M.couponPartialGuarantee(g, u, gs, 0, adj);
    const p1 = M.couponPartialGuarantee(g, u, gs, 1, adj);
    assert.ok(Math.abs(p0 - M.couponNoEnhancement(g, u, adj)) < 1e-15, 'share 0');
    assert.ok(Math.abs(p1 - M.couponFullGuarantee(g, gs)) < 1e-15, 'share 1');
  }
});

// ------------------------------------------------------------------ brief reproduction

test('brief: original figures reproduce every expected result in the brief', () => {
  const { history: h, base: b } = M.deriveBase(briefData());
  rate(h.green.spread, 0.6, 'Green spread');
  rate(h.social4.spread, 1.5, 'Social 4y spread');
  rate(h.social5.spread, 1.59, 'Social 5y spread');
  // Brief: "≈ 0.95" (1.55 − 0.60, with the Social average rounded). Exact: 1.5439 − 0.60 = 0.9439.
  rate(h.guaranteeEffect, 0.94, 'Guarantee effect');

  const s = M.scenario(b);
  // No enhancement: base about 12.55–12.65%
  rate(s.structures.none.low, 12.55, 'None low');
  rate(s.structures.none.high, 12.64, 'None high');
  rate(s.structures.full.semi, 11.65, 'Full guarantee');
  // Partial: 12.1–12.2%
  rate(s.structures.partial.semi, 12.12, 'Partial');
  // Annual-pay: 12.9–13.1, 12.5–12.6, 11.9–12.0
  assert.ok(s.structures.none.lowAnnual >= 0.129 && s.structures.none.highAnnual <= 0.131, 'None annual in 12.9–13.1');
  assert.ok(s.structures.partial.annual >= 0.1245 && s.structures.partial.annual <= 0.126, 'Partial annual about 12.5–12.6');
  assert.ok(s.structures.full.annual >= 0.119 && s.structures.full.annual <= 0.12, 'Full annual in 11.9–12.0');
  // Economics: ≈ 9.5m a year, ≈ 28.5m over 3 years, breakeven 0.85–0.86%
  amount(s.economics.grossPerYear, 9.44, 'Gross saving a year');
  amount(s.economics.grossOverTenor, 28.32, 'Gross saving over 3 years');
  assert.ok(s.economics.breakevenFee >= 0.0085 && s.economics.breakevenFee <= 0.0086, 'Breakeven 0.85–0.86%');
});

// ------------------------------------------------------------------ verified base case

test('verified: historical spreads', () => {
  const { history: h } = M.deriveBase(data);
  rate(h.social4.couponSemi, 10.86, 'Social 4y semi coupon');
  rate(h.social5.couponSemi, 11.09, 'Social 5y semi coupon');
  rate(h.green.spread, 0.67, 'Green spread (10.75 − 10.08)'); // brief: 0.60 (gov 10.15 → 10.08)
  rate(h.social4.spread, 1.5, 'Social 4y spread (10.855 − 9.355)');
  rate(h.social5.spread, 1.59, 'Social 5y spread (11.092 − 9.505)');
  rate(h.unsecuredAvg, 1.54, 'Average unsecured spread');
  rate(h.guaranteeEffect, 0.87, 'Guarantee effect (1.544 − 0.67)'); // brief: ≈0.95
});

test('verified: government yield now is the 15.12.29 mid (11.295%)', () => {
  const { base: b } = M.deriveBase(data);
  rate(b.govNow, 11.295, 'govNow'); // brief: 11.05% (13 Oct auction); newer data used
});

test('verified: Orange coupons, semi-annual basis', () => {
  const { base: b } = M.deriveBase(data);
  const s = M.scenario(b);
  rate(s.structures.none.semi, 12.84, 'No enhancement');
  rate(s.structures.none.low, 12.8, 'No enhancement, low (Social 4y spread)');
  rate(s.structures.none.high, 12.88, 'No enhancement, high (Social 5y spread)');
  rate(s.structures.partial.semi, 12.4, 'Partial DFI guarantee (share 0.5)');
  rate(s.structures.full.semi, 11.965, 'Full bank guarantee');
});

test('verified: Orange coupons, annual-pay equivalents', () => {
  const { base: b } = M.deriveBase(data);
  const s = M.scenario(b);
  rate(s.structures.none.annual, 13.25, 'No enhancement annual');
  rate(s.structures.none.lowAnnual, 13.2, 'No enhancement annual low');
  rate(s.structures.none.highAnnual, 13.3, 'No enhancement annual high');
  rate(s.structures.partial.annual, 12.79, 'Partial annual');
  rate(s.structures.full.annual, 12.32, 'Full annual');
});

test('verified: guarantee economics', () => {
  const { base: b } = M.deriveBase(data);
  const s = M.scenario(b);
  amount(s.structures.none.interest, 128.39, 'Annual interest, no enhancement');
  amount(s.structures.partial.interest, 124.02, 'Annual interest, partial');
  amount(s.structures.full.interest, 119.65, 'Annual interest, full');
  amount(s.economics.grossPerYear, 8.74, 'Gross saving a year');
  amount(s.economics.grossOverTenor, 26.22, 'Gross saving over 3 years');
  amount(s.economics.covered, 1100, 'Covered amount');
  rate(s.economics.breakevenFee, 0.79, 'Breakeven fee'); // 8.739 / 1,100 = 0.794%
  // Net at the placeholder 0.50% fee: (8.739 − 5.5) × 3 = 9.72
  amount(s.economics.netOverTenor, 9.72, 'Net saving over 3 years at 0.50% fee');
  assert.equal(s.economics.feeBelowBreakeven, true);
});

test('economics: net saving is zero at the breakeven fee, negative above it', () => {
  const { base: b } = M.deriveBase(data);
  const s = M.scenario(b);
  const atBe = M.scenario({ ...b, fee: s.economics.breakevenFee });
  assert.ok(Math.abs(atBe.economics.netOverTenor) < 1e-9);
  const above = M.scenario({ ...b, fee: s.economics.breakevenFee + 0.001 });
  assert.ok(above.economics.netOverTenor < 0);
  assert.equal(above.economics.feeBelowBreakeven, false);
});

test('economics: rule of thumb, 0.25 points on LKR 1bn is LKR 2.5m a year', () => {
  amount(M.ruleOfThumb(1000, 0.0025), 2.5, 'Rule of thumb');
  amount(M.annualInterest(1000, 0.0025), 2.5, 'Same via annualInterest');
});

test('tenor adjustment moves no-enhancement and partial coupons, not the guaranteed one', () => {
  const { base: b } = M.deriveBase(data);
  const s0 = M.scenario(b);
  const s1 = M.scenario({ ...b, tenorAdj: -0.002 });
  rate(s1.structures.none.semi - s0.structures.none.semi, -0.2, 'None shifts by −0.20');
  rate(s1.structures.partial.semi - s0.structures.partial.semi, -0.1, 'Partial shifts by −0.10 at share 0.5');
  assert.equal(s1.structures.full.semi, s0.structures.full.semi);
});

// ------------------------------------------------------------------ data integrity

test('data: every input has the required fields and a valid status', () => {
  const required = ['value', 'unit', 'description', 'source_url', 'source_name', 'source_date', 'quote', 'status', 'notes'];
  for (const [k, item] of Object.entries(data.inputs)) {
    for (const f of required) assert.ok(f in item, `${k} missing ${f}`);
    assert.ok(['verified', 'approximate', 'unverified'].includes(item.status), `${k} status`);
    if (item.kind === 'data') {
      assert.ok(item.source_url.startsWith('https://'), `${k} needs a source URL`);
      assert.ok(item.quote.length > 0, `${k} needs a quote`);
    }
  }
});

test('data: data/inputs.js is in sync with data/inputs.json', () => {
  const js = readFileSync(join(root, 'data/inputs.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(js, ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.window.OB_INPUTS)), data, 'run: node tools/sync-inputs.mjs');
});
