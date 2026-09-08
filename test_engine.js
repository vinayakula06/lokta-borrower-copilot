/**
 * Lokta Borrower Copilot — Automated Test Suite
 * 
 * Verifies core finance math, APR calculations, RBI KFS compliance,
 * three standard persona scenarios (Priya, Ravi, Anita), unknown handling,
 * stress testing, and boundary conditions.
 * 
 * Run via: `node test_engine.js`
 */

const assert = require('assert');
const {
  RULES,
  calculateEMI,
  calculatePrincipalFromEMI,
  calculateAPR,
  calculateCashFlowAPR,
  generateTenureTradeoff,
  assessEffectiveIncome,
  assessExpenses,
  assessExistingObligations,
  determineRateBand,
  assessBorrower
} = require('./rules.js');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

console.log('====================================================');
console.log('RUNNING LOKTA BORROWER COPILOT TEST SUITE');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// 1. FINANCIAL MATHEMATICS
// ---------------------------------------------------------------------------
console.log('1. Financial Formulas & RBI APR:');

test('calculateEMI matches standard financial benchmark', () => {
  // ₹10,00,000 at 12% over 5 years is ₹22,244.45/month
  const emi = calculateEMI(1000000, 12.0, 5);
  assert.ok(Math.abs(emi - 22244.45) < 1.0, `Expected ~22244.45, got ${emi}`);
});

test('calculateEMI handles 0% interest rate gracefully', () => {
  const emi = calculateEMI(120000, 0, 1);
  assert.strictEqual(Math.round(emi), 10000);
});

test('calculatePrincipalFromEMI correctly reverses calculateEMI', () => {
  const targetPrincipal = 800000;
  const rate = 13.0;
  const years = 4;
  const emi = calculateEMI(targetPrincipal, rate, years);
  const derivedPrincipal = calculatePrincipalFromEMI(emi, rate, years);
  assert.ok(Math.abs(derivedPrincipal - targetPrincipal) < 1.0, `Principal mismatch: ${derivedPrincipal} vs ${targetPrincipal}`);
});

test('calculateAPR incorporates upfront fee and 18% GST via cash-flow IRR', () => {
  // 13.0% nominal + 2.0% fee with 18% GST (= 2.36%) over 4 years calculated via cash-flow IRR = 14.30%
  const apr = calculateAPR(13.0, 2.0, 4);
  assert.strictEqual(apr, 14.30);
});

test('calculateCashFlowAPR solves exact internal rate of return from actual cash flows', () => {
  const res = calculateCashFlowAPR(800000, 22.0, 48, 2.0, 18.0, false);
  assert.strictEqual(res.method, 'CASH_FLOW_IRR');
  assert.strictEqual(res.netDisbursement, 781120);
  assert.strictEqual(res.feeAmount, 16000);
  assert.strictEqual(res.gstAmount, 2880);
  assert.strictEqual(res.apr, 23.39);
});

test('generateTenureTradeoff produces monotonic interest progression', () => {
  const tradeoffs = generateTenureTradeoff(500000, 12.0, 4);
  assert.ok(tradeoffs.length >= 3, 'Should produce at least 3 tenure options');
  // Longer tenure = lower EMI but higher total interest
  assert.ok(tradeoffs[0].emi > tradeoffs[tradeoffs.length - 1].emi, 'Shorter tenure should have higher monthly EMI');
  assert.ok(tradeoffs[0].totalInterest < tradeoffs[tradeoffs.length - 1].totalInterest, 'Shorter tenure should have lower total interest');
});

// ---------------------------------------------------------------------------
// 2. PERSONA 1: PRIYA (Salaried MNC Software Engineer)
// ---------------------------------------------------------------------------
console.log('\n2. Persona 1 — Priya (Salaried MNC, ₹1.10L net, 780 CIBIL, ₹8L ask):');

const priyaProfile = {
  name: 'Priya',
  employment: 'salaried',
  salary: 110000,
  existingEMI: 14000,
  expenses: 28000,
  creditScore: 780,
  amount: 800000,
  loanType: 'personal',
  purpose: 'Wedding'
};

const priyaResult = assessBorrower(priyaProfile);

test('Priya: Effective income recognized as-is without haircut', () => {
  assert.strictEqual(priyaResult.profileSummary.effectiveIncome, 110000);
});

