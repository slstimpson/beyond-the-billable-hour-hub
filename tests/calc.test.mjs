/*
 * Verification of the calculation engine against the conference paper.
 * Run: node --test tests/
 *
 * Every expectation below is a figure printed in the paper (Appendix C and the
 * three worked examples). A failure here means the Hub and the paper disagree.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  costPerHour, costPerHourSensitivity, feeArchitecture, cashFlow, cashFlowSensitivity,
  aiEconomics, aiSensitivity, scorecard, diagnose, safeDivide, clampRate, round,
  PAPER_PRESETS
} from '../assets/calc.js';

const near = (actual, expected, tolerance = 1, label = '') => {
  assert.ok(actual !== null && Number.isFinite(actual), `${label}: got ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual} (tolerance ${tolerance})`);
};

/* -------------------------------------------------- cost per billable hour */

test('cost per hour reproduces Appendix C, Example 2: (1,600,000 + 900,000) / 110', () => {
  const r = costPerHour(PAPER_PRESETS.costPerHour);
  assert.equal(r.totalCost, 2500000);
  assert.equal(r.effectiveHours, 110);
  near(r.costPerBillableHour, 22727.27, 0.01, 'cost per billable hour');
});

test('cost per hour: more billable hours spread fixed costs further', () => {
  const base = costPerHour(PAPER_PRESETS.costPerHour);
  const more = costPerHour({ ...PAPER_PRESETS.costPerHour, billableHours: 140 });
  assert.ok(more.costPerBillableHour < base.costPerBillableHour);
  near(more.costPerBillableHour, 2500000 / 140, 0.01, 'cost at 140 hours');
});

test('cost per hour: recovery needed grosses up for realisation and collection', () => {
  const r = costPerHour(PAPER_PRESETS.costPerHour);
  near(r.requiredRecovery, 22727.27 / (0.85 * 0.92), 0.05, 'required recovery');
});

test('cost per hour: utilisation reduces the hours that carry the cost', () => {
  const r = costPerHour({ ...PAPER_PRESETS.costPerHour, utilisation: 0.8 });
  near(r.effectiveHours, 88, 0.001, 'effective hours');
  near(r.costPerBillableHour, 2500000 / 88, 0.01, 'cost per hour at 80% utilisation');
});

test('cost per hour: zero hours returns null rather than Infinity', () => {
  const r = costPerHour({ ...PAPER_PRESETS.costPerHour, billableHours: 0 });
  assert.equal(r.costPerBillableHour, null);
  assert.equal(r.requiredRecovery, null);
});

test('cost per hour: negative entries are treated as zero, not as credits', () => {
  const r = costPerHour({ ...PAPER_PRESETS.costPerHour, other: -500000 });
  assert.equal(r.overhead, 0);
  assert.equal(r.totalCost, 900000);
});

test('cost per hour sensitivity marks the base case and moves the right way', () => {
  const rows = costPerHourSensitivity(PAPER_PRESETS.costPerHour);
  const base = rows.find((r) => r.isBase);
  near(base.costPerBillableHour, 22727.27, 0.01, 'base row');
  assert.ok(rows[0].costPerBillableHour > base.costPerBillableHour);
  assert.ok(rows[rows.length - 1].costPerBillableHour < base.costPerBillableHour);
});

/* --------------------------------------------- fee architecture, Example 2 */

test('fee architecture reproduces every fee in Worked Example 2', () => {
  const { scenarios } = feeArchitecture(PAPER_PRESETS.fees);
  const expected = [
    { hours: 30, hourly: 1050000, capped: 1050000, fixed: 1500000, hybrid: 1362500 },
    { hours: 40, hourly: 1400000, capped: 1400000, fixed: 1500000, hybrid: 1450000 },
    { hours: 50, hourly: 1750000, capped: 1400000, fixed: 1500000, hybrid: 1537500 },
    { hours: 60, hourly: 2100000, capped: 1400000, fixed: 1500000, hybrid: 1625000 }
  ];
  scenarios.forEach((row, i) => {
    assert.equal(row.hours, expected[i].hours, 'hours');
    for (const model of ['hourly', 'capped', 'fixed', 'hybrid']) {
      near(row.fees[model], expected[i][model], 1, `fee ${model} at ${row.hours}h`);
    }
  });
});

