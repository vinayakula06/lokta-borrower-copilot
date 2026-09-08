# WALKTHROUGH.md — Five-Minute Reviewer Guide

> **Lokta Borrower Copilot Build Challenge**  
> How to evaluate the submission in under 5 minutes, core architectural decisions, live follow-up changes, what to build next, and what to cut.

---

## 1. Five-Minute Review Path

For a reviewer evaluating this repository:

```
Step 1: Run the Automated CLI Test Suite (Time: 5 seconds)
$ node test_engine.js
Observe 54 unit tests + 1,000 property-based invariant checks verifying financial math, all three personas, true Cash-Flow IRR APR, multi-dimensional confidence, interactive lender quote evaluation, 12-check automated consistency validator, and regression test cases in < 1 second.

Step 2: Open the Flagship Application (Time: 30 seconds)
Open index.html (or borrower_copilot_chat.html) directly in any modern browser.
No npm, no build step, no network dependency.

Step 3: Test the Three Core Personas (Time: 2 minutes)
Click "Priya · Salaried" → Observe prime personal loan pricing (10.5%–13.0%), BORROW verdict, and headroom note.
Click "Ravi · Self-employed" → Observe product routing to secured LAP (9.5%–12.5%), cash haircut, and BORROW LESS recommendation.
Click "Anita · Informal" → Observe DONT BORROW verdict, bounce hard-stop, app loan amortization, and the constructive "Path to Yes".

Step 4: Inspect Negotiation Card, Lender Quote Check & Q&A Mode (Time: 1.5 minutes)
Click "🔍 Check Lender's Quote" → Type "14.5" → Observe instant evaluation (EXPENSIVE warning, walk-away rate 13.5%, and counter-script).
Click "📋 Copy" → Observe 14-section formatted clipboard text ready for a branch meeting.
Click "🔍 Expand" → Opens the full Negotiation Card modal with 8 core targets, 3-part stress test, multi-dimensional confidence levels, lender sanction basis, and 12-check validation badge.
Switch to "💬 Ask Anything" tab → Ask "What is FOIR?" or "Can I borrow with a low credit score?" → Observe answers referencing live profile numbers.

Step 5: Inspect Domain Code & RULES.md (Time: 1 minute)
Open rules.js and RULES.md. Note the 1:1 parity and clean separation from UI.
```

---

## 2. Core Architectural Decisions

### A. Strict Separation of Domain Rules from UI (`rules.js`)
The challenge explicitly mandates: *"Rules separated from UI. Readable. In the follow-up we will ask you to change a rule live."*
- All underwriting ratios, FOIR slabs, haircuts, rate bands, and financial math reside in [`rules.js`](./rules.js) as pure deterministic functions.
- The UI contains zero hardcoded thresholds.
- Both the headless Node test runner (`node test_engine.js`) and the browser application import the same [`rules.js`](./rules.js) engine.

### B. Safe Capacity vs Lender Capacity
- **Lender View:** $\text{Income} \times \text{FOIR} - \text{Existing EMIs}$  
  Banks look only at gross income and formal debt service. They routinely ignore rent, school fees, and emergency buffers, leading to sanctions that over-leverage borrowers.
- **Borrower Safe View:** Derived from household surplus via the standard discounted cash-flow annuity present value formula:
  $$P = \text{EMI} \times \frac{1 - (1 + r)^{-n}}{r}$$
  Our engine nets out real living expenses, existing debts, and reserves 50% of remaining cash flow as a buffer against shocks.
- The Copilot explicitly instructs the borrower to use the **Safe Amount** as their ceiling: *"Lender sanction capacity is not the same as safe borrowing capacity."*

### C. Collateral Routes to a Different Product (Ravi)
When Ravi inputs a ₹45L unencumbered shop, the app does not merely increase his loan limit—it **routes him to a secured loan (LAP)**. This drops his fair rate from 16%–20% (unsecured business loan) down to 9.5%–12.5%, and extends tenure to 10 years, saving him lakhs in interest.

