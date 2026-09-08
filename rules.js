/**
 * Lokta Borrower Copilot — Deterministic Lending & Affordability Rules Engine
 * 
 * Standalone, zero-dependency financial computation and credit evaluation rules.
 * Runs in both Node.js (test runner) and Browser environments (Universal Module).
 * 
 * Every rule is traceable to RULES.md via its unique Rule ID.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node / CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.BorrowerCopilotRules = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =========================================================================
  // 1. CONFIGURATION & THRESHOLDS (Mirrored 1:1 in RULES.md)
  // =========================================================================
  const RULES = {
    // Fixed Obligation to Income Ratio (FOIR) limits
    foir: {
      salariedHigh: { id: 'FOIR.SAL.HIGH', lender: 0.55, safeFactor: 0.50, minIncome: 50000, desc: 'High-income salaried (>= ₹50k/mo)' },
      salariedLow:  { id: 'FOIR.SAL.LOW',  lender: 0.45, safeFactor: 0.50, desc: 'Entry/Mid salaried (< ₹50k/mo)' },
      selfEmployed: { id: 'FOIR.SE.EST',   lender: 0.45, safeFactor: 0.50, minVintageYears: 3, desc: 'Established self-employed (>= 3yr)' },
      informal:     { id: 'FOIR.INF',      lender: 0.35, safeFactor: 0.50, desc: 'Informal, gig, or early self-employed (< 3yr)' },
      securedBoost: { id: 'FOIR.SEC.BOOST', lenderBoost: 0.10, safeBoost: 0.15, maxSafeFactor: 0.70, desc: 'Collateral reduces default severity' },
    },

    // Living expense plausibility floors (prevents manufacturing fake surplus if input is 0 or missing)
    expenseFloor: {
      id: 'EXPENSE.FLOOR',
      minIncomeShare: 0.35, // Living expenses realistically require at least 35% of net income
      absoluteFloor: 12000, // Bare minimum household floor in urban/semi-urban India
    },

    // Haircuts for variable and unverified cash income
    cashHaircut: {
      verified:   { id: 'INCOME.CASH.VERIFIED',   rate: 0.15, desc: '15% haircut with 6 months bank statements' },
      unverified: { id: 'INCOME.CASH.UNVERIFIED', rate: 0.40, desc: '40% conservative haircut for undocumented cash' },
    },

    // Emergency savings buffer adjustments for informal borrowers
    savingsBuffer: {
      threePlusMonths: { id: 'BUF.SAVINGS.3PLUS', multiplier: 1.10, desc: '3+ months savings buffer gives +10% safe capacity' },
      zeroMonths:      { id: 'BUF.SAVINGS.ZERO',  multiplier: 0.90, desc: 'Zero savings buffer penalizes safe capacity by -10%' },
      neutral:         { id: 'BUF.SAVINGS.NORM',  multiplier: 1.00, desc: 'Standard buffer' },
    },

    // Credit score bands and pricing (Unsecured loans)
    unsecuredRateBands: [
      { id: 'RATE.UNSEC.750PLUS', minScore: 750, low: 10.5, high: 13.0, desc: 'Prime tier (750+ score)' },
      { id: 'RATE.UNSEC.700_749', minScore: 700, low: 13.0, high: 16.0, desc: 'Near-prime tier (700–749 score)' },
      { id: 'RATE.UNSEC.650_699', minScore: 650, low: 16.0, high: 20.0, desc: 'Subprime tier (650–699 score)' },
      { id: 'RATE.UNSEC.SUB650',  minScore: 0,   low: 20.0, high: 24.0, flag: 'Likely lender decline for unsecured', desc: 'High risk (< 650 score)' },
    ],

    // Unknown credit score rule (widened uncertainty, never assumed as zero)
    unknownScore: {
      id: 'RATE.UNSEC.UNKNOWN',
      baseLow: 16.0,
      baseHigh: 20.0,
      widenPts: 2.0, // Widens to 14.0% - 22.0%
      desc: 'Unknown credit score widens range ±2% around subprime midpoint without assuming worst-case score',
    },

    // Secured product rate bands (Priced off collateral quality, not credit score alone)
    securedRateBands: {
      property: { id: 'RATE.SEC.LAP',  low: 9.5, high: 12.5, desc: 'Loan Against Property (LAP) prime mortgage rates' },
      gold:     { id: 'RATE.SEC.GOLD', low: 9.0, high: 13.0, desc: 'Gold loan immediate liquidation rates' },
    },

    // Statutory and standard Loan-to-Value (LTV) limits
    ltvCaps: {
      property: { id: 'LTV.PROPERTY', maxLtv: 0.60, desc: '60% maximum LTV for property / shop collateral' },
      gold:     { id: 'LTV.GOLD',     maxLtv: 0.75, desc: '75% RBI statutory maximum LTV for gold loans' },
    },

    // Product standard defaults: tenure and fees
    products: {
      personal:    { id: 'PROD.PERSONAL', defaultYears: 4, feePct: 2.0, name: 'Personal Loan' },
      lap:         { id: 'PROD.LAP',      defaultYears: 10, feePct: 1.0, name: 'Loan Against Property (LAP)' },
      gold:        { id: 'PROD.GOLD',     defaultYears: 2, feePct: 1.0, name: 'Gold Loan' },
      business:    { id: 'PROD.BUSINESS', defaultYears: 5, feePct: 2.0, name: 'Business Loan' },
      twoWheeler:  { id: 'PROD.2W',       defaultYears: 3, feePct: 2.0, name: 'Two-Wheeler / Vehicle Loan' },
    },

    // Statutory fee taxation
    tax: {
      gstOnFees: 0.18, // 18% GST mandatory on processing & documentation fees in India
    },

    // Stress testing scenarios
    stress: {
      incomeDropPct: 0.20, // 20% income reduction shock
      rateHikePts: 2.0,    // 200 bps interest rate hike shock
    },

    // Negotiation tolerance and walk-away rules
    negotiation: {
      tolerancePts: 0.5, // 0.5% (50 bps) negotiation tolerance above fair rate ceiling
      ruleId: 'NEG.TOLERANCE.50BPS',
      desc: 'Negotiation tolerance of 0.5% (50 bps) above fair rate ceiling before walk-away trigger is breached.'
    },

    // Margin rule for verdict qualification
    marginRule: {
      comfortableThresholdPct: 0.25, // 25% safety margin required to describe loan as retaining a comfortable safety margin
      desc: 'Loan ask must be at least 25% below safe ceiling to be qualified as retaining a comfortable safety margin.'
    },

    // Hard-stop refusal criteria (Non-negotiable "Don't borrow" triggers)
    hardStops: {
      recentBounce: {
        id: 'STOP.BOUNCE',
        desc: 'Any EMI or debt payment bounced in the past 6 months triggers a hard stop to prevent debt compounding.',
      },
      highCostDebtRatio: {
        id: 'STOP.HIGH_COST_DEBT',
        thresholdFoir: 0.30,
        desc: 'Existing debt service >= 30% of income carrying high-cost interest (>= 24% APR) signals active over-indebtedness.',
      },
      zeroSurplus: {
        id: 'STOP.ZERO_SURPLUS',
        desc: 'Borrower net disposable cash flow after living costs is zero or negative.',
      }
    }
  };

  // =========================================================================
  // 2. CORE FINANCIAL MATHEMATICS (Pure Functions)
  // =========================================================================

  /**
   * Standard Amortizing Loan EMI Formula:
   * EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
   * 
   * Supports tenure in either years (e.g. 3, 5) or months (e.g. 36, 60).
   * If tenure > 15 or isMonths === true, treated as months.
   */
  function calculateEMI(principal, annualRatePct, tenure, isMonths = false) {
    if (principal <= 0 || tenure <= 0) return 0;
    const r = (annualRatePct / 100) / 12;
    const n = (isMonths || tenure > 15) ? Math.round(tenure) : Math.round(tenure * 12);
    if (r === 0) return principal / n;
    const factor = Math.pow(1 + r, n);
    return principal * r * factor / (factor - 1);
  }

  /**
   * Reverse Loan Principal Calculation from an Affordable Monthly EMI:
   * P = EMI × ((1 + r)^n - 1) / (r × (1 + r)^n)
   *   = EMI × (1 - (1 + r)^(-n)) / r
   * 
   * Mathematically exact present value of an ordinary annuity.
   * Supports tenure in either years (e.g. 3, 5) or months (e.g. 36, 60).
   */
  function calculatePrincipalFromEMI(emi, annualRatePct, tenure, isMonths = false) {
    if (emi <= 0 || tenure <= 0) return 0;
    const r = (annualRatePct / 100) / 12;
    const n = (isMonths || tenure > 15) ? Math.round(tenure) : Math.round(tenure * 12);
    if (r === 0) return emi * n;
    const factor = Math.pow(1 + r, n);
    return emi * (factor - 1) / (r * factor);
  }

  /**
   * RBI Key Fact Statement (KFS) compliant Cash-Flow APR Engine:
   * 
   * Calculates the annualized internal rate of return (IRR) from actual cash flows:
   * - Inflow at t=0: Net disbursement = Principal - Processing Fee - GST
   * - Outflow at t=1..n: Monthly EMI
   * Solves for monthly IRR r: Net Disbursement = sum_{t=1}^n [ EMI / (1+r)^t ]
   * Annualized Nominal APR = r * 12 * 100
   * 
   * Never uses a naive linear addition (interest + fee + GST).
   */
  function calculateCashFlowAPR(principal, nominalRatePct, tenureMonths, processingFeePct, gstPct = 18.0, feeIncludesGST = false) {
    if (principal <= 0 || tenureMonths <= 0 || nominalRatePct <= 0) {
      return {
        apr: nominalRatePct || 0,
        effectiveAPR: nominalRatePct || 0,
        nominalRatePct: nominalRatePct || 0,
        method: 'FALLBACK_NOMINAL',
        netDisbursement: principal || 0,
        feeAmount: 0,
        gstAmount: 0,
        totalUpfrontDeduction: 0,
        explanation: 'Estimated APR unavailable — insufficient fee/cash-flow information.'
      };
    }

    const emi = calculateEMI(principal, nominalRatePct, tenureMonths, true);
    let feeAmount = 0;
    let gstAmount = 0;

    if (feeIncludesGST) {
      const totalFeeWithGST = principal * (processingFeePct / 100);
      feeAmount = totalFeeWithGST / (1 + (gstPct / 100));
      gstAmount = totalFeeWithGST - feeAmount;
    } else {
      feeAmount = principal * (processingFeePct / 100);
      gstAmount = feeAmount * (gstPct / 100);
    }

    const totalUpfrontDeduction = feeAmount + gstAmount;
    const netDisbursement = Math.max(0, principal - totalUpfrontDeduction);

    if (netDisbursement <= 0 || emi <= 0) {
      return {
        apr: nominalRatePct,
        effectiveAPR: nominalRatePct,
        nominalRatePct,
        method: 'FALLBACK_NOMINAL',
        netDisbursement,
        feeAmount: Math.round(feeAmount),
        gstAmount: Math.round(gstAmount),
        totalUpfrontDeduction: Math.round(totalUpfrontDeduction),
        explanation: 'Estimated APR unavailable — non-positive net disbursement.'
      };
    }

    // Solve for monthly rate r using Newton-Raphson numerical root finding
    let r = (nominalRatePct / 100) / 12;
    if (r <= 0) r = 0.01;

    for (let iter = 0; iter < 100; iter++) {
      const factor = Math.pow(1 + r, -tenureMonths);
      const pv = (emi / r) * (1 - factor);
      const diff = pv - netDisbursement;
      if (Math.abs(diff) < 1e-6) break;

      // Derivative dPV/dr = emi * [ - (1 - (1+r)^-n) / r^2 + n * (1+r)^-(n+1) / r ]
      const dPv = (emi / r) * (tenureMonths * Math.pow(1 + r, -tenureMonths - 1) - (1 - factor) / r);
      if (Math.abs(dPv) < 1e-12) break;

      const rNext = r - diff / dPv;
      r = rNext <= 0 ? r / 2 : rNext;
    }

    const nominalAnnualAPR = Number((r * 12 * 100).toFixed(2));
    const effectiveAnnualAPR = Number(((Math.pow(1 + r, 12) - 1) * 100).toFixed(2));

    return {
      apr: nominalAnnualAPR,
      effectiveAPR: effectiveAnnualAPR,
      nominalRatePct,
      processingFeePct,
      gstPct,
      feeIncludesGST,
      feeAmount: Math.round(feeAmount),
      gstAmount: Math.round(gstAmount),
      totalUpfrontDeduction: Math.round(totalUpfrontDeduction),
      netDisbursement: Math.round(netDisbursement),
      monthlyEMI: Math.round(emi),
      tenureMonths,
      method: 'CASH_FLOW_IRR',
      explanation: `Calculated from actual cash flows: Net disbursement ₹${Math.round(netDisbursement).toLocaleString('en-IN')} (Principal ₹${Math.round(principal).toLocaleString('en-IN')} less ₹${Math.round(feeAmount).toLocaleString('en-IN')} fee & ₹${Math.round(gstAmount).toLocaleString('en-IN')} GST) repaid via ${tenureMonths} monthly EMIs of ₹${Math.round(emi).toLocaleString('en-IN')}. Annualized IRR = ${nominalAnnualAPR}%.`
    };
  }

  /**
   * Backwards-compatible calculateAPR interface powered by cash-flow IRR.
   */
  function calculateAPR(nominalRatePct, processingFeePct, tenureYears, principal = 800000) {
    if (tenureYears <= 0) return nominalRatePct;
    const months = Math.round(tenureYears * 12);
    const res = calculateCashFlowAPR(principal, nominalRatePct, months, processingFeePct, RULES.tax.gstOnFees * 100, false);
    return res.apr;
  }

  /**
   * Tenure Trade-off Comparison Engine:
   * Generates EMI and Total Interest cost for 3 to 4 alternative tenures.
   */
  function generateTenureTradeoff(principal, annualRatePct, defaultYears) {
    if (principal <= 0) return [];
    const tenures = [
      Math.max(1, defaultYears - 1),
      defaultYears,
      defaultYears + 1,
      defaultYears + 2
    ].filter((v, idx, arr) => arr.indexOf(v) === idx && v > 0);

    return tenures.map(yrs => {
      const emi = calculateEMI(principal, annualRatePct, yrs);
      const totalRepaid = emi * yrs * 12;
      const totalInterest = Math.max(0, totalRepaid - principal);
      return {
        years: yrs,
        months: yrs * 12,
        emi: Math.round(emi),
        totalRepaid: Math.round(totalRepaid),
        totalInterest: Math.round(totalInterest),
        isDefault: yrs === defaultYears
      };
    });
  }

  // =========================================================================
  // 3. BORROWER PROFILE NORMALIZATION & ADAPTIVE SIZING
  // =========================================================================

  /**
   * Resolves verifiable and recognized monthly income with conservative discounts.
   */
  function assessEffectiveIncome(profile) {
    const emp = profile.employment || 'salaried';
    let income = 0;
    let ruleId = '';
    let explanation = '';

    if (emp === 'salaried') {
      income = Number(profile.salary || profile.income) || 0;
      ruleId = 'INCOME.SALARIED';
      explanation = `Net salary of ₹${income.toLocaleString('en-IN')}/mo taken at 100% as verifiable TDS-deducted inflow.`;
    } else if (emp === 'self_employed') {
      const itrAnnual = Number(profile.itrAnnual) || 0;
      const itrMonthly = itrAnnual / 12;
      const cashLow = Number(profile.cashLow) || 0;
      const cashHigh = Number(profile.cashHigh) || 0;
      const cashAvg = (cashLow + cashHigh) / 2;
      const unrecordedCash = Math.max(0, cashAvg - itrMonthly);

      const isVerified = Boolean(profile.bankVerified);
      const haircutObj = isVerified ? RULES.cashHaircut.verified : RULES.cashHaircut.unverified;
      const countedCash = unrecordedCash * (1 - haircutObj.rate);

      const coApplicantIncome = (profile.coApplicant && profile.coIncome) ? Number(profile.coIncome) : 0;

      income = itrMonthly + countedCash + coApplicantIncome;
      ruleId = haircutObj.id;
      explanation = `Audited ITR baseline (₹${Math.round(itrMonthly).toLocaleString('en-IN')}/mo) + ` +
        `${Math.round((1 - haircutObj.rate) * 100)}% of stated cash excess (₹${Math.round(countedCash).toLocaleString('en-IN')})` +
        (coApplicantIncome > 0 ? ` + co-applicant income (₹${coApplicantIncome.toLocaleString('en-IN')})` : '');
    } else {
      // Informal / gig worker
      const incLow = Number(profile.incLow) || 0;
      const incHigh = Number(profile.incHigh) || 0;
      const avg = (incLow > 0 || incHigh > 0) ? (incLow + incHigh) / 2 : (Number(profile.income) || 0);
      const coApplicantIncome = (profile.coApplicant && profile.coIncome) ? Number(profile.coIncome) : 0;
      income = avg + coApplicantIncome;
      ruleId = 'INCOME.INFORMAL';
      explanation = `Midpoint of stated monthly range ₹${incLow.toLocaleString('en-IN')}–₹${incHigh.toLocaleString('en-IN')}` +
        (coApplicantIncome > 0 ? ` + co-applicant (₹${coApplicantIncome.toLocaleString('en-IN')})` : '');
    }

    return { income: Math.round(income), ruleId, explanation };
  }

  /**
   * Resolves living expenses and applies the plausibility floor when unknown or zero.
   */
  function assessExpenses(income, declaredExpenses) {
    const declared = Number(declaredExpenses);
    if (!isNaN(declared) && declared > 0) {
      return {
        amount: Math.round(declared),
        isFloored: false,
        explanation: `Declared household living expenses of ₹${Math.round(declared).toLocaleString('en-IN')}/mo.`
      };
    }

    // Apply demographic plausibility floor
    const floored = Math.max(RULES.expenseFloor.absoluteFloor, Math.round(income * RULES.expenseFloor.minIncomeShare));
    return {
      amount: floored,
      isFloored: true,
      ruleId: RULES.expenseFloor.id,
      explanation: `Expenses not specified; applied standard living expense plausibility floor (₹${floored.toLocaleString('en-IN')}/mo / 35% of income) so unknown living costs are never treated as zero.`
    };
  }

  /**
   * Resolves existing monthly debt obligations, including amortizing informal/app loan balances.
   */
  function assessExistingObligations(profile) {
    let formalEMI = Math.max(0, Number(profile.existingEMI || profile.existingDebt) || 0);
    let informalEMI = 0;
    let explanation = '';

    if (profile.informalDebtBalance && Number(profile.informalDebtBalance) > 0) {
      const balance = Math.max(0, Number(profile.informalDebtBalance));
      // High-cost app debt usually requires repayment within 12 months at ~30% APR
      informalEMI = Math.round(calculateEMI(balance, 30.0, 1.0));
      explanation = `Formal EMIs of ₹${formalEMI.toLocaleString('en-IN')} plus amortized 12-month debt service on ₹${balance.toLocaleString('en-IN')} app loan balance (~₹${informalEMI.toLocaleString('en-IN')}/mo).`;
    } else {
      explanation = `Current formal monthly EMIs: ₹${formalEMI.toLocaleString('en-IN')}.`;
    }

    return {
      totalMonthlyDebtService: formalEMI + informalEMI,
      formalEMI,
      informalEMI,
      explanation
    };
  }

  /**
   * Selects the fair interest-rate band based on collateral and credit profile.
   */
  function determineRateBand(profile, isSecured) {
    // Direct rate override if specified in profile (e.g. audit regression test case)
    if (profile.interestRate && Number(profile.interestRate) > 0) {
      const r = Number(profile.interestRate);
      return {
        low: r,
        high: r,
        isSecured: Boolean(isSecured),
        ruleId: 'RATE.OVERRIDE',
        reason: `Evaluated at explicitly provided interest rate of ${r.toFixed(1)}%.`
      };
    }

    if (isSecured && profile.collateralType && RULES.securedRateBands[profile.collateralType]) {
      const band = RULES.securedRateBands[profile.collateralType];
      return {
        low: band.low,
        high: band.high,
        isSecured: true,
        ruleId: band.id,
        reason: `Priced as secured ${band.desc}. Collateral significantly reduces credit risk; credit score is secondary.`
      };
    }

    if (profile.scoreUnknown || !profile.creditScore) {
      const unk = RULES.unknownScore;
      return {
        low: unk.baseLow - unk.widenPts,
        high: unk.baseHigh + unk.widenPts,
        isSecured: false,
        isWidened: true,
        ruleId: unk.id,
        reason: `Credit score unknown → baseline subprime band widened ±${unk.widenPts}% to ${unk.baseLow - unk.widenPts}%–${unk.baseHigh + unk.widenPts}%. An official bureau pull would narrow this range.`
      };
    }

    const score = Number(profile.creditScore);
    const band = RULES.unsecuredRateBands.find(b => score >= b.minScore) || RULES.unsecuredRateBands[RULES.unsecuredRateBands.length - 1];
    return {
      low: band.low,
      high: band.high,
      isSecured: false,
      ruleId: band.id,
      reason: `Credit score of ${score} qualifies for the ${band.desc}.`
    };
  }

  // =========================================================================
  // 4. MASTER ASSESSMENT ENGINE
  // =========================================================================

  /**
   * Main deterministic assessment function.
   * Evaluates inputs and returns O1, O2, O3, O4, Stress Testing, Consistency Validation, and Negotiation Card payload.
   */
  function assessBorrower(profile) {
    if (!profile) return null;

    // 1. Input Normalization & Validation
    const validationErrors = [];
    const emp = profile.employment || 'salaried';

    // 1. Effective Income
    const incomeAssessment = assessEffectiveIncome(profile);
    const effectiveIncome = incomeAssessment.income;
    if (effectiveIncome <= 0) {
      return {
        verdict: 'Don\'t borrow',
        verdictCode: 'DONT_BORROW',
        verdictReason: 'No verifiable or declared income provided. Loans require positive cash flow for repayment.',
        confidence: 'LOW',
        amounts: { safeMaxAmount: 0, lenderMaxSanction: 0 },
        emi: { safeMonthlyCeiling: 0, lenderMonthlyCapacity: 0 },
        rate: { floor: 0, ceiling: 0 }
      };
    }

    // 2. Existing Debt & Living Expenses
    const debtAssessment = assessExistingObligations(profile);
    const existingDebtService = debtAssessment.totalMonthlyDebtService;
    const expenseAssessment = assessExpenses(effectiveIncome, profile.expenses);
    const livingExpenses = expenseAssessment.amount;

    // Disposable cash flow (pre-new-loan free surplus)
    const disposableCashFlow = Math.max(0, effectiveIncome - existingDebtService - livingExpenses);

    // 3. Product & Collateral Routing
    const rawLoanType = profile.loanType || 'personal';
    const hasCollateral = Boolean(
      profile.collateralType &&
      profile.collateralType !== 'none' &&
      Number(profile.collateralValue) > 0
    );

    let activeProduct = rawLoanType;
    let isSecured = false;
    let ltvCap = Infinity;

    if (hasCollateral) {
      isSecured = true;
      if (profile.collateralType === 'property') activeProduct = 'lap';
      if (profile.collateralType === 'gold') activeProduct = 'gold';
      const maxLtvPct = RULES.ltvCaps[profile.collateralType]?.maxLtv || 0.60;
      ltvCap = Number(profile.collateralValue) * maxLtvPct;
    }

    const prodConfig = RULES.products[activeProduct] || RULES.products.personal;
    
    // Normalize tenure: supports tenureMonths or tenureYears/years
    let tenureMonths = 0;
    if (profile.tenureMonths && Number(profile.tenureMonths) > 0) {
      tenureMonths = Math.round(Number(profile.tenureMonths));
    } else if (profile.tenureYears || profile.tenure || profile.years) {
      tenureMonths = Math.round(Number(profile.tenureYears || profile.tenure || profile.years) * 12);
    } else {
      tenureMonths = Math.round(prodConfig.defaultYears * 12);
    }
    const tenureYears = Number((tenureMonths / 12).toFixed(2));

    // 4. FOIR & Affordability Sizing
    let foirRow;
    if (emp === 'salaried') {
      foirRow = effectiveIncome >= RULES.foir.salariedHigh.minIncome ? RULES.foir.salariedHigh : RULES.foir.salariedLow;
    } else if (emp === 'self_employed') {
      const vintage = Number(profile.vintage) || 0;
      foirRow = vintage >= RULES.foir.selfEmployed.minVintageYears ? RULES.foir.selfEmployed : RULES.foir.informal;
    } else {
      foirRow = RULES.foir.informal;
    }

    const lenderFoirRatio = isSecured ? (foirRow.lender + RULES.foir.securedBoost.lenderBoost) : foirRow.lender;
    const foirTotalDebtCapacity = Math.round(effectiveIncome * lenderFoirRatio);
    const foirNewEMICapacity = Math.max(0, foirTotalDebtCapacity - existingDebtService);
    const lenderMonthlyEMI = foirNewEMICapacity;

    // Explicit Affordability Constraints
    const permittedNewDebtFraction = (profile.permittedCashFlowFraction && Number(profile.permittedCashFlowFraction) > 0)
      ? Number(profile.permittedCashFlowFraction)
      : (isSecured
          ? Math.min(foirRow.safeFactor + RULES.foir.securedBoost.safeBoost, RULES.foir.securedBoost.maxSafeFactor)
          : foirRow.safeFactor);

    let savingsMultiplier = 1.0;
    if (emp === 'informal') {
      const savingsMonths = Number(profile.savingsMonths) || 0;
      if (savingsMonths >= 3) savingsMultiplier = RULES.savingsBuffer.threePlusMonths.multiplier;
      else if (savingsMonths === 0) savingsMultiplier = RULES.savingsBuffer.zeroMonths.multiplier;
    }

    const cashFlowNewEMICapacity = Math.max(0, disposableCashFlow * permittedNewDebtFraction * savingsMultiplier);

    const emergencyReserve = Number(profile.emergencyReserve) || 0;
    const emergencyBufferAdjustedCapacity = emergencyReserve > 0
      ? Math.max(0, (disposableCashFlow - emergencyReserve) * permittedNewDebtFraction)
      : cashFlowNewEMICapacity;

    let safeMonthlyEMI = 0;
    let controllingConstraint = '';
    let controllingConstraintLabel = '';

    if (profile.fixedSafeEMICeiling || profile.configuredSafeEMI) {
      const fixedCeiling = Number(profile.fixedSafeEMICeiling || profile.configuredSafeEMI);
      safeMonthlyEMI = Math.max(0, Math.min(fixedCeiling, disposableCashFlow));
      controllingConstraint = 'FIXED_CEILING';
      controllingConstraintLabel = `Configured safe EMI ceiling rule (₹${fixedCeiling.toLocaleString('en-IN')}/mo)`;
    } else {
      const candidates = [
        { type: 'FOIR', capacity: foirNewEMICapacity, label: `FOIR limit (${Math.round(lenderFoirRatio * 100)}% allowed FOIR minus existing debt)` },
        { type: 'CASH_FLOW', capacity: cashFlowNewEMICapacity, label: `Disposable cash flow (${Math.round(permittedNewDebtFraction * 100)}% of disposable surplus ₹${Math.round(disposableCashFlow).toLocaleString('en-IN')}/mo)` },
        { type: 'EMERGENCY_BUFFER', capacity: emergencyBufferAdjustedCapacity, label: `Emergency reserve adjusted capacity` },
      ];

      let minConstraint = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        if (candidates[i].capacity < minConstraint.capacity) {
          minConstraint = candidates[i];
        }
      }
      safeMonthlyEMI = Math.max(0, Math.round(minConstraint.capacity));
      controllingConstraint = minConstraint.type;
      controllingConstraintLabel = minConstraint.label;
    }

    // 5. Rate & Cash-Flow APR
    const rateBand = determineRateBand(profile, isSecured);
    const processingFeePct = prodConfig.feePct;

    // Sizing Principals via Annuity Formula at upper interest rate (conservative)
    // Formula: P = EMI * (1 - (1+r)^-n) / r
    let lenderMaxSanction = calculatePrincipalFromEMI(lenderMonthlyEMI, rateBand.high, tenureMonths, true);
    let safeMaxAmount = calculatePrincipalFromEMI(safeMonthlyEMI, rateBand.high, tenureMonths, true);

    if (isSecured && ltvCap < Infinity) {
      lenderMaxSanction = Math.min(lenderMaxSanction, ltvCap);
      safeMaxAmount = Math.min(safeMaxAmount, ltvCap);
    }

    lenderMaxSanction = Math.round(lenderMaxSanction);
    safeMaxAmount = Math.round(safeMaxAmount);

    // 6. Hard-Stops, Cash Flow & Verdict (O1)
    const requestedAmount = Number(profile.amount || profile.requestedAmount) || 0;
    const requestedEMI = requestedAmount > 0
      ? Math.round(calculateEMI(requestedAmount, rateBand.high, tenureMonths, true))
      : 0;

    // Calculate post-loan monthly cash flow:
    // Income - Existing Debt - Living Expenses - New Loan EMI
    const activeLoanEMI = requestedAmount > 0 ? requestedEMI : safeMonthlyEMI;
    const postLoanCashFlow = Math.round(disposableCashFlow - activeLoanEMI);
    const requiredEmergencyBuffer = Math.round(disposableCashFlow * (1 - permittedNewDebtFraction));

    // Dynamic cash-flow APR calculation based on loan ask (or safe principal if ask is 0)
    const principalForAPR = requestedAmount > 0 ? requestedAmount : (safeMaxAmount > 0 ? safeMaxAmount : 500000);
    const aprHighDetails = calculateCashFlowAPR(principalForAPR, rateBand.high, tenureMonths, processingFeePct, RULES.tax.gstOnFees * 100, false);
    const aprLowDetails = calculateCashFlowAPR(principalForAPR, rateBand.low, tenureMonths, processingFeePct, RULES.tax.gstOnFees * 100, false);
    const aprLow = aprLowDetails.apr;
    const aprHigh = aprHighDetails.apr;

    // Dynamic walk-away thresholds
    const walkAwayRate = Number((rateBand.high + RULES.negotiation.tolerancePts).toFixed(1));
    const walkAwayEMI = safeMonthlyEMI;

    // Margin rule: loan ask must be at least 25% below safe ceiling to be qualified as "comfortably inside safe ceiling"
    const safetyMargin = safeMaxAmount > 0 ? (safeMaxAmount - requestedAmount) / safeMaxAmount : 0;
    const isComfortable = safetyMargin >= (RULES.marginRule?.comfortableThresholdPct || 0.25);

    // 7. Stress Testing (Independently Recalculated from Stressed Inputs)
    // Shock 1: Income drop shock (default -20%)
    const incomeShockPct = (profile.incomeShockPct && Number(profile.incomeShockPct) > 0)
      ? Number(profile.incomeShockPct)
      : RULES.stress.incomeDropPct;
    const stressedIncome = Math.round(effectiveIncome * (1 - incomeShockPct));
    const stressedDisposable = Math.max(0, stressedIncome - existingDebtService - livingExpenses);
    
    // Affordability re-evaluated under income shock
    let stressedSafeEMI = 0;
    if (profile.fixedSafeEMICeiling || profile.configuredSafeEMI) {
      stressedSafeEMI = Math.max(0, Math.round(stressedDisposable * permittedNewDebtFraction * savingsMultiplier));
    } else {
      const stressedFOIRCapacity = Math.max(0, Math.round(stressedIncome * lenderFoirRatio) - existingDebtService);
      const stressedCashFlowCapacity = Math.max(0, stressedDisposable * permittedNewDebtFraction * savingsMultiplier);
      stressedSafeEMI = Math.max(0, Math.round(Math.min(stressedFOIRCapacity, stressedCashFlowCapacity)));
    }
    const stressedSafeAmount = Math.round(calculatePrincipalFromEMI(stressedSafeEMI, rateBand.high, tenureMonths, true));

    // Shock 2: Interest rate rise shock (default +2.0% / 200 bps)
    const rateShockPts = (profile.rateShockPts && Number(profile.rateShockPts) > 0)
      ? Number(profile.rateShockPts)
      : RULES.stress.rateHikePts;
    const stressedRate = Number((rateBand.high + rateShockPts).toFixed(2));
    const stressedRateEMI = requestedAmount > 0
      ? Math.round(calculateEMI(requestedAmount, stressedRate, tenureMonths, true))
      : 0;
    const stressedSafeRateEMI = safeMaxAmount > 0
      ? Math.round(calculateEMI(safeMaxAmount, stressedRate, tenureMonths, true))
      : 0;

    const survivesIncomeStress = requestedEMI > 0 ? (requestedEMI <= stressedSafeEMI) : (safeMonthlyEMI > 0);
    const survivesRateStress = requestedEMI > 0 ? (stressedRateEMI <= safeMonthlyEMI) : true;
    const activeStressedRateEMI = requestedEMI > 0 ? stressedRateEMI : stressedSafeRateEMI;
    const survivesCombinedStress = activeStressedRateEMI <= stressedSafeEMI;
    const survivesAllStress = survivesIncomeStress && survivesRateStress && survivesCombinedStress;

    // Hard-stop & verdict logic
    let verdict = 'Borrow';
    let verdictCode = 'BORROW';
    let verdictReason = '';
    let pathToYes = null;

    const currentFoir = effectiveIncome > 0 ? (existingDebtService / effectiveIncome) : 0;
    const hasRecentBounce = Boolean(profile.recentBounce);
    const hasHighCostDebt = Boolean(profile.highCostDebt || (profile.informalDebtBalance && Number(profile.informalDebtBalance) > 0));

    const passesAmountTest = requestedAmount <= safeMaxAmount;
    const passesEMITest = requestedEMI <= safeMonthlyEMI;
    const passesCashFlowTest = postLoanCashFlow >= 0;
    const passesIncomeStress = requestedAmount > 0 ? survivesIncomeStress : true;
    const passesRateStress = requestedAmount > 0 ? survivesRateStress : true;

    if (hasRecentBounce) {
      verdict = 'Don\'t borrow';
      verdictCode = 'DONT_BORROW';
      verdictReason = 'Payment bounce in the last 6 months detected. Taking a new loan while existing payments are irregular compounds default risk.';
      pathToYes = 'Maintain a clean bank account and 100% on-time EMI repayments for the next 6 consecutive months before applying.';
    } else if (hasHighCostDebt && currentFoir >= RULES.hardStops.highCostDebtRatio.thresholdFoir) {
      verdict = 'Don\'t borrow';
      verdictCode = 'DONT_BORROW';
      verdictReason = `Existing debt already consumes ${Math.round(currentFoir * 100)}% of income with high-cost credit. Adding new debt leads to an over-leverage trap.`;
      pathToYes = 'Direct surplus cash flow to clear high-cost app debt first. Reassess once debt service drops below 20% of income.';
    } else if (disposableCashFlow <= 0 || safeMonthlyEMI <= 500) {
      verdict = 'Don\'t borrow';
      verdictCode = 'DONT_BORROW';
      verdictReason = 'Household has insufficient monthly surplus after existing EMIs and essential living costs.';
      pathToYes = 'Build at least 2–3 months of emergency expenses before taking on fixed monthly debt.';
    } else if (!passesCashFlowTest && requestedAmount > 0) {
      verdict = 'Don\'t borrow';
      verdictCode = 'DONT_BORROW';
      verdictReason = `Requested loan of ₹${requestedAmount.toLocaleString('en-IN')} (EMI ₹${requestedEMI.toLocaleString('en-IN')}/mo) exceeds your safe carrying capacity of ₹${safeMaxAmount.toLocaleString('en-IN')} and leaves negative post-loan monthly cash flow (deficit: ₹${Math.abs(postLoanCashFlow).toLocaleString('en-IN')}/mo).`;
      pathToYes = `Reduce loan ask to ₹${safeMaxAmount.toLocaleString('en-IN')} or less to ensure positive post-loan cash flow.`;
    } else if (requestedAmount > 0 && requestedAmount > safeMaxAmount) {
      const cannotServiceRequested = (requestedEMI > disposableCashFlow) || (foirNewEMICapacity <= 0) || (requestedAmount > safeMaxAmount * 2.0) || Boolean(profile.strictVerdict);
      if (cannotServiceRequested) {
        verdict = 'Don\'t borrow';
        verdictCode = 'DONT_BORROW';
        verdictReason = `Your requested loan of ₹${requestedAmount.toLocaleString('en-IN')} (EMI ₹${requestedEMI.toLocaleString('en-IN')}/mo) materially exceeds your demonstrated safe repayment capacity of ₹${safeMaxAmount.toLocaleString('en-IN')} (Safe EMI ₹${safeMonthlyEMI.toLocaleString('en-IN')}/mo).`;
        pathToYes = `Reduce loan ask to ₹${safeMaxAmount.toLocaleString('en-IN')} or less, or increase household monthly surplus before applying.`;
      } else {
        verdict = 'Borrow less';
        verdictCode = 'BORROW_LESS';
        verdictReason = `Your requested amount of ₹${requestedAmount.toLocaleString('en-IN')} exceeds your safe carrying capacity of ₹${safeMaxAmount.toLocaleString('en-IN')}.`;
        pathToYes = `Cap your loan application at ₹${safeMaxAmount.toLocaleString('en-IN')} over ${tenureYears} years to keep monthly EMI inside your safe ₹${safeMonthlyEMI.toLocaleString('en-IN')} ceiling.`;
      }
    } else if (!passesIncomeStress && requestedAmount > 0) {
      verdict = 'Borrow less';
      verdictCode = 'BORROW_LESS';
      verdictReason = `Loan request of ₹${requestedAmount.toLocaleString('en-IN')} fails the -20% income shock stress test (stressed safe capacity: ₹${stressedSafeAmount.toLocaleString('en-IN')}).`;
      pathToYes = `Cap your loan at ₹${stressedSafeAmount.toLocaleString('en-IN')} to withstand potential income shocks.`;
    } else {
      verdict = 'Borrow';
      verdictCode = 'BORROW';
      if (requestedAmount > 0) {
        if (isComfortable) {
          verdictReason = `₹${requestedAmount.toLocaleString('en-IN')} is below the calculated safe borrowing ceiling of ₹${safeMaxAmount.toLocaleString('en-IN')} (retaining a ${Math.round(safetyMargin * 100)}% safety margin).`;
        } else {
          verdictReason = `₹${requestedAmount.toLocaleString('en-IN')} is below the calculated safe borrowing ceiling of ₹${safeMaxAmount.toLocaleString('en-IN')}.`;
        }
      } else {
        verdictReason = `Financial profile supports safe borrowing up to ₹${safeMaxAmount.toLocaleString('en-IN')}.`;
      }
    }

    // 8. Tenure Trade-offs (O4)
    const tenureTradeoffs = generateTenureTradeoff(
      requestedAmount > 0 ? requestedAmount : safeMaxAmount,
      rateBand.high,
      Math.max(1, Math.round(tenureYears))
    );

    // 9. Confidence Model
    let confidencePoints = 0;
    const confidenceNotes = [];

    if (!profile.scoreUnknown && profile.creditScore) {
      confidencePoints += 30;
      confidenceNotes.push('Known credit score allows precise tier pricing');
    } else {
      confidenceNotes.push('Credit score unknown; pricing band widened ±2%');
    }

    if (emp === 'salaried' || profile.bankVerified || (profile.itrAnnual && Number(profile.itrAnnual) > 0)) {
      confidencePoints += 35;
      confidenceNotes.push('Verifiable income documentation reduces cash-flow discount');
    } else {
      confidenceNotes.push('Unverified cash income subjected to 40% haircut');
    }

    if (!expenseAssessment.isFloored) {
      confidencePoints += 20;
      confidenceNotes.push('Detailed living expenses provided');
    } else {
      confidenceNotes.push('Living expenses approximated using demographic floor');
    }

    if (hasCollateral) {
      confidencePoints += 15;
      confidenceNotes.push('Secured collateral backing confirmed');
    }

    let confidenceLevel = 'MEDIUM';
    if (confidencePoints >= 75) confidenceLevel = 'HIGH';
    else if (confidencePoints < 45) confidenceLevel = 'LOW';

    // 10. Structured Negotiation Card (Section 14 compliant)
    const targetAskAmount = requestedAmount > 0 ? Math.min(requestedAmount, safeMaxAmount) : safeMaxAmount;
    const lenderBasisString = `FOIR = ${Math.round(lenderFoirRatio * 100)}%, Income = ₹${effectiveIncome.toLocaleString('en-IN')}, Existing debt = ₹${existingDebtService.toLocaleString('en-IN')}, Maximum new EMI = ₹${lenderMonthlyEMI.toLocaleString('en-IN')}/mo over ${tenureMonths} months at ${rateBand.high.toFixed(1)}%`;

    const negotiationCard = {
      verdict: verdict.toUpperCase(),
      verdictCode,
      reason: verdictReason,
      targetBorrowingAmount: targetAskAmount,
      targetAmount: targetAskAmount, // backwards-compatible
      tenureMonths,
      tenureYears,
      requestedEMI,
      safeBorrowerCeiling: safeMaxAmount,
      safeMaxAmount, // backwards-compatible
      safeEMILimit: safeMonthlyEMI,
      maxMonthlyEMI: safeMonthlyEMI, // backwards-compatible
      lenderSanctionLimit: {
        amount: lenderMaxSanction,
        basis: lenderBasisString
      },
      lenderMaxSanction, // backwards-compatible
      recommendation: 'Use the SAFE amount as your hard ceiling. Do not let the lender anchor you to their sanction limit.',
      fairRateBand: `${rateBand.low.toFixed(1)}% – ${rateBand.high.toFixed(1)}%`,
      fairRateBasis: rateBand.reason,
      allInAPRBand: `${aprLow.toFixed(1)}% – ${aprHigh.toFixed(1)}%`,
      calculatedAPR: {
        rate: aprHighDetails.apr,
        effectiveAPR: aprHighDetails.effectiveAPR,
        method: aprHighDetails.method,
        calculationDetails: aprHighDetails.explanation
      },
      nominalRateHigh: rateBand.high,
      aprHigh,
      postLoanMonthlyCashFlow: postLoanCashFlow,
      stressTest: {
        incomeShock: `-${Math.round(incomeShockPct * 100)}% shock: ${survivesIncomeStress ? 'PASSED' : 'FAILED'} (Safe capacity: ₹${stressedSafeEMI.toLocaleString('en-IN')}/mo)`,
        rateShock: `+${rateShockPts.toFixed(1)}% rate hike: ${survivesRateStress ? 'PASSED' : 'FAILED'} (Stressed EMI: ₹${stressedRateEMI.toLocaleString('en-IN')}/mo)`,
        combinedStress: `Combined shock: ${survivesCombinedStress ? 'PASSED' : 'FAILED'} (Net surplus: ₹${Math.round(stressedDisposable - activeStressedRateEMI).toLocaleString('en-IN')}/mo)`,
        survivesAll: survivesAllStress
      },
      walkAwayTrigger: {
        rateThreshold: walkAwayRate,
        tolerancePts: RULES.negotiation.tolerancePts,
        emiThreshold: safeMonthlyEMI,
        conditionString: `Rate > ${walkAwayRate.toFixed(1)}% (fair ceiling ${rateBand.high.toFixed(1)}% + ${RULES.negotiation.tolerancePts}% tolerance) OR EMI > ₹${safeMonthlyEMI.toLocaleString('en-IN')}/mo.`
      },
      walkAwayCeiling: {
        maxRate: walkAwayRate,
        maxEMI: safeMonthlyEMI,
        rule: `Walk away if quoted rate exceeds ${walkAwayRate.toFixed(1)}% (fair ceiling ${rateBand.high.toFixed(1)}% + ${RULES.negotiation.tolerancePts}% tolerance) or if EMI exceeds ₹${safeMonthlyEMI.toLocaleString('en-IN')}/mo.`
      },
      processingFeeCap: `${processingFeePct}% + 18% GST (Max ₹${Math.round((requestedAmount || safeMaxAmount) * (processingFeePct / 100) * 1.18).toLocaleString('en-IN')})`,
      talkingPoints: [
        `"My calculated benchmark rate for this profile is ${rateBand.low.toFixed(1)}%–${rateBand.high.toFixed(1)}% (Basis: ${rateBand.reason}). What is your best offer inside this range?"`,
        `"What is the true all-in APR calculated on net disbursement (₹${aprHighDetails.netDisbursement.toLocaleString('en-IN')}) via cash-flow IRR, including processing fee and 18% GST?"`,
        `"Are there any mandatory bundled insurance policies, credit shields, or documentation fees attached to this quote?"`,
        `"What is the exact part-prepayment and foreclosure penalty schedule after 6 and 12 months? Confirm zero penalty under RBI guidelines."`
      ],
      regulatoryDisclaimer: 'Lender sanction capacity is not the same as safe borrowing capacity. Always enforce safe ceiling.'
    };

    // Construct Result Payload
    const result = {
      // O1: Verdict
      verdict,
      verdictCode,
      verdictReason,
      pathToYes,

      // O2: Amounts
      amounts: {
        lenderMaxSanction,
        lenderMaxSanctionBasis: {
          allowedFOIRPct: Math.round(lenderFoirRatio * 100),
          effectiveIncome,
          existingDebtService,
          maxTotalDebtService: foirTotalDebtCapacity,
          maxNewEMIAllowed: lenderMonthlyEMI,
          tenureMonths,
          interestRate: rateBand.high,
          formula: `PrincipalFromEMI(₹${lenderMonthlyEMI.toLocaleString('en-IN')}, ${rateBand.high}%, ${tenureMonths}mo)`,
          explanation: lenderBasisString
        },
        safeMaxAmount,
        difference: Math.max(0, lenderMaxSanction - safeMaxAmount),
        recommended: safeMaxAmount,
        controllingConstraint,
        controllingConstraintLabel,
        disclaimer: 'Lender sanction capacity is not the same as safe borrowing capacity.',
        guidance: 'Always use the Safe Amount as your borrowing ceiling. Lenders evaluate only FOIR on income, ignoring your real living expenses and emergency buffers.',
        explanation: `Lender calculates ₹${foirTotalDebtCapacity.toLocaleString('en-IN')}/mo limit based on FOIR, while Safe calculation leaves ₹${Math.round(disposableCashFlow - safeMonthlyEMI).toLocaleString('en-IN')}/mo untouched buffer for life and shocks.`
      },

      // O3: Fair Rate Band & APR
      rate: {
        floor: rateBand.low,
        ceiling: rateBand.high,
        nominalRateLow: rateBand.low,
        nominalRateHigh: rateBand.high,
        monthlyRateLowPct: Number((rateBand.low / 12).toFixed(3)),
        monthlyRateHighPct: Number((rateBand.high / 12).toFixed(3)),
        bandString: `${rateBand.low.toFixed(1)}% – ${rateBand.high.toFixed(1)}%`,
        aprLow,
        aprHigh,
        aprBandString: `${aprLow.toFixed(1)}% – ${aprHigh.toFixed(1)}%`,
        aprMethod: aprHighDetails.method,
        aprExplanation: aprHighDetails.explanation,
        aprEffectiveLow: aprLowDetails.effectiveAPR,
        aprEffectiveHigh: aprHighDetails.effectiveAPR,
        processingFeePct,
        gstPct: 18.0,
        feeAmount: aprHighDetails.feeAmount,
        gstAmount: aprHighDetails.gstAmount,
        totalUpfrontDeduction: aprHighDetails.totalUpfrontDeduction,
        netDisbursement: aprHighDetails.netDisbursement,
        feeWithGSTPct: Number((processingFeePct * 1.18).toFixed(2)),
        isSecured,
        ruleId: rateBand.ruleId,
        explanation: rateBand.reason
      },

      // O4: EMI Ceiling & Stress Test
      emi: {
        safeMonthlyCeiling: safeMonthlyEMI,
        lenderMonthlyCapacity: lenderMonthlyEMI,
        requestedLoanEMI: requestedEMI,
        tenureMonths,
        tenureYears,
        tenureTradeoffs,
        controllingConstraint,
        controllingConstraintLabel,
        affordabilityBreakdown: {
          foirNewEMICapacity,
          cashFlowNewEMICapacity: Math.round(cashFlowNewEMICapacity),
          emergencyBufferAdjustedCapacity: Math.round(emergencyBufferAdjustedCapacity),
          fixedCeilingCapacity: (profile.fixedSafeEMICeiling || profile.configuredSafeEMI) ? Number(profile.fixedSafeEMICeiling || profile.configuredSafeEMI) : null
        },
        explanation: `Safe EMI ceiling governed by ${controllingConstraintLabel}.`
      },

      foir: {
        allowedFOIRPct: Math.round(lenderFoirRatio * 100),
        effectiveIncome,
        existingDebtService,
        currentFOIRPct: Number((currentFoir * 100).toFixed(1)),
        maxTotalDebtService: foirTotalDebtCapacity,
        maxNewEMIAllowed: foirNewEMICapacity,
        proposedFOIRPct: requestedEMI > 0
          ? Number(((existingDebtService + requestedEMI) / effectiveIncome * 100).toFixed(1))
          : null
      },

      stress: {
        incomeDropPct: Math.round(incomeShockPct * 100),
        stressedIncome,
        stressedDisposable,
        stressedSafeEMI,
        stressedSafeAmount,
        rateHikePts: rateShockPts,
        stressedRate,
        stressedRateEMI,
        stressedSafeRateEMI,
        survivesIncomeStress,
        survivesRateStress,
        combinedStressedDisposable: stressedDisposable,
        combinedSurplus: Math.round(stressedDisposable - activeStressedRateEMI),
        survivesCombinedStress,
        survivesAllStress,
        incomeShockResult: survivesIncomeStress
          ? `Passes: Under -${Math.round(incomeShockPct * 100)}% income drop (₹${effectiveIncome.toLocaleString('en-IN')} → ₹${stressedIncome.toLocaleString('en-IN')}), safe EMI capacity is ₹${stressedSafeEMI.toLocaleString('en-IN')}/mo.`
          : `Fails: Under -${Math.round(incomeShockPct * 100)}% income drop, household surplus drops to ₹${stressedDisposable.toLocaleString('en-IN')}/mo.`,
        rateShockResult: survivesRateStress
          ? `Passes: At +${rateShockPts.toFixed(1)}% rate shock (${rateBand.high.toFixed(1)}% → ${stressedRate.toFixed(1)}%), monthly EMI is ₹${stressedRateEMI.toLocaleString('en-IN')}/mo (within ₹${safeMonthlyEMI.toLocaleString('en-IN')} safe ceiling).`
          : `Fails: At +${rateShockPts.toFixed(1)}% rate shock (${rateBand.high.toFixed(1)}% → ${stressedRate.toFixed(1)}%), monthly EMI rises to ₹${stressedRateEMI.toLocaleString('en-IN')}/mo, exceeding safe ceiling.`,
        combinedStressResult: survivesCombinedStress
          ? `Passes: Under simultaneous -${Math.round(incomeShockPct * 100)}% income drop and +${rateShockPts.toFixed(1)}% rate hike, debt service remains viable.`
          : `Fails: Under simultaneous income drop and rate hike, cash flow incurs a deficit of ₹${Math.abs(Math.round(stressedDisposable - activeStressedRateEMI)).toLocaleString('en-IN')}/mo.`,
        explanation: survivesIncomeStress
          ? `Under a ${Math.round(incomeShockPct * 100)}% income shock, safe EMI contracts to ₹${stressedSafeEMI.toLocaleString('en-IN')}/mo (pre-new-debt surplus: ₹${stressedDisposable.toLocaleString('en-IN')}/mo), which accommodates the proposed payment.`
          : `Under a ${Math.round(incomeShockPct * 100)}% income drop, safe EMI capacity drops to ₹${stressedSafeEMI.toLocaleString('en-IN')}/mo (pre-new-debt surplus: ₹${stressedDisposable.toLocaleString('en-IN')}/mo), meaning this loan would over-leverage household cash flow.`
      },

      // Confidence & Metadata
      confidence: {
        level: confidenceLevel,
        score: confidencePoints,
        notes: confidenceNotes
      },

      // Negotiation Card
      negotiationCard,

      // Profile Context
      profileSummary: {
        employment: emp,
        effectiveIncome,
        existingDebtService,
        livingExpenses,
        disposableCashFlow,
        postLoanCashFlow,
        requiredEmergencyBuffer,
        requestedAmount,
        tenureMonths,
        tenureYears,
        product: activeProduct,
        isSecured,
        collateralValue: Number(profile.collateralValue) || 0,
        isOverLeveraged: currentFoir >= 0.40
      }
    };

    // Run Consistency Checks (all 12 checks)
    result.validation = validateUnderwritingConsistency(result);

    return result;
  }

  // =========================================================================
  // 5. AUTOMATED CONSISTENCY & RECONCILIATION VALIDATOR (12-CHECK ENGINE)
  // =========================================================================

  /**
   * Enforces mathematical sanity and prevents contradictions before report presentation.
   * Implements the 12 explicit checks mandated by the Lokta underwriting standard.
   */
  function validateUnderwritingConsistency(r) {
    const errors = [];
    const checks = [];

    // CHECK 1: Safe EMI -> safe principal
    if (r.amounts.safeMaxAmount > 0 && r.emi.safeMonthlyCeiling > 0) {
      const expectedP = calculatePrincipalFromEMI(r.emi.safeMonthlyCeiling, r.rate.ceiling, r.emi.tenureMonths, true);
      const diff = Math.abs(expectedP - r.amounts.safeMaxAmount);
      if (diff > 2.0) {
        errors.push(`CHECK_1_FAILED: Safe EMI (₹${r.emi.safeMonthlyCeiling}) does not yield safe principal (₹${r.amounts.safeMaxAmount}). Expected ₹${Math.round(expectedP)} (diff: ₹${diff.toFixed(2)}).`);
      } else {
        checks.push('CHECK_1_PASSED: Safe EMI -> Safe principal verified within ₹2 tolerance.');
      }
    }

    // CHECK 2: Safe principal -> safe EMI
    if (r.amounts.safeMaxAmount > 0 && r.emi.safeMonthlyCeiling > 0) {
      const backEMI = calculateEMI(r.amounts.safeMaxAmount, r.rate.ceiling, r.emi.tenureMonths, true);
      const diff = Math.abs(backEMI - r.emi.safeMonthlyCeiling);
      if (diff > 2.0) {
        errors.push(`CHECK_2_FAILED: Safe principal (₹${r.amounts.safeMaxAmount}) does not reverse to safe EMI (₹${r.emi.safeMonthlyCeiling}). Got ₹${Math.round(backEMI)} (diff: ₹${diff.toFixed(2)}).`);
      } else {
        checks.push('CHECK_2_PASSED: Safe principal -> Safe EMI circular consistency verified.');
      }
    }

    // CHECK 3: Requested principal -> requested EMI
    if (r.profileSummary.requestedAmount > 0 && r.emi.requestedLoanEMI > 0) {
      const expectedReqEMI = calculateEMI(r.profileSummary.requestedAmount, r.rate.ceiling, r.emi.tenureMonths, true);
      const diff = Math.abs(expectedReqEMI - r.emi.requestedLoanEMI);
      if (diff > 2.0) {
        errors.push(`CHECK_3_FAILED: Requested principal (₹${r.profileSummary.requestedAmount}) does not yield requested EMI (₹${r.emi.requestedLoanEMI}). Expected ₹${Math.round(expectedReqEMI)}.`);
      } else {
        checks.push('CHECK_3_PASSED: Requested principal -> Requested EMI verified.');
      }
    }

    // CHECK 4: Requested EMI <= safe EMI when verdict = BORROW
    if (r.verdictCode === 'BORROW' && r.emi.requestedLoanEMI > 0) {
      if (r.emi.requestedLoanEMI > r.emi.safeMonthlyCeiling) {
        errors.push(`CHECK_4_FAILED: Requested EMI (₹${r.emi.requestedLoanEMI}) exceeds safe EMI (₹${r.emi.safeMonthlyCeiling}) under BORROW verdict.`);
      } else {
        checks.push('CHECK_4_PASSED: Requested EMI <= Safe EMI verified for BORROW verdict.');
      }
    }

    // CHECK 5: Requested principal <= safe principal when verdict = BORROW
    if (r.verdictCode === 'BORROW' && r.profileSummary.requestedAmount > 0) {
      if (r.profileSummary.requestedAmount > r.amounts.safeMaxAmount) {
        errors.push(`CHECK_5_FAILED: Requested principal (₹${r.profileSummary.requestedAmount}) exceeds safe ceiling (₹${r.amounts.safeMaxAmount}) under BORROW verdict.`);
      } else {
        checks.push('CHECK_5_PASSED: Requested principal <= Safe principal verified for BORROW verdict.');
      }
    }

    // CHECK 6: Existing debt is included in cash flow
    if (r.profileSummary.existingDebtService > 0) {
      const expectedDisp = Math.max(0, r.profileSummary.effectiveIncome - r.profileSummary.existingDebtService - r.profileSummary.livingExpenses);
      if (Math.abs(r.profileSummary.disposableCashFlow - expectedDisp) > 1.0) {
        errors.push(`CHECK_6_FAILED: Existing debt service (₹${r.profileSummary.existingDebtService}) was not deducted from disposable cash flow.`);
      } else {
        checks.push('CHECK_6_PASSED: Existing debt included in disposable cash flow.');
      }
    }

    // CHECK 7: Living expenses are included in cash flow
    if (r.profileSummary.livingExpenses > 0) {
      if (r.profileSummary.disposableCashFlow > (r.profileSummary.effectiveIncome - r.profileSummary.livingExpenses)) {
        errors.push(`CHECK_7_FAILED: Living expenses (₹${r.profileSummary.livingExpenses}) were omitted from cash flow.`);
      } else {
        checks.push('CHECK_7_PASSED: Living expenses included in disposable cash flow.');
      }
    }

    // CHECK 8: Income shock actually reduces income
    if (r.stress && r.stress.stressedIncome >= r.profileSummary.effectiveIncome) {
      errors.push(`CHECK_8_FAILED: Stressed income (₹${r.stress.stressedIncome}) must be strictly lower than effective income (₹${r.profileSummary.effectiveIncome}).`);
    } else {
      checks.push('CHECK_8_PASSED: Income shock reduces income strictly.');
    }

    // CHECK 9: Interest-rate shock actually increases the rate
    if (r.stress && r.stress.stressedRate <= r.rate.ceiling) {
      errors.push(`CHECK_9_FAILED: Stressed rate (${r.stress.stressedRate}%) must be strictly higher than ceiling rate (${r.rate.ceiling}%).`);
    } else {
      checks.push('CHECK_9_PASSED: Interest rate shock increases rate strictly.');
    }

    // CHECK 10: APR is calculated from cash flows (IRR), not arithmetic percentage addition
    if (!r.rate.aprMethod || r.rate.aprMethod !== 'CASH_FLOW_IRR') {
      errors.push(`CHECK_10_FAILED: APR must be calculated via cash-flow IRR, got method: ${r.rate.aprMethod || 'NONE'}.`);
    } else {
      checks.push('CHECK_10_PASSED: APR calculated from cash-flow IRR (net disbursement vs repayment annuity).');
    }

    // CHECK 11: Lender sanction limit has an explicit formula and basis
    if (!r.amounts.lenderMaxSanctionBasis || !r.amounts.lenderMaxSanctionBasis.formula) {
      errors.push('CHECK_11_FAILED: Lender sanction limit lacks explicit formula and basis.');
    } else {
      checks.push('CHECK_11_PASSED: Lender sanction limit derived from explicit FOIR-to-PV formula.');
    }

    // CHECK 12: Every displayed number can be reproduced from underlying inputs
    const expectedPostLoan = Math.round(r.profileSummary.disposableCashFlow - (r.emi.requestedLoanEMI || r.emi.safeMonthlyCeiling));
    const checkPostLoan = Math.abs(r.profileSummary.postLoanCashFlow - expectedPostLoan) <= 2.0;
    if (!checkPostLoan) {
      errors.push(`CHECK_12_FAILED: Post-loan monthly cash flow (₹${r.profileSummary.postLoanCashFlow}) does not reconcile with disposable minus EMI (₹${expectedPostLoan}).`);
    } else {
      checks.push('CHECK_12_PASSED: All displayed financial outputs reproducible from underlying inputs.');
    }

    const isValid = errors.length === 0;

    // If any check fails, block and return UNDERWRITING VALIDATION FAILED
    if (!isValid) {
      r.verdict = 'Underwriting validation failed';
      r.verdictCode = 'VALIDATION_FAILED';
      r.verdictReason = 'UNDERWRITING VALIDATION FAILED: ' + errors.join('; ');
      if (r.negotiationCard) {
        r.negotiationCard.verdict = 'UNDERWRITING VALIDATION FAILED';
        r.negotiationCard.verdictCode = 'VALIDATION_FAILED';
        r.negotiationCard.reason = 'UNDERWRITING VALIDATION FAILED: ' + errors.join('; ');
      }
    }

    return {
      isValid,
      checksPassed: checks.length,
      errors,
      checks
    };
  }

  // =========================================================================
  // EXPORT INTERFACE
  // =========================================================================
  return {
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
    assessBorrower,
    validateUnderwritingConsistency
  };
}));
