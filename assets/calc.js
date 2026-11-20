/*
 * Practice Economics Hub - financial calculation engine
 *
 * Every formula here is taken from "Beyond the Billable Hour: The Economics of
 * Modern Legal Practice" (Stuart L. Stimpson, JAMBAR CLE Conference, 19 November
 * 2026), Appendix C. Section references in comments are to that paper.
 *
 * All figures are Jamaican dollars. Nothing here is a market rate or a benchmark.
 * Pure functions only: no DOM, no network, no storage. Tested in tests/calc.test.mjs.
 */

/* ---------------------------------------------------------------- helpers */

export function toNumber(value, fallback = 0) {
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/** Guards every division in this file. Returns null rather than Infinity or NaN. */
export function safeDivide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

export function round(value, places = 2) {
  if (!Number.isFinite(value)) return null;
  const f = Math.pow(10, places);
  return Math.round(value * f) / f;
}

/* ------------------------------------------------- A. cost per billable hour */

/**
 * Appendix C, Example 2: average cost per recorded hour
 *   (overhead + allowance for the principal's own labour) / realistic billable hours
 * The paper's figure: (1,600,000 + 900,000) / 110 = 22,727.27
 *
 * Optional adjustments. Utilisation reduces the hours that carry the cost.
 * Realisation and collection reduce what an hour actually brings in, so the
 * "recovery needed" figure is what must be charged for the hour to cover its cost.
 */
export function costPerHour(input) {
  const overheadItems = [
    'salaries', 'premises', 'utilities', 'insurance',
    'software', 'professional', 'administration', 'other'
  ];
  const overhead = overheadItems.reduce((sum, key) => sum + Math.max(0, toNumber(input[key])), 0);
  const ownerLabour = Math.max(0, toNumber(input.ownerLabour));
  const totalCost = overhead + ownerLabour;

  const enteredHours = Math.max(0, toNumber(input.billableHours));
  const utilisation = clampRate(input.utilisation, 1);
  const effectiveHours = enteredHours * utilisation;

  const costPerBillableHour = safeDivide(totalCost, effectiveHours);

  const realisation = clampRate(input.realisation, 1);
  const collection = clampRate(input.collection, 1);
  const yieldFactor = realisation * collection;

  // What must be charged per hour so that the cost is covered after write-offs,
  // non-collection and any target surplus.
  const targetSurplus = clampRate(input.targetSurplus, 0);
  const requiredRecovery = costPerBillableHour === null
    ? null
    : safeDivide(costPerBillableHour * (1 + targetSurplus), yieldFactor);

  return {
    overhead,
    ownerLabour,
    totalCost,
    enteredHours,
    effectiveHours,
    costPerBillableHour,
    yieldFactor,
    requiredRecovery,
    workings: [
      `Total cost = overhead ${fmt(overhead)} + allowance for your own professional labour ${fmt(ownerLabour)} = ${fmt(totalCost)}`,
      utilisation < 1
        ? `Hours carrying the cost = ${enteredHours} entered x ${pct(utilisation)} utilisation = ${round(effectiveHours, 1)}`
        : `Hours carrying the cost = ${enteredHours}`,
      `Cost per billable hour = ${fmt(totalCost)} / ${round(effectiveHours, 1)} = ${fmt(costPerBillableHour)}`,
      `Recovery needed per hour = ${fmt(costPerBillableHour)}${targetSurplus ? ` x ${pct(1 + targetSurplus)}` : ''} / (${pct(realisation)} realisation x ${pct(collection)} collection) = ${fmt(requiredRecovery)}`
    ]
  };
}

/** Sensitivity: cost per hour as billable hours change, fixed costs unchanged. */
export function costPerHourSensitivity(input, multipliers = [0.7, 0.85, 1, 1.15, 1.3]) {
  const base = Math.max(0, toNumber(input.billableHours));
  return multipliers.map((m) => {
    const hours = Math.round(base * m);
    const result = costPerHour({ ...input, billableHours: hours });
    return { hours, costPerBillableHour: result.costPerBillableHour, isBase: m === 1 };
  });
}

/* ------------------------------------------------ B. fee architecture (WE2) */

/**
 * Worked Example 2: one matter, four prices.
 * Paper assumptions: 40 hours expected, $35,000 an hour, allocated cost
 * $22,727.27 an hour, cap $1.4m, fixed $1.5m, hybrid $1.1m for a defined
 * first stage plus the hourly rate for later work (one quarter of the hours).
 *
 * Contribution = fee collected - (hours x allocated cost per hour).
 * Collection is 100% in the paper's table, so the preset reproduces it exactly.
 */
export function feeArchitecture(input) {
  const expectedHours = Math.max(0, toNumber(input.expectedHours, 40));
  const hourlyRate = Math.max(0, toNumber(input.hourlyRate, 35000));
  const costRate = Math.max(0, toNumber(input.costPerHour, 22727.27));
  const cap = Math.max(0, toNumber(input.cap, 1400000));
  const fixed = Math.max(0, toNumber(input.fixedFee, 1500000));
  const stageOne = Math.max(0, toNumber(input.hybridStageOne, 1100000));
  const laterShare = clampRate(input.laterStageShare, 0.25);
  const collection = clampRate(input.collection, 1);
  const extraCosts = Math.max(0, toNumber(input.extraCosts));
  const contingency = clampRate(input.contingency, 0);

  const scenarios = (input.scenarios || [
    { label: 'Faster (25% less)', factor: 0.75 },
    { label: 'On estimate', factor: 1 },
    { label: 'Overrun of 25%', factor: 1.25 },
    { label: 'Overrun of 50%', factor: 1.5 }
  ]).map((s) => {
    const hours = s.hours !== undefined ? s.hours : round(expectedHours * s.factor, 4);
    const laterHours = round(hours * laterShare, 4);
    const allocatedCost = hours * costRate + extraCosts;

    const fees = {
      hourly: hours * hourlyRate,
      capped: Math.min(hours * hourlyRate, cap),
      fixed: fixed * (1 + contingency),
      hybrid: stageOne + hourlyRate * laterHours
    };

    const row = { label: s.label, hours, laterHours, allocatedCost, fees: {}, collected: {}, contribution: {}, margin: {} };
    for (const model of Object.keys(fees)) {
      const fee = fees[model];
      const collected = fee * collection;
      const contribution = collected - allocatedCost;
      row.fees[model] = fee;
      row.collected[model] = collected;
      row.contribution[model] = contribution;
      row.margin[model] = safeDivide(contribution, collected);
    }
    return row;
  });

  return {
    inputs: { expectedHours, hourlyRate, costRate, cap, fixed, stageOne, laterShare, collection, extraCosts, contingency },
    scenarios,
    workings: [
      `Hourly fee = hours x ${fmt(hourlyRate)}`,
      `Capped fee = the hourly fee, up to ${fmt(cap)}`,
      `Fixed fee = ${fmt(fixed * (1 + contingency))}`,
      `Hybrid fee = ${fmt(stageOne)} + (${fmt(hourlyRate)} x later-stage hours, taken as ${pct(laterShare)} of the hours)`,
      `Allocated cost = hours x ${fmt(costRate)}${extraCosts ? ` + ${fmt(extraCosts)} of other delivery cost` : ''}`,
      `Contribution = fee collected - allocated cost`
    ]
  };
}

/* ----------------------------------------------------- C. cash flow (WE1) */

/**
 * Worked Example 1: profitable on paper, short of cash.
 * Recorded value -> billed at the realisation rate -> collected at the collection
 * rate, each step a month or more apart.
 *   cash(n) = cash(n-1) + receipts(n) - overhead(n) - owner drawings
 * Receipts in month n come from work recorded in month n - (billing delay +
 * collection delay). Before that reaches back into the model, the opening
 * pipeline of earlier work supplies the receipt, as the paper describes.
 *
 * Client money is not part of this model. Office cash only.
 */
export function cashFlow(input) {
  const months = Math.max(1, Math.round(toNumber(input.months, 12)));
  const openingCash = toNumber(input.openingCash, 1000000);
  const recordedBefore = Math.max(0, toNumber(input.recordedValue, 3500000));
  const recordedAfter = Math.max(0, toNumber(input.recordedValueAfterGrowth, recordedBefore));
  const growthMonth = Math.max(1, Math.round(toNumber(input.growthMonth, 4)));
  const overheadBefore = Math.max(0, toNumber(input.overhead, 1600000));
  const overheadAfter = Math.max(0, toNumber(input.overheadAfterGrowth, overheadBefore));
  const drawings = Math.max(0, toNumber(input.drawings, 900000));
  const realisation = clampRate(input.realisation, 0.85);
  const collection = clampRate(input.collection, 0.92);
  const billingDelay = Math.max(0, Math.round(toNumber(input.billingDelay, 1)));
  const collectionDelay = Math.max(0, Math.round(toNumber(input.collectionDelay, 2)));
  const hasGrowth = recordedAfter !== recordedBefore || overheadAfter !== overheadBefore;

  const recordedIn = (m) => (hasGrowth && m >= growthMonth ? recordedAfter : recordedBefore);
  const overheadIn = (m) => (hasGrowth && m >= growthMonth ? overheadAfter : overheadBefore);
  const openingPipelineReceipt = recordedBefore * realisation * collection;

  const rows = [];
  let cash = openingCash;
  let lowest = { month: 0, cash: openingCash };

  for (let m = 1; m <= months; m += 1) {
    const sourceMonth = m - (billingDelay + collectionDelay);
    const billedSource = m - collectionDelay;
    const billed = billedSource - billingDelay >= 1
      ? recordedIn(billedSource - billingDelay) * realisation
      : recordedBefore * realisation;
    const receipts = sourceMonth >= 1
      ? recordedIn(sourceMonth) * realisation * collection
      : openingPipelineReceipt;
    const overhead = overheadIn(m);
    const recorded = recordedIn(m);
    const billedThisMonth = m - billingDelay >= 1 ? recordedIn(m - billingDelay) * realisation : recordedBefore * realisation;
    const surplusBeforeDrawings = billedThisMonth - overhead;

    cash = cash + receipts - overhead - drawings;
    rows.push({
      month: m,
      recorded,
      billed: billedThisMonth,
      receipts,
      overhead,
      drawings,
      surplusBeforeDrawings,
      realProfit: surplusBeforeDrawings - drawings,
      cash
    });
    if (cash < lowest.cash) lowest = { month: m, cash };
  }

  const shortfalls = rows.filter((r) => r.cash < 0).map((r) => r.month);
  return {
    rows,
    lowestCash: lowest,
    shortfallMonths: shortfalls,
    peakRequirement: lowest.cash < 0 ? Math.abs(lowest.cash) : 0,
    workings: [
      `Billed = recorded value x ${pct(realisation)} realisation, ${billingDelay} month(s) after the work`,
      `Collected = billed x ${pct(collection)} collection, a further ${collectionDelay} month(s) later`,
      `Cash at month end = cash carried forward + receipts - overhead - drawings of ${fmt(drawings)}`,
      'Money held in the clients’ trust account is not part of this model.'
    ]
  };
}

/** Compare collection delays of 1, 2 and 3 months on the same work. */
export function cashFlowSensitivity(input, delays = [1, 2, 3]) {
  return delays.map((collectionDelay) => {
    const result = cashFlow({ ...input, collectionDelay });
    return {
      collectionDelay,
      label: `${collectionDelay * 30} days`,
      lowestCash: result.lowestCash,
      shortfallMonths: result.shortfallMonths,
      rows: result.rows
    };
  });
}

/* ------------------------------------------------------- D. AI economics (WE3) */

/**
 * Worked Example 3: the AI saving.
 *   hours released   = tasks x (baseline hours - time with AI)
 *   collected per hour = rate x realisation x collection      ($27,370 in the paper)
 *   monthly tech cost  = subscription + setup / months allocated
 *   break-even redeployment = tech cost / (hours released x collected per hour)
 *
 * Time saved is capacity. It becomes money only when paid work fills it.
 */
export function aiEconomics(input) {
  const tasks = Math.max(0, toNumber(input.tasks, 20));
  const baselineHours = Math.max(0, toNumber(input.baselineHours, 3));
  const draftMinutes = Math.max(0, toNumber(input.draftMinutes, 40));
  const reviewMinutes = Math.max(0, toNumber(input.reviewMinutes, 30));
  const subscription = Math.max(0, toNumber(input.subscription, 30000));
  const setup = Math.max(0, toNumber(input.setup, 60000));
  const setupMonths = Math.max(1, toNumber(input.setupMonths, 12));
  const rate = Math.max(0, toNumber(input.hourlyRate, 35000));
  const realisation = clampRate(input.realisation, 0.85);
  const collection = clampRate(input.collection, 0.92);
  const redeployment = clampRate(input.redeployment, 0.5);
  const extraCostPerHour = Math.max(0, toNumber(input.extraCostPerHour));

  const hoursWithAI = (draftMinutes + reviewMinutes) / 60;
  const baselineTotal = tasks * baselineHours;
  const withAITotal = tasks * hoursWithAI;
  const hoursReleased = Math.max(0, baselineTotal - withAITotal);

  const collectedPerHour = rate * realisation * collection;
  const contributionPerHour = Math.max(0, collectedPerHour - extraCostPerHour);
  const techCost = subscription + safeDivide(setup, setupMonths);

  const fullValue = hoursReleased * contributionPerHour;
  const breakEven = safeDivide(techCost, fullValue);

  return {
    hoursWithAI,
    baselineTotal,
    withAITotal,
    hoursReleased,
    collectedPerHour,
    contributionPerHour,
    techCost,
    breakEvenRedeployment: breakEven,
    fixedIdle: -techCost,
    fixedAtRedeployment: hoursReleased * redeployment * contributionPerHour - techCost,
    fixedFullyRedeployed: fullValue - techCost,
    hourlyIdle: -(hoursReleased * contributionPerHour) - techCost,
    hourlyAtRedeployment: -(hoursReleased * (1 - redeployment) * contributionPerHour) - techCost,
    workings: [
      `Hours released = ${tasks} tasks x (${baselineHours}h - ${round(hoursWithAI, 2)}h) = ${round(hoursReleased, 2)} a month`,
      `Collected per additional hour = ${fmt(rate)} x ${pct(realisation)} x ${pct(collection)} = ${fmt(collectedPerHour)}`,
      `Monthly technology cost = ${fmt(subscription)} + (${fmt(setup)} / ${setupMonths}) = ${fmt(techCost)}`,
      `Break-even redeployment = ${fmt(techCost)} / (${round(hoursReleased, 2)} x ${fmt(contributionPerHour)}) = ${pct(breakEven, 2)}`
    ]
  };
}

/** Sensitivity to review time, the paper's three cases. */
export function aiSensitivity(input, reviewTimes = [10, 30, 60]) {
  return reviewTimes.map((reviewMinutes) => {
    const r = aiEconomics({ ...input, reviewMinutes });
    return {
      reviewMinutes,
      hoursReleased: r.hoursReleased,
      breakEvenRedeployment: r.breakEvenRedeployment,
      fixedIdle: r.fixedIdle,
      fixedHalfRedeployed: aiEconomics({ ...input, reviewMinutes, redeployment: 0.5 }).fixedAtRedeployment,
      fixedFullyRedeployed: r.fixedFullyRedeployed,
      hourlyIdle: r.hourlyIdle,
      isCurrent: reviewMinutes === Math.round(toNumber(input.reviewMinutes, 30))
    };
  });
}

/* ----------------------------------------------------------- E. scorecard */

/** Appendix A. Five starting measures, then four more as records allow. */
export function scorecard(input) {
  const totalCost = Math.max(0, toNumber(input.totalCost));
  const billableHours = Math.max(0, toNumber(input.billableHours));
  const billed = Math.max(0, toNumber(input.billed));
  const collected = Math.max(0, toNumber(input.collected));
  const receivables = Math.max(0, toNumber(input.receivables));
  const officeCash = Math.max(0, toNumber(input.officeCash));
  const monthlyOutgoings = Math.max(0, toNumber(input.monthlyOutgoings));
  const matterFee = Math.max(0, toNumber(input.matterFee));
  const matterCost = Math.max(0, toNumber(input.matterCost));
  const recorded = Math.max(0, toNumber(input.recordedValue));
  const unbilled = Math.max(0, toNumber(input.unbilledWork));
  const ownerLabour = Math.max(0, toNumber(input.ownerLabour));
  const overhead = Math.max(0, toNumber(input.overhead));
  const techContribution = toNumber(input.techContribution);
  const techCost = Math.max(0, toNumber(input.techCost));
  const days = Math.max(1, toNumber(input.periodDays, 365));

  const dailyBilled = safeDivide(billed, days);

  return {
    starting: [
      measure('Cost per billable hour', safeDivide(totalCost, billableHours), 'currency',
        'Total cost of running the practice, including a market allowance for your own fee-earning work, divided by realistic billable hours.'),
      measure('Collection rate', safeDivide(collected, billed), 'percent',
        'Fees collected as a share of fees billed. Follow the same cohort of invoices rather than mixing periods.'),
      measure('Debtor days', safeDivide(receivables, dailyBilled), 'days',
        'Unpaid bills divided by average daily billings. How long clients take to pay once billed.'),
      measure('Cash reserve', safeDivide(officeCash, monthlyOutgoings), 'months',
        'Unrestricted office cash divided by a month of outgoings. Client money is never counted here.'),
      measure('Matter contribution margin', safeDivide(matterFee - matterCost, matterFee), 'percent',
        'Fee collected on a matter less its full cost, as a share of the fee.')
    ],
    additional: [
      measure('Realisation', safeDivide(billed, recorded), 'percent',
        'Fees billed as a share of recorded value. Meaningful for hourly work; do not apply it to fixed fees.'),
      measure('Unbilled work', safeDivide(unbilled, dailyBilled), 'days',
        'Work done and not yet billed, expressed in days of fees.'),
      measure('Real profit', billed - overhead - ownerLabour, 'currency',
        'Fees billed less overhead and less a market cost for your own labour. What rewards ownership and risk.'),
      measure('Technology return', techContribution - techCost, 'currency',
        'Incremental contribution actually collected, less what the tools cost. Not hypothetical fees.')
    ],
    compliance: {
      label: 'Client-account reconciliation completed to',
      note: 'A mandatory compliance check under the Legal Profession (Accounts and Records) Regulations, 1999, as amended. It is not a performance measure and does not belong in the commercial figures above.'
    }
  };
}

function measure(label, value, kind, definition) {
  return { label, value, kind, definition };
}

/* ------------------------------------------------------- F. diagnostic */

/**
 * Five self-reported answers. This returns management priorities, not a score
 * and not a view on whether a practice is financially healthy.
 */
export const DIAGNOSTIC_QUESTIONS = [
  {
    id: 'cost',
    question: 'Do you know the full cost of one billable hour in your practice?',
    options: [
      { value: 'yes', label: 'Yes, calculated within the last year', weight: 0 },
      { value: 'roughly', label: 'Roughly, from memory or instinct', weight: 1 },
      { value: 'no', label: 'No', weight: 2 }
    ],
    priority: {
      title: 'Cost your hour before you price anything',
      body: 'A price cannot be tested against a cost you have not calculated. Start with the cost per hour calculator and use your real overhead, including a market allowance for your own fee-earning work.',
      link: 'cost-per-hour.html'
    }
  },
  {
    id: 'pricing',
    question: 'How do you usually price professional services?',
    options: [
      { value: 'mixed', label: 'A mix, chosen to suit the work', weight: 0 },
      { value: 'fixed', label: 'Mostly fixed or staged fees', weight: 0 },
      { value: 'hourly', label: 'Almost always hourly, or hourly with a cap', weight: 1 },
      { value: 'percentage', label: 'Mostly a percentage or customary figure', weight: 2 }
    ],
    priority: {
      title: 'Test one type of work priced by stage',
      body: 'Choose work that can responsibly be scoped and compare the four arrangements on your own numbers. A cap is still hourly billing underneath.',
      link: 'fees.html'
    }
  },
  {
    id: 'collection',
    question: 'Do you track how long clients take to pay?',
    options: [
      { value: 'monthly', label: 'Yes, reviewed at least monthly', weight: 0 },
      { value: 'sometimes', label: 'Occasionally, when cash is tight', weight: 1 },
      { value: 'no', label: 'No', weight: 2 }
    ],
    priority: {
      title: 'Measure the gap between billing and payment',
      body: 'Work, record, bill and collect are four separate events, often months apart. Only the last one pays salaries. Model your own billing and collection delays.',
      link: 'cash-flow.html'
    }
  },
  {
    id: 'engagement',
    question: 'Do your engagement letters define scope, exclusions and payment milestones?',
    options: [
      { value: 'yes', label: 'Yes, all three, in writing', weight: 0 },
      { value: 'partly', label: 'Scope, but not exclusions or payment dates', weight: 1 },
      { value: 'no', label: 'No, or not consistently', weight: 2 }
    ],
    priority: {
      title: 'Redraft one engagement letter',
      body: 'Stages, assumptions, exclusions, payment before each stage and a priced change process. Appendix B of the paper is a model clause to adapt, not to adopt unread.',
      link: 'resources.html'
    }
  },
  {
    id: 'review',
    question: 'How often do you review the financial performance of the practice?',
    options: [
      { value: 'monthly', label: 'Monthly, against figures I prepare', weight: 0 },
      { value: 'quarterly', label: 'Quarterly or at year end', weight: 1 },
      { value: 'rarely', label: 'Rarely, or only when a problem appears', weight: 2 }
    ],
    priority: {
      title: 'Put five measures on one page each month',
      body: 'Cost per billable hour, collection rate, debtor days, cash reserve and matter contribution margin. Compare them with your own history rather than imported benchmarks.',
      link: 'scorecard.html'
    }
  }
];

export function diagnose(answers) {
  const scored = DIAGNOSTIC_QUESTIONS.map((q) => {
    const chosen = q.options.find((o) => o.value === answers[q.id]);
    return { id: q.id, weight: chosen ? chosen.weight : 0, answered: Boolean(chosen), priority: q.priority, label: chosen ? chosen.label : null };
  });

  const answered = scored.filter((s) => s.answered);
  const priorities = scored
    .filter((s) => s.answered && s.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((s) => s.priority);

  // Where everything is already in hand, point at depth rather than invent a problem.
  if (priorities.length === 0 && answered.length > 0) {
    priorities.push(
      { title: 'Compare matters, not averages', body: 'Firm-wide averages hide matters that lose money. Compare the fee collected on a completed stage with its own cost and a fair share of overhead.', link: 'fees.html' },
      { title: 'Test whether the technology pays', body: 'Released time is capacity. Measure whether it became collected contribution or simply reduced an invoice.', link: 'ai.html' }
    );
  }

  return {
    answeredCount: answered.length,
    totalCount: DIAGNOSTIC_QUESTIONS.length,
    priorities,
    firstAction: priorities.length
      ? priorities[0]
      : { title: 'Start with the cost of an hour', body: 'It is the figure every other decision rests on.', link: 'cost-per-hour.html' },
    caveat: 'These are possible management priorities drawn from five self-reported answers. This is not a financial audit and it says nothing about whether your practice is financially healthy.'
  };
}

/* ------------------------------------------------------- shared formatting */

export function clampRate(value, fallback) {
  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) return fallback;
  const rate = n > 1.0000001 ? n / 100 : n; // accepts 92 or 0.92
  return Math.min(Math.max(rate, 0), 10);
}

export function fmt(value) {
  if (value === null || !Number.isFinite(value)) return '—';
  const negative = value < 0;
  const abs = Math.abs(value);
  const text = abs >= 1000
    ? Math.round(abs).toLocaleString('en-JM')
    : abs.toLocaleString('en-JM', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${negative ? '-$' : '$'}${text}`;
}

export function pct(value, places = 1) {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${round(value * 100, places)}%`;
}

export const PAPER_PRESETS = {
  costPerHour: {
    label: 'The paper’s teaching figures',
    salaries: 0, premises: 0, utilities: 0, insurance: 0, software: 0,
    professional: 0, administration: 0, other: 1600000,
    ownerLabour: 900000, billableHours: 110,
    utilisation: 1, realisation: 0.85, collection: 0.92, targetSurplus: 0
  },
  fees: {
    label: 'Worked Example 2: a contested debt claim',
    expectedHours: 40, hourlyRate: 35000, costPerHour: 22727.27,
    cap: 1400000, fixedFee: 1500000, hybridStageOne: 1100000,
    laterStageShare: 0.25, collection: 1, extraCosts: 0, contingency: 0
  },
  cashFlow: {
    label: 'Worked Example 1: profitable on paper, short of cash',
    months: 12, openingCash: 1000000,
    recordedValue: 3500000, recordedValueAfterGrowth: 5400000, growthMonth: 4,
    overhead: 1600000, overheadAfterGrowth: 2300000,
    drawings: 900000, realisation: 0.85, collection: 0.92,
    billingDelay: 1, collectionDelay: 2
  },
  ai: {
    label: 'Worked Example 3: the AI saving',
    tasks: 20, baselineHours: 3, draftMinutes: 40, reviewMinutes: 30,
    subscription: 30000, setup: 60000, setupMonths: 12,
    hourlyRate: 35000, realisation: 0.85, collection: 0.92,
    redeployment: 0.5, extraCostPerHour: 0
  }
};