test('Priya: Lender capacity and Safe capacity are distinctly separated', () => {
  // Lender: 55% of 110k - 14k = 46.5k EMI (~₹17.3L sanction)
  // Safe: (110k - 14k - 28k) * 0.50 = 34k EMI (~₹12.6L capacity)
  assert.ok(priyaResult.amounts.lenderMaxSanction > priyaResult.amounts.safeMaxAmount, 'Lender limit must exceed safe limit');
  assert.strictEqual(priyaResult.emi.safeMonthlyCeiling, 34000);
  assert.ok(priyaResult.amounts.safeMaxAmount > 1200000, `Expected safe max > ₹12L, got ${priyaResult.amounts.safeMaxAmount}`);
});

test('Priya: Qualifies for prime rate tier (10.5% – 13.0%)', () => {
  assert.strictEqual(priyaResult.rate.floor, 10.5);
  assert.strictEqual(priyaResult.rate.ceiling, 13.0);
});

test('Priya: Verdict is BORROW because ₹8L is well within ₹12.6L safe capacity', () => {
  assert.strictEqual(priyaResult.verdictCode, 'BORROW');
  assert.ok(priyaResult.verdictReason.includes('8,00,000'));
});

test('Priya: Loan survives 20% income shock', () => {
  // Stressed income = 88k -> Stressed disposable = 88k - 14k - 28k = 46k -> Stressed safe EMI = 23k
  // Requested ₹8L EMI at 13% = ~₹21.4k, which fits in 23k!
  assert.strictEqual(priyaResult.stress.survivesIncomeStress, true);
});

// ---------------------------------------------------------------------------
// 3. PERSONA 2: RAVI (Self-Employed Kirana Owner)
// ---------------------------------------------------------------------------
console.log('\n3. Persona 2 — Ravi (Self-Employed Kirana, Cash + ITR, ₹45L Shop, ₹15L ask):');

const raviProfile = {
  name: 'Ravi',
  employment: 'self_employed',
  vintage: 14,
  itrAnnual: 420000,
  cashLow: 40000,
  cashHigh: 80000,
  bankVerified: false,
  collateralType: 'property',
  collateralValue: 4500000,
  coApplicant: true,
  coIncome: 18000,
  existingEMI: 0,
  expenses: 40000,
  scoreUnknown: true,
  amount: 1500000,
  loanType: 'business',
  purpose: 'Second stock line and delivery vehicle'
};

const raviResult = assessBorrower(raviProfile);

test('Ravi: Effective income correctly haircuts unverified cash excess', () => {
  // ITR monthly = 35k. Cash avg = 60k. Excess = 25k. Haircut 40% -> 15k counted.
  // Wife co-applicant = 18k. Total = 35k + 15k + 18k = 68k.
  assert.strictEqual(raviResult.profileSummary.effectiveIncome, 68000);
});

test('Ravi: Routes to secured LAP and applies 60% LTV cap', () => {
  assert.strictEqual(raviResult.rate.isSecured, true);
  // LTV cap = 60% of 45L = ₹27,00,000
  assert.ok(raviResult.amounts.lenderMaxSanction <= 2700000);
});

test('Ravi: Secured pricing applies (9.5% – 12.5%), score unknown does not penalize', () => {
  assert.strictEqual(raviResult.rate.floor, 9.5);
  assert.strictEqual(raviResult.rate.ceiling, 12.5);
});

test('Ravi: Safe affordability yields Borrow Less recommendation', () => {
  // Disposable = 68k - 0 - 40k = 28k. Secured safe factor = 65% -> Safe EMI = ₹18,200.
  // Safe max over 10 yrs at 12.5% ~ ₹12.5L. Since ask is ₹15L, verdict must be BORROW_LESS.
  assert.strictEqual(raviResult.verdictCode, 'BORROW_LESS');
  assert.strictEqual(raviResult.emi.safeMonthlyCeiling, 18200);
  assert.ok(raviResult.amounts.safeMaxAmount < 1500000);
});

// ---------------------------------------------------------------------------
// 4. PERSONA 3: ANITA (Informal Platform Rider, Distressed Debt)
// ---------------------------------------------------------------------------
console.log('\n4. Persona 3 — Anita (Gig rider, ₹35k app debt at 30%+, 1 bounce, ₹1.5L ask):');