### D. "Don't Borrow" is Reachable and Protective (Anita)
"Don't borrow" is a primary, first-class output. Anita hits two independent hard-stops:
1. A recent payment bounce in the last 6 months.
2. High-cost app debt (30%+ APR).
Instead of dead-ending, the Negotiation Card pivots into a **"Path to Yes"**: a step-by-step roadmap to clear high-cost debt and establish 6 months of clean banking.

### E. Unknown is Never Zero
- Unknown credit score widens the fair rate range ($\pm 2\%$) without assuming a worst-case 300 score.
- Missing living expenses are floored to a demographic minimum (35% of income or ₹12,000/mo) so missing inputs never manufacture fake surplus.

### F. Complete PDF Export & In-Chat Negotiation Toolkit
- **Inputs & Outputs Summary in PDF:** When the borrower prints or saves to PDF, the document generates an executive-grade A4 report containing both **Section 1: Declared Borrower Profile & Inputs Summary** and **Section 2: Sizing & Underwriting Outputs Breakdown**, followed by the **Section 14 Structured Negotiation Card** and regulatory disclosures.
- **In-Chat Decision Actions:** Right after assessment, the chat appends an interactive action toolkit with:
  1. `📄 Print / Save Complete PDF (Inputs + Outputs)`: Launches the print report.
  2. `📑 View Negotiation Card`: Opens a modal dialog with branch scripts, talking points, and walk-away triggers.
  3. `🔄 New Borrower / New Conversation`: Restarts the conversation cleanly.
- **Active Post-Assessment Input & Minimal UI:** The borrower is never left at a dead end—the input field stays active with two clean, clutter-free action buttons (`[🔄 New Chat]` and `[👤 Other Person]`), and handles both natural-language new loan requests and Q&A inquiries.

### G. True Cash-Flow APR Engine (RBI KFS Compliance)
- APR is **never** calculated by naive arithmetic addition ($22\% + 2.36\% + \text{GST} \neq 22.6\%$).
- Implements numerical Newton-Raphson Internal Rate of Return (IRR) on actual cash flows:
  $$\text{Net Disbursement} = \text{Principal} - \text{Fee} - 18\% \text{ GST on Fee}$$
  Equating net cash received to 48 monthly amortizing repayments, yielding exact nominal annualized APR (e.g. 23.39% for ₹8L at 22% with 2% fee + GST).

### H. 12-Check Automated Consistency Validator & Circuit Breaker
- Before generating any recommendation, the engine executes 12 automated checks (PV circular reversibility within ₹2, requested vs safe EMI compliance, living expense & debt deduction, strict monotonicity of income drop and interest hike, and cash-flow APR method).
- If **any check fails**, the engine halts and sets the verdict to **`UNDERWRITING VALIDATION FAILED`**, identifying the exact failed check.

### I. Section 15 Mandatory Regression Verification
| Metric | Calculation Basis / Formula | Result | Verification Status |
|---|---|---|---|
| **Requested Loan Ask** | Declared test input | ₹8,00,000 | Configured |
| **Tenure** | 48 months (4 years) | 48 months | Configured |
| **Requested Loan EMI** | $\frac{P \times r \times (1+r)^n}{(1+r)^n - 1}$ at 22% over 48mo | **₹25,205/month** | Pass (Dynamic $\approx$ ₹25,200) |
| **Safe Monthly EMI Limit** | Configured rule ceiling | ₹34,000/month | Configured |
| **Safe Borrower Ceiling** | $\text{EMI} \times \frac{1-(1+r)^{-n}}{r}$ (₹34k, 22%, 48mo) | **₹10,79,157** | Pass ($\approx$ ₹10,79,157) |
| **Lender Sanction Limit** | FOIR 55% on ₹1.1L less ₹14k debt = ₹46,500 EMI $\to$ PV | **₹14,75,906** | Pass (Explicit FOIR Basis) |
| **Fair Rate Band** | Unsecured personal risk tier mapping | 14.0% – 22.0% | Pass (Deterministic Basis) |
| **Walk-Away Rate** | Fair rate ceiling (22.0%) + tolerance (+0.5%) | **>22.5%** | Pass (Explicit Tolerance Rule) |
| **Calculated APR** | Cash-Flow IRR on ₹7,81,120 net disbursement | **23.39% (~23.4%)** | Pass (Newton-Raphson IRR) |
| **Safety Margin Rule** | $(1079157 - 800000) / 1079157 = 25.87\% \ge 25\%$ | Retains 26% margin | Pass (Comfortable threshold met) |
| **Underwriting Checks** | 12 automated consistency checks | 12 / 12 passed | Pass (Zero contradictions) |

