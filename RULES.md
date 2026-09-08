# RULES.md — Lokta Borrower Copilot Rulebook

> **The Single Source of Truth for Credit, Affordability, and Pricing Logic.**  
> Every threshold, formula, and decision rule below mirrors [`rules.js`](./rules.js) line-for-line.  
> Format: *Rule ID · What · Value · Why · Source · Effect · Confidence Impact · Limitations*

---

## 1. Architecture & Design Principles

1. **Two Numbers, Always (Challenge O2):**  
   Every affordability assessment computes both an **indicative lender sanction ceiling** (what a bank's FOIR model might approve on paper) and a **borrower safe carry capacity** (what the household can actually carry after living expenses, existing obligations, and emergency buffers). The Copilot explicitly instructs the borrower to use the **Safe Amount** as their ceiling.
2. **Confidence Widens with Silence (Honesty about Limits):**  
   Fewer answers widen the confidence ranges and lower the confidence score. The engine never manufactures artificial precision for missing data.
3. **Unknown is Never Zero (Phase 6):**  
   An unknown credit score is never treated as a 300 default; it is modeled as an uncertainty band. Missing living expenses are never treated as zero; a demographic plausibility floor is applied to prevent creating fake cash surplus.
4. **Separation of Domain Rules from UI (Engineering Craft):**  
   All calculation rules live in [`rules.js`](./rules.js) as pure, deterministic functions with zero UI or framework dependencies. A reviewer can change any threshold live in [`rules.js`](./rules.js) in 5 seconds and observe immediate updates across both the CLI test runner (`node test_engine.js`) and the browser application.

---

## 2. Effective Income Assessment

| Rule ID | What | Value | Why | Source | Effect on Output | Confidence Impact | Limitations |
|---|---|---|---|---|---|---|---|
| `INCOME.SALARIED` | Salaried declared net income | 100% of take-home salary | Verifiable through bank salary credits, payslips, and Form 16 TDS deductions. | Industry Standard (Retail Banking) | Establishes monthly cash inflow baseline. | High (+35 pts) | Assumes ongoing employment continuity. |
| `INCOME.ITR.BASE` | Self-employed ITR baseline | Annual ITR ÷ 12 | Standard formal benchmark audited and filed with Income Tax Department. | Statutory / Lending Practice | Sets documented floor for business earnings. | High (+35 pts) | May reflect historic rather than current trading conditions. |
| `INCOME.CASH.UNVERIFIED` | Undocumented cash income above ITR | 40% haircut (60% recognized) | Cash turnover has high volatility and cannot be validated without bureau/bank proof. | My Judgement (Conservative Underwriting) | Recognizes partial real earning power without over-leveraging. | Medium (penalized by haircut) | Conservative for high-margin cash businesses. |
| `INCOME.CASH.VERIFIED` | Cash income backed by 6mo bank statements | 15% haircut (85% recognized) | Bank statements demonstrate regular cash deposits and operational liquidity. | Market Practice (Banking Surrogate) | Bumps recognized income by 25 percentage points over unverified cash. | High (+25 pts) | Statement tampering cannot be verified client-side. |
| `INCOME.CO_APPLICANT` | Co-applicant monthly income | 100% of formal co-signer income | Legally enforceable joint obligation lowers lender loss given default. | Lending Practice | Directly increases disposable income and FOIR ceiling. | Medium (+15 pts) | Only applied when co-applicant will formally co-sign. |
| `INCOME.INFORMAL` | Informal / gig worker income | Midpoint of stated monthly range | Accounts for seasonal and platform earnings variance without false point precision. | My Judgement | Uses neutral central estimate for gig/informal earnings. | Low (requires wider buffer) | Does not capture multi-app platform volatility. |

---

## 3. Affordability & FOIR (Lender View)

| Rule ID | What | Value | Why | Source | Effect on Output | Limitations |
|---|---|---|---|---|---|---|
| `FOIR.SAL.HIGH` | Salaried FOIR (Income ≥ ₹50,000/mo) | 55% of net income | Higher absolute residual income leaves comfortable margin for lifestyle and shocks. | Indian Banking Norms (HDFC, ICICI, SBI) | Sets maximum lender EMI capacity before deducting existing debt. | Banks occasionally stretch to 60% for Tier-1 employers. |
| `FOIR.SAL.LOW` | Salaried FOIR (Income < ₹50,000/mo) | 45% of net income | Smaller income base requires a higher proportion for essential living needs. | Market Practice | Restricts lender EMI ceiling. | Some NBFCs stretch higher with co-signers. |
| `FOIR.SE.EST` | Established self-employed FOIR (≥ 3yr vintage) | 45% of assessed income | Accounts for business cycle fluctuations and working capital absorption. | Market Practice | Constrains lender sanction limit. | Does not distinguish between proprietary and corporate entities. |
| `FOIR.INF` | Informal / early self-employed FOIR (< 3yr) | 35% of assessed income | High vulnerability to health shocks, fuel costs, and platform algorithm changes. | My Judgement (Prudent Lending) | Restricts lender sanction to prevent debt distress. | High-interest fintech apps frequently violate this. |
| `FOIR.SEC.BOOST` | FOIR boost for secured collateral | +10 percentage points | Collateral reduces loss given default (LGD), permitting higher obligation headroom. | Market Practice (Mortgage / LAP) | Increases lender capacity from 45% → 55% or 35% → 45%. | Subject to clean legal title and valuation. |

---

## 4. Borrower Safe Affordability & Present Value Sizing

The engine enforces an explicit, auditable affordability rule where safe new-loan EMI cannot exceed the lower of three distinct constraints:

1. **Disposable Cash-Flow Capacity:**  
   $$\text{Disposable Cash Flow} = \text{Effective Monthly Income} - \text{Existing Debt Service} - \text{Monthly Living Expenses}$$  
   $$\text{Cash Flow New EMI Capacity} = \text{Disposable Cash Flow} \times \text{Permitted Fraction (50%)}$$
2. **FOIR-Based Capacity:**  
   $$\text{FOIR Total Debt Capacity} = \text{Effective Monthly Income} \times \text{Allowed FOIR}$$  
   $$\text{FOIR New EMI Capacity} = \max(0, \text{FOIR Total Debt Capacity} - \text{Existing Debt Service})$$
3. **Emergency Reserve / Named Ceiling Constraint:**  
   Adjusted for required emergency liquidity or configured fixed ceiling parameter.

$$\text{Safe New EMI} = \max(0, \min(\text{FOIR New EMI}, \text{Cash Flow New EMI}, \text{Emergency Buffer / Fixed Ceiling}))$$

The controlling constraint is explicitly labeled in every output (`CASH_FLOW`, `FOIR`, `EMERGENCY_BUFFER`, or `FIXED_CEILING`).

### Present Value Loan Principal Formula (Challenge O2)
Once $\text{Safe New EMI}$ is established, the maximum safe principal is derived mathematically using the present value of an ordinary amortizing annuity:

$$\text{Principal} = \text{EMI} \times \frac{1 - (1 + r)^{-n}}{r}$$

where $r = \frac{\text{Annual Nominal Rate}}{100 \times 12}$ and $n = \text{Tenure in Months}$.  
The engine **never** calculates safe principal by simply multiplying $\text{EMI} \times \text{Tenure}$.  
*Sanity Validation:* At 16% annual interest over 36 months, an EMI of ₹4,500 yields $\approx$ ₹1,27,997 (₹1.28 Lakh), never ₹12,797.

| Rule ID | What | Value | Why | Source | Effect on Output |
|---|---|---|---|---|---|
| `SAFE.SURPLUS.BASE` | Base safe affordability formula | `(Income − Debt − Expenses) × 50%` | Ensures the borrower never allocates more than half of true free cash flow to new debt. | Product Core Thesis | Generates the Safe Monthly EMI ceiling. |
| `SAFE.PV.ANNUITY` | Safe borrower ceiling formula | $P = \text{EMI} \times \frac{1 - (1+r)^{-n}}{r}$ | Exact discounted cash-flow valuation of repayment capacity. | Financial Mathematics | Generates the Safe Principal Ceiling. |
| `EXPENSE.FLOOR` | Living expense plausibility floor | Max(₹12,00, 35% of income) | Prevents manufacturing artificial cash surplus when expenses are missing or declared as ₹0. | My Judgement (Demographic Benchmark) | Guarantees unknown living expenses are never treated as zero. |
| `BUF.SAVINGS.3PLUS` | Informal savings buffer (≥ 3 months) | ×1.10 multiplier on safe EMI | Emergency liquidity prevents immediate default during minor illness or downtime. | My Judgement | Expands safe carrying capacity by 10%. |
| `BUF.SAVINGS.ZERO` | Informal savings buffer (0 months) | ×0.90 multiplier on safe EMI | Zero savings means any single shock directly leads to debt default. | My Judgement | Contracts safe carrying capacity by 10%. |
| `SAFE.SEC.BOOST` | Secured safe factor boost | +15 percentage points (up to 70% max) | Secured loans typically replace expensive working capital debt and carry longer tenures. | My Judgement | Bumps safe factor from 50% → 65%. |

---

## 5. Pricing, Rate Bands & All-In APR (Cash-Flow IRR)

The engine **never** calculates APR by simply adding linear percentages ($\text{Rate} + \text{Fee} + \text{GST} \neq \text{APR}$). In accordance with the **RBI Master Direction on Key Fact Statements (KFS)**, APR represents the true annualized internal rate of return (IRR) equating net disbursement to the discounted stream of regular amortizing EMIs.

### Exact Cash-Flow IRR Formula
$$\text{Net Disbursement} = \text{Principal} - \text{Processing Fee} - \text{GST (18% on Fee)}$$
$$\text{Net Disbursement} = \sum_{t=1}^{n} \frac{\text{EMI}}{(1 + r_{\text{monthly}})^t}$$

Solved numerically via the **Newton-Raphson method**:
$$r_{k+1} = r_k - \frac{f(r_k)}{f'(r_k)}$$
$$\text{Annualized APR} = r_{\text{monthly}} \times 12 \times 100$$

| Rule ID | Product / Credit Tier | Rate Band | Upfront Fee | All-in APR (via Cash-Flow IRR) | Source / Justification |
|---|---|---|---|---|---|
| `RATE.UNSEC.750PLUS` | Personal Loan (Score ≥ 750) | 10.5% – 13.0% | 2.0% | ~11.6% – 14.3% (over 4yr) | Prime retail personal loan rates (Indian private banks, 2024–26). |
| `RATE.UNSEC.700_749` | Personal Loan (Score 700–749) | 13.0% – 16.0% | 2.0% | ~14.3% – 17.4% (over 4yr) | Near-prime pricing across standard bank & NBFC rate cards. |
| `RATE.UNSEC.650_699` | Personal Loan (Score 650–699) | 16.0% – 20.0% | 2.5% | ~17.6% – 21.8% (over 4yr) | Subprime tier; higher risk premium applied. |
| `RATE.UNSEC.SUB650` | Personal Loan (Score < 650) | 20.0% – 24.0% | 3.0% | ~21.9% – 26.2% (over 4yr) | High default risk territory; flagged for likely bank rejection. |
| `RATE.UNSEC.UNKNOWN` | Personal Loan (Score Unknown) | 14.0% – 22.0% | 2.0% | ~15.3% – 23.4% (over 4yr) | Baseline 16–20% widened ±2.0% without assuming worst-case score. |
| `RATE.SEC.LAP` | Loan Against Property (LAP) | 9.5% – 12.5% | 1.0% | ~9.8% – 12.8% (over 10yr) | Secured mortgage pricing; score becomes secondary to asset value. |
| `RATE.SEC.GOLD` | Gold Loan | 9.0% – 13.0% | 1.0% | ~10.0% – 14.2% (over 2yr) | Fast liquidation asset; minimal lender underwriting risk. |
| `RATE.2W` | Two-Wheeler / Scooter Loan | 11.0% – 15.0% | 2.0% | ~12.5% – 16.6% (over 3yr) | OEM / NBFC captive vehicle financing standard. |
| `APR.KFS.IRR` | All-In APR Formula | Cash-flow IRR on net disbursement | 18% GST on Fee | Direct Newton-Raphson solution of RBI Key Fact Statement (KFS) cash flows. |


---

## 6. Statutory Caps & Asset Valuation (LTV)

| Rule ID | Asset Class | Statutory / Safe LTV Cap | Source / Regulatory Basis | Effect on Sizing |
|---|---|---|---|---|
| `LTV.PROPERTY` | Commercial / Residential Property | 60% of distress valuation | Conservative Indian mortgage standard (some NBFCs stretch to 70%). | Caps maximum sanction on LAP (e.g. ₹45L shop → ₹27L cap). |
| `LTV.GOLD` | Gold Jewellery / Ornaments | 75% of net gold market value | RBI Master Direction on NBFC Gold Loans (DOR.CRE.REC.No.06/03.10.001/2021-22). | Statutory ceiling; prevents negative equity on price dips. |

---

## 7. Hard-Stops & Verdict Hierarchy (Challenge O1)

Verdicts follow a strict precedence hierarchy:

```
                  [Does borrower have positive income?]
                                  │
                          No ─────┴───── Yes
                          │               │
                    DONT_BORROW           ▼
                          ▲    [Any EMI bounce in last 6 months?]
                          │               │
                          └────── Yes ────┴──── No
                                                │
                                                ▼
                                 [High-cost debt & FOIR ≥ 30%?]
                                                │
                          ┌────── Yes ──────────┴──── No
                          │                           │
                     DONT_BORROW                      ▼
                          ▲             [Requested Amount > Safe Max?]
                          │                           │
                          │                     Yes ──┴── No
                          │                      │        │
                   (Zero surplus)                ▼        ▼
                                           BORROW_LESS  BORROW
```

1. **STOP.BOUNCE (Hard Stop → `DONT_BORROW`):**  
   Any payment bounce in the previous 6 months triggers an outright refusal. Compounding fresh debt on an unstable repayment track leads directly to default. Paired with a **Path to Yes**: 6 months of consecutive on-time clearing.
2. **STOP.HIGH_COST_DEBT (Hard Stop → `DONT_BORROW`):**  
   Existing debt service consuming ≥ 30% of income carrying high-cost interest (≥ 24% APR, e.g. digital lending apps) triggers `DONT_BORROW`. Paired with a **Path to Yes**: Debt snow-balling or gold consolidation before taking new loans.
3. **STOP.ZERO_SURPLUS (Hard Stop → `DONT_BORROW`):**  
   If net disposable surplus after essential living costs is ≤ 0.
4. **STOP.UNSERVICEABLE_ASK (Hard Stop → `DONT_BORROW`):**  
   If the requested loan's EMI exceeds total available disposable monthly cash flow, or if FOIR new capacity is exhausted (0), or if post-loan monthly cash flow drops into negative deficit, the verdict is **`DONT_BORROW`**.
5. **VERDICT.BORROW_LESS (`BORROW_LESS`):**  
   Fires whenever requested amount exceeds the borrower's safe carrying capacity (`Requested > Safe Max`) or fails the -20% income stress test, but the borrower has positive disposable surplus. Caps loan ask to safe capacity.
6. **VERDICT.BORROW (`BORROW`):**  
   Fires when requested amount is within safe capacity (`Requested ≤ Safe Max`), requested EMI is within safe EMI, post-loan cash flow satisfies emergency buffers, and macroeconomic stress tests pass.
7. **MARGIN.COMFORTABLE_RULE (Safety Margin Rule):**  
   A loan is **never** described as "comfortable" merely because it is below the ceiling. The engine requires:
   $$\text{Safety Margin} = \frac{\text{Safe Ceiling} - \text{Requested Amount}}{\text{Safe Ceiling}} \ge 25\%$$
   Only when the requested ask leaves at least a 25% buffer below the safe ceiling does the reason state "comfortably below".
8. **NEGOTIATION.TOLERANCE (Walk-Away Threshold):**  
   $$\text{Walk-Away Rate} = \text{Fair Rate Ceiling} + 0.50\% \text{ (50 bps negotiation tolerance)}$$
   $$\text{Walk-Away EMI} = \text{Safe Monthly EMI Ceiling}$$
   Borrower is instructed to walk away if quoted rate exceeds the walk-away rate or if EMI exceeds safe EMI.

---

## 8. Macroeconomic Stress Testing Scenarios (Challenge O4)

The engine subjects every proposal to three independent macroeconomic scenarios:

1. **STRESS.INCOME_DROP (-20% Income):**  
   Simulates employment furlough, commission loss, or business seasonality:
   $$\text{Stressed Income} = \text{Effective Income} \times (1 - 0.20)$$
   $$\text{Stressed Disposable Cash Flow} = \max(0, \text{Stressed Income} - \text{Existing Debt} - \text{Living Expenses})$$
   $$\text{Stressed Safe EMI} = \text{Stressed Disposable Cash Flow} \times \text{Safe Factor}$$
   *Critical Integrity Rule:* Stressed safe EMI is **strictly recomputed from stressed cash flow**, **never** computed as a naive 20% reduction of base EMI ($4500 \times 0.20 = 900$).
2. **STRESS.RATE_HIKE (+2.0% / 200 bps):**  
   Simulates an RBI monetary tightening cycle:
   $$\text{Stressed Rate} = \text{Nominal Rate} + 2.00\%$$
   $$\text{Stressed EMI} = \text{EMI}(\text{Principal}, \text{Stressed Rate}, \text{Tenure})$$
   Independently recalculated; does not simply add a percentage to the EMI.
3. **STRESS.COMBINED (Simultaneous Income Drop & Rate Hike):**  
   Evaluates household debt service survival when household income drops by 20% while borrowing interest rates simultaneously jump by +200 bps.

---

## 9. Automated Underwriting Consistency Validator (12-Check Suite)

Before generating the Negotiation Card or final verdict, the engine executes 12 automated mathematical checks. If **any single check fails**, the system blocks the recommendation and outputs **`UNDERWRITING VALIDATION FAILED`**:

- **CHECK 1:** Safe EMI $\to$ Safe principal via PV formula ($P = \text{EMI} \times [1-(1+r)^{-n}]/r$) verified within ₹2 rounding tolerance.
- **CHECK 2:** Safe principal $\to$ Safe EMI circular reversibility verified within ₹2 rounding tolerance.
- **CHECK 3:** Requested principal $\to$ Requested EMI independently verified via standard amortizing formula.
- **CHECK 4:** $\text{Requested EMI} \le \text{Safe EMI}$ under `BORROW` verdict.
- **CHECK 5:** $\text{Requested Principal} \le \text{Safe Principal}$ under `BORROW` verdict.
- **CHECK 6:** Existing debt service is strictly deducted in cash-flow surplus calculations.
- **CHECK 7:** Living expenses are strictly included in cash-flow surplus calculations.
- **CHECK 8:** Income shock strictly reduces income ($\text{Stressed Income} < \text{Base Income}$).
- **CHECK 9:** Interest-rate shock strictly increases the rate ($\text{Stressed Rate} > \text{Base Rate}$).
- **CHECK 10:** APR is calculated from cash flows via Newton-Raphson IRR on net disbursement, never by linear addition.
- **CHECK 11:** Lender sanction limit is derived from an explicit formula with transparent FOIR, income, and existing debt basis.
- **CHECK 12:** Every displayed financial number is mathematically reproducible from underlying inputs.

---

## 10. Explicit Limitations & Out-of-Scope Disclosures (Honesty about Limits)

1. **No Live Bureau Pull:** The tool operates strictly as a private self-assessment from self-reported data without pulling bureau scores (zero credit footprint).
2. **True Cash-Flow APR Solver:** Implemented using exact numerical Newton-Raphson Internal Rate of Return (IRR) on net disbursement cash flow ($P - \text{fee} - \text{GST}$) amortized over $n$ monthly payments, fully compliant with RBI Master Directions on Key Fact Statements (KFS).
3. **Out-of-Scope Products (Handled via Proxies or Explicit Boundaries):**
   - **Student / Education Loans:** Subsidies and moratorium periods are not modeled; proxied to personal loan math with a clear user notice.
   - **Credit Cards & Revolving Overdrafts:** Explicitly declined as revolving credit outside the amortizing loan engine.
   - **BNPL:** Flagged as high-cost short-term credit outside the engine's scope.

---

## 11. Multi-Dimensional Confidence Engine (`RULE.CONFIDENCE`)

Rather than collapsing uncertainty into a single opaque number, the engine evaluates evidence confidence across three orthogonal dimensions:

1. **Affordability Confidence (`CONF.AFFORDABILITY`):**
   - **HIGH:** Documented income (salaried MNC or ITR or verified 6-month bank statements) + explicit living expenses declared above demographic floor.
   - **MEDIUM:** Documented income with demographic floor fallback, or declared living expenses with variable cash income.
   - **LOW:** Unverified cash income (40% haircut) combined with living expenses estimated via demographic floor.
2. **Pricing Accuracy Confidence (`CONF.PRICING`):**
   - **HIGH:** Exact credit score known (pinpoints specific prime/near-prime tier) or secured collateral backing (asset liquidation pricing takes precedence over bureau score).
   - **LOW:** Credit score unknown — rate band widened $\pm 2\%$ around subprime midpoint to reflect uncertainty without assuming worst-case score.
3. **Product Routing Confidence (`CONF.ROUTING`):**
   - **HIGH:** Secured collateral verified against statutory LTV cap ($\le 60\%$ LAP, $\le 75\%$ Gold), or standard employment profile mapped cleanly to commercial product parameters.
   - **MEDIUM:** Informal or gig worker profile requiring adaptive savings-buffer multipliers.

---

## 12. Lender Quote Evaluation Engine (`RULE.QUOTE.EVAL`)

When a borrower receives an interest rate offer from a bank or NBFC, the engine benchmarks the quote against the profile's fair band:

| Offer Category | Trigger Condition | Status Code | Recommended Borrower Action |
|---|---|:---:|---|
| **UNSAFE** | Overall verdict is `DONT_BORROW` | `UNSAFE` | 🛑 Reject offer regardless of rate. Focus on Path to Yes recovery steps. |
| **GOOD OFFER** | $\text{Rate} \le \text{Floor} + 1.0\%$ | `GOOD` | ✅ Excellent pricing. Verify all-in APR with GST $\le \text{Floor} + \text{Fee APR} + 0.5\%$. Proceed. |
| **REASONABLE** | $\text{Floor} + 1.0\% < \text{Rate} \le \text{Ceiling} + 0.5\%$ | `REASONABLE` | ✔️ Acceptable inside benchmark. Push back to target lower half of fair band. |
| **EXPENSIVE** | $\text{Ceiling} + 0.5\% < \text{Rate} \le \text{Ceiling} + 2.0\%$ | `EXPENSIVE` | ⚠️ Paying more than profile justifies. Walk away if rate $> \text{Ceiling} + 0.5\%$. |
| **VERY EXPENSIVE** | $\text{Rate} > \text{Ceiling} + 2.0\%$ | `VERY_EXPENSIVE` | 🚨 Predatory/high-risk pricing. Do not accept. Approach alternative lender with card. |