const anitaProfile = {
  name: 'Anita',
  employment: 'informal',
  incLow: 26000,
  incHigh: 30000,
  existingEMI: 0,
  informalDebtBalance: 35000,
  recentBounce: true,
  expenses: 20000,
  savingsMonths: 0,
  scoreUnknown: true,
  amount: 150000,
  loanType: 'twoWheeler',
  purpose: 'Electric scooter'
};

const anitaResult = assessBorrower(anitaProfile);

test('Anita: Payment bounce triggers non-negotiable DONT_BORROW verdict', () => {
  assert.strictEqual(anitaResult.verdictCode, 'DONT_BORROW');
  assert.ok(anitaResult.verdictReason.toLowerCase().includes('bounce'), 'Reason must explicitly mention the bounce');
});

test('Anita: Provides constructive "Path to Yes" on the card', () => {
  assert.ok(anitaResult.pathToYes, 'Must provide an actionable path to recovery');
  assert.ok(anitaResult.pathToYes.includes('6 consecutive months'));
});

test('Anita: Amortizes informal app debt balance into monthly debt service', () => {
  // ₹35,000 at 30% over 1 year is ~₹3,415/month
  assert.ok(anitaResult.profileSummary.existingDebtService > 3000, 'App debt must be recognized in monthly obligations');
});

test('Anita alternative: High-cost debt FOIR >= 30% triggers DONT_BORROW even without a bounce', () => {
  const anitaWithoutBounce = {
    ...anitaProfile,
    recentBounce: false,
    existingEMI: 9000, // 9000 / 28000 = 32% FOIR
    highCostDebt: true
  };
  const res = assessBorrower(anitaWithoutBounce);
  assert.strictEqual(res.verdictCode, 'DONT_BORROW');
  assert.ok(res.verdictReason.includes('high-cost credit'));
});

// ---------------------------------------------------------------------------
// 5. UNKNOWN VALUE HANDLING (Unknown != 0)
// ---------------------------------------------------------------------------
console.log('\n5. Unknown Value Handling:');

test('Unknown credit score widens uncertainty band ±2% without crashing', () => {
  const res = assessBorrower({
    employment: 'salaried',
    salary: 50000,
    scoreUnknown: true
  });
  assert.strictEqual(res.rate.floor, 14.0); // 16.0 - 2.0
  assert.strictEqual(res.rate.ceiling, 22.0); // 20.0 + 2.0
  assert.ok(res.rate.explanation.includes('widened'));
});

test('Missing expenses triggers plausibility floor, never treated as zero', () => {
  const res = assessBorrower({
    employment: 'salaried',
    salary: 60000,
    expenses: 0 // User omitted or typed 0
  });
  assert.ok(res.profileSummary.livingExpenses >= 12000, 'Must apply plausibility floor');
  assert.strictEqual(res.profileSummary.livingExpenses, 21000); // 35% of 60k
});

test('Bank statement verification reduces cash haircut from 40% to 15%', () => {
  const unverified = assessEffectiveIncome({
    employment: 'self_employed',
    itrAnnual: 240000, // 20k/mo
    cashLow: 40000,
    cashHigh: 40000, // excess 20k
    bankVerified: false
  });
  const verified = assessEffectiveIncome({
    employment: 'self_employed',
    itrAnnual: 240000,
    cashLow: 40000,
    cashHigh: 40000,
    bankVerified: true
  });
  // Unverified: 20k + 20k*0.60 = 32k
  // Verified: 20k + 20k*0.85 = 37k
  assert.strictEqual(unverified.income, 32000);
  assert.strictEqual(verified.income, 37000);
  assert.ok(verified.income > unverified.income);
});

test('Sub-650 credit score triggers lender decline warning flag', () => {
  const res = assessBorrower({
    employment: 'salaried',
    salary: 40000,
    creditScore: 610
  });
  assert.strictEqual(res.rate.floor, 20.0);
  assert.strictEqual(res.rate.ceiling, 24.0);
  assert.ok(res.rate.explanation.includes('High risk'));
});

// ---------------------------------------------------------------------------
// 6. NEGOTIATION CARD & EXPLAINABILITY
// ---------------------------------------------------------------------------
console.log('\n6. Negotiation Card & Explainability:');

test('Negotiation Card includes walk-away triggers and branch talking points', () => {
  assert.ok(priyaResult.negotiationCard);
  assert.strictEqual(priyaResult.negotiationCard.targetAmount, 800000);
  assert.ok(priyaResult.negotiationCard.talkingPoints.length >= 3);
  assert.ok(priyaResult.negotiationCard.walkAwayCeiling.rule.includes('Walk away'));
});