---

## 3. How to Change a Rule Live in the Interview

If an interviewer asks to change an assumption live during the follow-up session:

1. **Change Salaried FOIR from 55% to 50%:**
   Open [`rules.js`](./rules.js), navigate to line 24:
   ```javascript
   salariedHigh: { id: 'FOIR.SAL.HIGH', lender: 0.50, safeFactor: 0.50, minIncome: 50000 }
   ```
2. **Change Cash Haircut on Unverified Income from 40% to 50%:**
   Open [`rules.js`](./rules.js), navigate to line 38:
   ```javascript
   unverifiedCashHaircut: 0.50
   ```
3. **Change Walk-Away Negotiation Tolerance from +0.5% to +1.0%:**
   Open [`rules.js`](./rules.js), navigate to `negotiation.tolerancePts`:
   ```javascript
   tolerancePts: 1.0
   ```
4. **Change Comfortable Margin Threshold from 25% to 30%:**
   Open [`rules.js`](./rules.js), navigate to `marginRule.comfortableThresholdPct`:
   ```javascript
   comfortableThresholdPct: 0.30
   ```
5. **Change Property LTV Cap from 60% to 70%:**
   Open [`rules.js`](./rules.js), navigate to `ltvMax`:
   ```javascript
   property: 0.70
   ```

Save [`rules.js`](./rules.js). Rerun `node test_engine.js` or refresh the browser—all calculations update immediately.

---

## 4. What I Would Build Next

1. **Client-Side Bank Statement Parser (`pdf.js`):**  
   Allow borrowers to upload a 6-month bank statement PDF. Process transactions 100% client-side in WebAssembly/JS (zero data sent to a server). Extract actual monthly balance, auto-detect bounce charges, and eliminate unverified cash haircuts without privacy compromise.
2. **Live "What-If" Sensitivity Sliders:**  
   Post-assessment interactive sliders allowing borrowers to test: *"What if I prepay ₹20,000 of app debt?"* or *"What if my income rises by ₹10,000?"* with instant real-time delta recalculation.
3. **Vernacular Language Support (Kannada & Hindi):**  
   The three test borrowers reside in Bengaluru, Mysuru, and Hubballi. Providing a complete Kannada / English language toggle would make the Negotiation Card immediately usable in Tier-2/3 Karnataka bank branches.
4. **Offline PWA Support:**  
   Add a Service Worker manifest so the tool works offline on mobile devices in low-connectivity rural markets.

---

## 5. What I Would Cut

1. **AI / LLM Integration in the Core Decision Path:**  
   Using an LLM for credit math is a liability. LLMs hallucinate numbers, fail deterministic auditing, and introduce latency and privacy concerns. Keeping the engine pure deterministic JavaScript was the correct choice.
2. **Complex Bureau Integration:**  
   A real bureau pull requires KYC, SMS OTPs, and third-party data pipelines. The self-assessment model is faster, 100% private, and eliminates borrower friction.
3. **Broad Product Breadth Beyond Retail Needs:**  
   Exotic financial instruments (machinery lease-back, commercial paper) were omitted to focus engineering on the 5 retail loan categories that matter to 99% of Indian borrowers (personal, LAP, gold, business, two-wheeler).