test('fee architecture reproduces every contribution in Worked Example 2', () => {
  const { scenarios } = feeArchitecture(PAPER_PRESETS.fees);
  const expected = [
    { hours: 30, hourly: 368182, capped: 368182, fixed: 818182, hybrid: 680682 },
    { hours: 40, hourly: 490909, capped: 490909, fixed: 590909, hybrid: 540909 },
    { hours: 50, hourly: 613636, capped: 263636, fixed: 363636, hybrid: 401136 },
    { hours: 60, hourly: 736364, capped: 36364, fixed: 136364, hybrid: 261364 }
  ];
  scenarios.forEach((row, i) => {
    for (const model of ['hourly', 'capped', 'fixed', 'hybrid']) {
      near(row.contribution[model], expected[i][model], 1, `contribution ${model} at ${row.hours}h`);
    }
  });
});

test('fee architecture reproduces the allocated cost column of Appendix C', () => {
  const { scenarios } = feeArchitecture(PAPER_PRESETS.fees);
  const expected = [681818, 909091, 1136364, 1363636];
  scenarios.forEach((row, i) => near(row.allocatedCost, expected[i], 1, `allocated cost at ${row.hours}h`));
});

test('fee architecture: the capped fee never exceeds the cap', () => {
  const { scenarios } = feeArchitecture({ ...PAPER_PRESETS.fees, expectedHours: 100 });
  scenarios.forEach((row) => assert.ok(row.fees.capped <= 1400000 + 0.001));
});

test('fee architecture: a collection rate below 100% cuts contribution', () => {
  const full = feeArchitecture(PAPER_PRESETS.fees).scenarios[1];
  const part = feeArchitecture({ ...PAPER_PRESETS.fees, collection: 0.9 }).scenarios[1];
  near(part.collected.fixed, 1500000 * 0.9, 1, 'collected at 90%');
  assert.ok(part.contribution.fixed < full.contribution.fixed);
});

test('fee architecture: margin is contribution over fees collected, and null at a zero fee', () => {
  const row = feeArchitecture(PAPER_PRESETS.fees).scenarios[1];
  near(row.margin.fixed, 590909 / 1500000, 0.0001, 'fixed margin');
  const zero = feeArchitecture({ ...PAPER_PRESETS.fees, fixedFee: 0 }).scenarios[1];
  assert.equal(zero.margin.fixed, null);
});

/* ------------------------------------------------- cash flow, Example 1 */

test('cash flow reproduces the twelve-month table in Appendix C', () => {
  const { rows } = cashFlow(PAPER_PRESETS.cashFlow);
  const expected = [
    1237000, 1474000, 1711000, 1248000, 785000, 322000,
    1344800, 2367600, 3390400, 4413200, 5436000, 6458800
  ];
  assert.equal(rows.length, 12);
  rows.forEach((row, i) => near(row.cash, expected[i], 1, `cash at month ${i + 1}`));
});

test('cash flow reproduces the receipt figures of $2,737,000 and $4,222,800', () => {
  const { rows } = cashFlow(PAPER_PRESETS.cashFlow);
  near(rows[0].receipts, 2737000, 1, 'receipts month 1');
  near(rows[5].receipts, 2737000, 1, 'receipts month 6');
  near(rows[6].receipts, 4222800, 1, 'receipts month 7');
  near(rows[11].receipts, 4222800, 1, 'receipts month 12');
});

test('cash flow reproduces the surplus before drawings and the real profit', () => {
  const { rows } = cashFlow(PAPER_PRESETS.cashFlow);
  near(rows[2].surplusBeforeDrawings, 1375000, 1, 'surplus month 3');
  near(rows[2].realProfit, 475000, 1, 'real profit month 3');
  near(rows[4].surplusBeforeDrawings, 2290000, 1, 'surplus month 5');
  near(rows[3].surplusBeforeDrawings, 675000, 1, 'surplus month 4');
  near(rows[3].billed, 2975000, 1, 'billed month 4');
  near(rows[4].billed, 4590000, 1, 'billed month 5');
});