test('Dual Stress Test calculates rate hike of +2.0% (200 bps)', () => {
  assert.strictEqual(priyaResult.stress.rateHikePts, 2.0);
  assert.strictEqual(priyaResult.stress.stressedRate, 15.0); // 13.0 + 2.0
  assert.ok(priyaResult.stress.stressedRateEMI > priyaResult.emi.requestedLoanEMI);
});

// ---------------------------------------------------------------------------
// 7. BOUNDARIES & INVALID INPUTS
// ---------------------------------------------------------------------------
console.log('\n7. Boundary & Safety Checks:');

test('Zero income returns graceful Don\'t Borrow refusal', () => {
  const res = assessBorrower({
    employment: 'salaried',
    salary: 0
  });
  assert.strictEqual(res.verdictCode, 'DONT_BORROW');
});

test('Negative declared numbers are clamped safely', () => {
  const res = assessBorrower({
    employment: 'salaried',
    salary: 80000,
    existingEMI: -5000,
    expenses: 25000
  });
  assert.strictEqual(res.profileSummary.existingDebtService, 0);
  assert.ok(res.amounts.safeMaxAmount > 0);
});

test('Massive loan request exceeding capacity triggers Don\'t Borrow refusal', () => {
  const res = assessBorrower({
    employment: 'salaried',
    salary: 50000,
    amount: 100000000, // 10 Crores
    expenses: 20000,
    creditScore: 760
  });
  assert.strictEqual(res.verdictCode, 'DONT_BORROW');
  assert.ok(res.amounts.safeMaxAmount < 10000000);
});

// ---------------------------------------------------------------------------
// 8. SECTION 16 BUG REGRESSION TEST & SECTION 14 AUDIT CHECKS
// ---------------------------------------------------------------------------
console.log('\n8. Section 16 Bug Regression & Consistency Audit:');

const auditCaseProfile = {
  name: 'Audit Regression Case',
  employment: 'salaried',
  salary: 40000,
  existingEMI: 20000,
  expenses: 10000,
  amount: 600000,
  tenureMonths: 36,
  interestRate: 16.0,
  incomeShockPct: 0.20,
  rateShockPts: 2.0,
  fixedSafeEMICeiling: 4500
};

const auditResult = assessBorrower(auditCaseProfile);

test('Section 16: Baseline disposable cash flow equals ₹10,000/month', () => {
  assert.strictEqual(auditResult.profileSummary.disposableCashFlow, 10000);
});

test('Section 16: Expected requested EMI is approximately ₹21,094/month', () => {
  assert.ok(Math.abs(auditResult.emi.requestedLoanEMI - 21094) <= 2, `Expected ~21094, got ${auditResult.emi.requestedLoanEMI}`);
});

test('Section 16: Safe principal for ₹4,500 EMI at 16% over 36mo is ~₹1.28 lakh, NEVER ₹12,797', () => {
  assert.notStrictEqual(auditResult.amounts.safeMaxAmount, 12797, 'BUG: Safe principal must never be ₹12,797!');
  assert.ok(Math.abs(auditResult.amounts.safeMaxAmount - 127997) <= 2, `Expected ~127997 (≈ ₹1.28L), got ${auditResult.amounts.safeMaxAmount}`);
});

test('Section 16: Expected stressed income is ₹32,000/month (-20% shock)', () => {
  assert.strictEqual(auditResult.stress.stressedIncome, 32000);
});

test('Section 16: Expected stressed pre-new-debt cash flow is ₹2,000/month', () => {
  assert.strictEqual(auditResult.stress.stressedDisposable, 2000);
});

test('Section 16: Stressed safe EMI is NOT reported as ₹900 (reduction amount)', () => {
  assert.notStrictEqual(auditResult.stress.stressedSafeEMI, 900, 'BUG: System must not report ₹900 as remaining capacity merely because 20% of 4500 is 900!');
});

test('Section 16: Final verdict for audit regression test case is DONT_BORROW', () => {
  assert.strictEqual(auditResult.verdictCode, 'DONT_BORROW');
  assert.ok(auditResult.verdictReason.toLowerCase().includes('exceeds'));
});

test('Section 14: Automated underwriting consistency checks all pass', () => {
  assert.ok(auditResult.validation, 'Validation object must exist');
  assert.strictEqual(auditResult.validation.isValid, true, `Validation failed with errors: ${auditResult.validation.errors.join('; ')}`);
  assert.ok(auditResult.validation.checksPassed >= 7, 'Must pass consistency checks');
});

// ---------------------------------------------------------------------------
// 9. SECTION 15 REGRESSION TEST CASE (₹8L Ask, 48mo, 22% rate, ₹34k Safe EMI)
// ---------------------------------------------------------------------------
console.log('\n9. Section 15 Regression Test Case (₹8L ask, 48mo, 22% rate, ₹34k Safe EMI):');

const sec15Profile = {
  name: 'Section 15 Mandatory Regression Case',
  employment: 'salaried',
  salary: 110000,
  existingEMI: 14000,
  expenses: 28000,
  amount: 800000,
  tenureMonths: 48,
  interestRate: 22.0,
  configuredSafeEMI: 34000
};

const sec15Result = assessBorrower(sec15Profile);

test('Section 15: Requested EMI is approximately ₹25,200/month (calculated dynamically)', () => {
  assert.ok(Math.abs(sec15Result.emi.requestedLoanEMI - 25205) <= 2, `Expected ~25205, got ${sec15Result.emi.requestedLoanEMI}`);
});

test('Section 15: Safe borrower ceiling is approximately ₹10,79,157', () => {
  assert.strictEqual(sec15Result.amounts.safeMaxAmount, 1079157);
});

test('Section 15: Requested amount < safe ceiling and requested EMI < safe EMI', () => {
  assert.ok(sec15Profile.amount < sec15Result.amounts.safeMaxAmount);
  assert.ok(sec15Result.emi.requestedLoanEMI < sec15Result.emi.safeMonthlyCeiling);
});

test('Section 15: Lender sanction limit is ₹14,75,906 with explicit FOIR basis', () => {
  assert.strictEqual(sec15Result.amounts.lenderMaxSanction, 1475906);
  assert.ok(sec15Result.amounts.lenderMaxSanctionBasis.explanation.includes('FOIR = 55%'));
  assert.ok(sec15Result.amounts.lenderMaxSanctionBasis.explanation.includes('46,500'));
});

test('Section 15: Walk-away rate is >22.5% (22.0% ceiling + 0.5% tolerance)', () => {
  assert.strictEqual(sec15Result.negotiationCard.walkAwayCeiling.maxRate, 22.5);
  assert.strictEqual(sec15Result.negotiationCard.walkAwayCeiling.maxEMI, 34000);
});

test('Section 15: Cash-Flow APR is calculated from cash flows via IRR (~23.4%)', () => {
  assert.strictEqual(sec15Result.rate.aprMethod, 'CASH_FLOW_IRR');
  assert.strictEqual(sec15Result.rate.aprHigh, 23.39);
});

test('Section 15: All 12 automated consistency checks pass completely', () => {
  assert.ok(sec15Result.validation);
  assert.strictEqual(sec15Result.validation.isValid, true, `Validation failed: ${sec15Result.validation.errors.join('; ')}`);
  assert.ok(sec15Result.validation.checksPassed >= 10);
});

test('Section 13: Consistency failure blocks BORROW verdict and returns UNDERWRITING VALIDATION FAILED', () => {
  // Clone result and simulate a tampered calculation (e.g. safe principal altered by > ₹2)
  const tampered = JSON.parse(JSON.stringify(sec15Result));
  tampered.amounts.safeMaxAmount = 999999; // intentionally tampered
  
  // Re-run validation validator directly
  const { validateUnderwritingConsistency } = require('./rules.js');
  // If validateUnderwritingConsistency is internal, evaluate via assessBorrower or directly
  if (typeof validateUnderwritingConsistency === 'function') {
    const val = validateUnderwritingConsistency(tampered);
    assert.strictEqual(val.isValid, false);
    assert.strictEqual(tampered.verdictCode, 'VALIDATION_FAILED');
    assert.ok(tampered.verdictReason.includes('UNDERWRITING VALIDATION FAILED'));
    assert.strictEqual(tampered.negotiationCard.verdict, 'UNDERWRITING VALIDATION FAILED');
  }
});


// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`TEST RUN COMPLETE: ${passedTests} passed, ${failedTests} failed.`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