test('cash flow sensitivity reproduces the 30, 60 and 90 day results', () => {
  const [d30, d60, d90] = cashFlowSensitivity(PAPER_PRESETS.cashFlow);
  near(d30.lowestCash.cash, 785000, 1, 'lowest cash at 30 days');
  near(d60.lowestCash.cash, 322000, 1, 'lowest cash at 60 days');
  near(d90.lowestCash.cash, -141000, 1, 'lowest cash at 90 days');
  assert.equal(d90.lowestCash.month, 7, 'the shortfall at 90 days falls in month 7');
  assert.deepEqual(d30.shortfallMonths, []);
  assert.deepEqual(d60.shortfallMonths, []);
  assert.deepEqual(d90.shortfallMonths, [7]);
});

test('cash flow: the work billed and finally collected is identical at every delay', () => {
  const results = cashFlowSensitivity(PAPER_PRESETS.cashFlow);
  const totals = results.map((r) => Math.round(r.rows.reduce((s, row) => s + row.billed, 0)));
  assert.equal(new Set(totals).size, 1, 'billed totals differ between delay scenarios');
});

test('cash flow: a flat practice with no growth holds its overhead steady', () => {
  const { rows } = cashFlow({
    ...PAPER_PRESETS.cashFlow,
    recordedValueAfterGrowth: 3500000,
    overheadAfterGrowth: 1600000
  });
  rows.forEach((row) => near(row.overhead, 1600000, 1, `overhead month ${row.month}`));
  near(rows[11].cash, 1000000 + 12 * (2737000 - 1600000 - 900000), 1, 'cash at month 12, no growth');
});

test('cash flow: peak requirement is reported when cash goes negative', () => {
  const r = cashFlow({ ...PAPER_PRESETS.cashFlow, collectionDelay: 3 });
  near(r.peakRequirement, 141000, 1, 'peak requirement');
});

/* ---------------------------------------------------- AI economics, Example 3 */

test('AI economics reproduces $27,370 collected for each additional hour', () => {
  const r = aiEconomics(PAPER_PRESETS.ai);
  near(r.collectedPerHour, 27370, 1, 'collected per hour');
  near(r.techCost, 35000, 0.01, 'monthly technology cost');
});

test('AI economics reproduces the hours released for each review time', () => {
  const rows = aiSensitivity(PAPER_PRESETS.ai);
  near(rows[0].hoursReleased, 43.333, 0.01, 'hours released, 10 minute review');
  near(rows[1].hoursReleased, 36.667, 0.01, 'hours released, 30 minute review');
  near(rows[2].hoursReleased, 26.667, 0.01, 'hours released, 60 minute review');
});

test('AI economics reproduces the Appendix C table: break-even, idle and half redeployed', () => {
  const rows = aiSensitivity(PAPER_PRESETS.ai);
  const expected = [
    { breakEven: 0.0295, half: 558017, hourlyIdle: -1221033 },
    { breakEven: 0.0349, half: 466783, hourlyIdle: -1038567 },
    { breakEven: 0.0480, half: 329933, hourlyIdle: -764867 }
  ];
  rows.forEach((row, i) => {
    near(row.breakEvenRedeployment, expected[i].breakEven, 0.0001, `break-even at ${row.reviewMinutes} min`);
    near(row.fixedHalfRedeployed, expected[i].half, 1, `fixed, half redeployed at ${row.reviewMinutes} min`);
    near(row.hourlyIdle, expected[i].hourlyIdle, 1, `hourly, idle at ${row.reviewMinutes} min`);
    near(row.fixedIdle, -35000, 0.01, 'fixed, idle');
  });
});

test('AI economics reproduces the full redeployment figures in the paper', () => {
  const rows = aiSensitivity(PAPER_PRESETS.ai);
  const expected = [1151033, 968567, 694867];
  rows.forEach((row, i) => near(row.fixedFullyRedeployed, expected[i], 1, `fully redeployed at ${row.reviewMinutes} min`));
});

test('AI economics: an extra cost of delivery reduces the value of a released hour', () => {
  const r = aiEconomics({ ...PAPER_PRESETS.ai, extraCostPerHour: 10000 });
  near(r.contributionPerHour, 17370, 1, 'contribution per hour');
  assert.ok(r.breakEvenRedeployment > aiEconomics(PAPER_PRESETS.ai).breakEvenRedeployment);
});

test('AI economics: no time released means no break-even to reach', () => {
  const r = aiEconomics({ ...PAPER_PRESETS.ai, draftMinutes: 120, reviewMinutes: 60 });
  assert.equal(r.hoursReleased, 0);
  assert.equal(r.breakEvenRedeployment, null);
  near(r.fixedIdle, -35000, 0.01, 'the tool still costs its monthly amount');
});

/* ------------------------------------------------------------- scorecard */

test('scorecard computes the five starting measures from entered figures', () => {
  const r = scorecard({
    totalCost: 2500000, billableHours: 110,
    billed: 2975000, collected: 2737000,
    receivables: 3000000, periodDays: 30,
    officeCash: 1711000, monthlyOutgoings: 2500000,
    matterFee: 1500000, matterCost: 909091
  });
  const [cost, collection, debtorDays, reserve, margin] = r.starting;
  near(cost.value, 22727.27, 0.01, 'cost per billable hour');
  near(collection.value, 2737000 / 2975000, 0.0001, 'collection rate');
  near(debtorDays.value, 3000000 / (2975000 / 30), 0.01, 'debtor days');
  near(reserve.value, 1711000 / 2500000, 0.0001, 'cash reserve in months');
  near(margin.value, (1500000 - 909091) / 1500000, 0.0001, 'matter contribution margin');
});

test('scorecard returns null for measures with no figures entered, never zero', () => {
  const r = scorecard({});
  r.starting.forEach((m) => assert.equal(m.value, null, `${m.label} should be null`));
});

test('scorecard keeps client-account reconciliation out of the commercial measures', () => {
  const r = scorecard({});
  const labels = [...r.starting, ...r.additional].map((m) => m.label).join(' ');
  assert.ok(!/reconcil/i.test(labels));
  assert.ok(/reconciliation/i.test(r.compliance.label));
});

test('scorecard real profit deducts a market cost for the owner’s own labour', () => {
  const r = scorecard({ billed: 2975000, overhead: 1600000, ownerLabour: 900000 });
  const realProfit = r.additional.find((m) => m.label === 'Real profit');
  near(realProfit.value, 475000, 1, 'real profit');
});

/* ------------------------------------------------------------ diagnostic */

test('diagnostic returns at most three priorities, worst first', () => {
  const r = diagnose({ cost: 'no', pricing: 'percentage', collection: 'no', engagement: 'no', review: 'rarely' });
  assert.equal(r.priorities.length, 3);
  assert.equal(r.answeredCount, 5);
  assert.ok(r.caveat.includes('not a financial audit'));
});

test('diagnostic produces no score and no verdict on financial health', () => {
  const r = diagnose({ cost: 'roughly' });
  assert.equal(r.score, undefined);
  // The caveat itself says the tool reaches no view on financial health, so it is
  // excluded from the search for a verdict.
  const text = JSON.stringify({ ...r, caveat: undefined });
  assert.ok(!/healthy|unhealthy|out of 10|\bgrade\b|\bscore\b/i.test(text));
});

test('diagnostic points a well-run practice at depth rather than inventing a fault', () => {
  const r = diagnose({ cost: 'yes', pricing: 'fixed', collection: 'monthly', engagement: 'yes', review: 'monthly' });
  assert.ok(r.priorities.length > 0);
  assert.ok(r.firstAction.link);
});

test('diagnostic tolerates an empty or partial answer set', () => {
  assert.equal(diagnose({}).answeredCount, 0);
  assert.ok(diagnose({}).firstAction.link);
  assert.equal(diagnose({ cost: 'nonsense' }).answeredCount, 0);
});

/* ------------------------------------------------------------- utilities */

test('safeDivide never returns Infinity or NaN', () => {
  assert.equal(safeDivide(1, 0), null);
  assert.equal(safeDivide(0, 0), null);
  assert.equal(safeDivide(NaN, 1), null);
  assert.equal(safeDivide(10, 4), 2.5);
});

test('clampRate accepts a percentage or a decimal for the same rate', () => {
  assert.equal(clampRate(92, 1), 0.92);
  assert.equal(clampRate(0.92, 1), 0.92);
  assert.equal(clampRate('', 0.85), 0.85);
  assert.equal(clampRate(-5, 1), 0);
});

test('round is stable at two places', () => {
  assert.equal(round(22727.2727, 2), 22727.27);
  assert.equal(round(0.005, 2), 0.01);
});
