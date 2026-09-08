# RUNTHROUGHS.md — Three Borrower Run-Throughs

> Complete walkthroughs for **Priya**, **Ravi**, and **Anita** based on the official Lokta challenge specifications.  
> Demonstrates adaptive question paths, mathematical trace, four outputs (O1–O4), and the borrower's one-page Negotiation Card.

---

## Persona 1: Priya, 29 — Bengaluru (Salaried MNC Software Engineer)

### 1. Profile Summary
- **Employment:** Software Engineer at an MNC for 5 years
- **Net Monthly Salary:** ₹1,10,000/month (TDS deducted)
- **Existing Debt:** Car loan EMI of ₹14,000/month (2 years remaining)
- **Living Expenses:** ₹28,000/month (including rent)
- **Credit Score:** 780 (Prime Tier)
- **Borrower Request:** Wants **₹8,00,000 personal loan** for wedding expenses

---

### 2. Adaptive Questions Asked & Answers Given

| Step | Question | User Input | Engine Effect |
|---|---|---|---|
| Q1 | What is this loan for? | "Wedding" | Routed to `personal` loan category |
| Q2 | How much are you looking to borrow? | ₹8,00,000 | Sets request target for sizing comparison |
| Q3 | How do you earn? | Salaried (job, fixed monthly) | Selects salaried FOIR and income verification path |
| Q4 | How old are you? | 29 | Verifies working tenure horizon (within retirement cap) |
| Q5 | Net monthly take-home salary? | ₹1,10,000 | Effective income recognized as-is without haircut |
| Q6 | Total existing monthly EMIs? | ₹14,000 | Deducted from both lender FOIR and disposable income |
| Q7 | Monthly living expenses including rent? | ₹28,000 | Deducted from disposable income (valid, above floor) |
| Q8 | Do you know your credit score? | Yes — 780 | Selects top prime pricing band (10.5% – 13.0%) |

*No further questions needed: High-confidence profile reached in 8 questions.*

---

### 3. Step-by-Step Mathematical Derivation

1. **Effective Income:**  
   $$\text{Income} = ₹1,10,000/\text{month}$$
2. **Lender Sanction Capacity (FOIR View):**  
   - Tier: Salaried with income $\ge ₹50,000 \implies \text{FOIR} = 55\%$  
   - Lender Monthly EMI $= (₹1,10,000 \times 0.55) - ₹14,000 = ₹60,500 - ₹14,000 = ₹46,500/\text{month}$  
   - Lender Max Sanction (at 13.0% over 4 years) $= \mathbf{₹17,25,000}$
3. **Borrower Safe Capacity (Disposable Surplus View):**  
   - Monthly Disposable Surplus $= ₹1,10,000 - ₹14,000 - ₹28,000 = ₹68,000/\text{month}$  
   - Safe EMI (at 50% factor) $= ₹68,000 \times 0.50 = \mathbf{₹34,000/\text{month}}$  
   - Safe Max Amount (at 13.0% over 4 years) $= \mathbf{₹12,62,000}$
4. **Rate Band & RBI KFS APR:**  
   - Score $780 \implies \text{Nominal Band: } \mathbf{10.5\% – 13.0\%}$  
   - Upfront Fee $= 2.0\%$; with 18% GST $= 2.36\%$  
   - All-In APR $= 13.0\% + \frac{2.36\%}{4} = \mathbf{13.59\%}$
5. **Verdict Evaluation (O1):**  
   - Request of ₹8,00,000 $\le$ Safe Ceiling of ₹12,62,000 $\implies \mathbf{BORROW}$
6. **Stress Testing (O4):**  
   - Stressed Income (-20%) $= ₹88,000$  
   - Stressed Disposable $= ₹88,000 - ₹14,000 - ₹28,000 = ₹46,000$  
   - Stressed Safe EMI $= ₹46,000 \times 0.50 = ₹23,000/\text{month}$  
   - EMI on proposed ₹8L loan (at 13%, 4yr) $= ₹21,467/\text{month}$  
   - Check: $₹21,467 \le ₹23,000 \implies \mathbf{Survives\ Stress\ Shock}$

---

### 4. The Four Outputs (Priya)

- **O1 — Verdict:** **BORROW** — ₹8,00,000 fits comfortably inside your safe carrying capacity of ₹12,62,000. Affordability is not your constraint; your objective in the branch is negotiating the lowest rate and zero processing fee.
- **O2 — Amount:**
  - **Lender Sanction Limit:** ₹17,25,000
  - **Safe Carrying Capacity:** **₹12,62,000**
  - **Recommendation:** *Use ₹12,62,000 as your ceiling. Do not let the lender anchor you to their ₹17.25L limit.*
- **O3 — Fair Rate:** **10.5% – 13.0%** (All-in APR: ~**13.59%** with 2% fee + 18% GST).
- **O4 — EMI Ceiling:** **₹34,000/month** over 4 years. Proposed loan implies **₹21,467/month**. Under a 20% income shock, safe ceiling drops to ₹23,000/month, which still accommodates the loan.

---

### 5. Negotiation Card — Priya

```
============================================================
LOKTA BORROWER COPILOT — NEGOTIATION CARD
============================================================
BORROWER: Priya (Salaried MNC, Bengaluru)
VERDICT: BORROW (Prime Credit Profile)
------------------------------------------------------------
TARGET LOAN:      ₹8,00,000 over 4 Years (Personal Loan)
SAFE CEILING:     ₹12,62,000 (Borrower Cash Flow Limit)
LENDER CAPACITY:  ₹17,25,000 (Do NOT accept above ₹12.6L)
------------------------------------------------------------
FAIR RATE BAND:   10.5% – 13.0%
ESTIMATED APR:    ~13.59% (Includes 2% fee + 18% GST)
MAX SAFE EMI:     ₹34,000/month (Current Ask EMI: ₹21,467/mo)
FEE CEILING:      2.0% + GST (Max ₹18,880 total)
------------------------------------------------------------
TALKING POINTS FOR THE LENDER:
1. "My CIBIL is 780 and I am at an Tier-1 MNC. Your published prime band
   is 10.5%–13.0%. What is your lowest offer inside 10.5%–11.5%?"
2. "What is the exact all-in APR including processing fee, documentation,
   and 18% GST as per RBI Key Fact Statement guidelines?"
3. "Are there any mandatory bundled insurance charges? Remove them."
4. "I will not borrow above ₹8,00,000 regardless of your pre-approved
   limit of ₹17.25 Lakhs."
------------------------------------------------------------
WALK-AWAY TRIGGER:
Walk away if quoted rate exceeds 13.5% or if lender refuses to waive
or discount the 2% processing fee.
============================================================
```

---

## Persona 2: Ravi, 42 — Mysuru (Self-Employed Kirana Store Owner)

### 1. Profile Summary
- **Business:** Kirana grocery store for 14 years
- **Income Structure:** Cash income ₹40,000–₹80,000/month; Last audited ITR shows ₹4,20,000/year (₹35,000/mo)
- **Collateral:** Owns commercial shop premises, unencumbered, market value ~**₹45,00,000**
- **Credit Bureau:** No formal credit history; score is **Unknown**
- **Co-Applicant:** Wife earns **₹18,000/month** teaching (agrees to formally co-sign)
- **Existing Debt:** ₹0 EMIs
- **Living Expenses:** ₹40,000/month
- **Borrower Request:** Wants **₹15,00,000** for a second stock line and a delivery vehicle

---

### 2. Adaptive Questions Asked & Answers Given

| Step | Question | User Input | Engine Effect |
|---|---|---|---|
| Q1 | What is this loan for? | "Stock line + delivery vehicle" | Productive business expansion purpose |
| Q2 | How much are you looking to borrow? | ₹15,00,000 | Sets request target for sizing comparison |
| Q3 | How do you earn? | Self-employed (business) | Activates ITR, cash revenue, and vintage questions |
| Q4 | How old are you? | 42 | Age within working tenure horizon |
| Q5 | Years running this business? | 14 years | Established vintage ($\ge 3$yr) qualifies for 45% FOIR |
| Q6 | Last annual ITR income? | ₹4,20,000 | Sets documented monthly base at ₹35,000 |
| Q7 | Monthly cash income range? | ₹40,000 – ₹80,000 | Average ₹60,000; cash excess above ITR = ₹25,000 |
| Q8 | 6 months bank statements available? | No | Applies conservative 40% haircut on cash excess |
| Q9 | Any formal co-applicant? | Yes — Wife, ₹18,000/mo | Adds ₹18,000 to effective recognized income |
| Q10 | Any collateral you can pledge? | Property, ₹45,00,000 | **High-value routing: Switches to secured LAP** |
| Q11 | Total existing EMIs? | ₹0 | Zero debt deduction |
| Q12 | Monthly household expenses? | ₹40,000 | Deducted from disposable income calculation |
| Q13 | Do you know your credit score? | Don't know / No history | In LAP, collateral prices loan; score is secondary |

---

### 3. Step-by-Step Mathematical Derivation

1. **Effective Income:**  
   - ITR monthly floor $= \frac{₹4,20,000}{12} = ₹35,000$  
   - Stated Cash average $= \frac{₹40,000 + ₹80,000}{2} = ₹60,000$  
   - Cash excess above ITR $= ₹60,000 - ₹35,000 = ₹25,000$  
   - Haircut (40% unverified) $\implies ₹25,000 \times (1 - 0.40) = ₹15,000$ counted  
   - Co-applicant wife $= ₹18,000$  
   - **Effective Monthly Income** $= ₹35,000 + ₹15,000 + ₹18,000 = \mathbf{₹68,000/\text{month}}$
2. **Product Routing & LTV Cap:**  
   - Unencumbered shop valued at ₹45,00,000 pledged $\implies$ Routes to **Loan Against Property (LAP)**  
   - LTV Cap (60%) $= ₹45,00,000 \times 0.60 = \mathbf{₹27,00,000}$  
   - Ravi's ask of ₹15L is well within the ₹27L LTV limit.
3. **Lender Sizing Capacity (Secured FOIR):**  
   - Self-employed $\ge 3$yr FOIR $= 45\%$; Secured boost $= +10\% \implies \mathbf{55\%}$  
   - Lender Monthly Capacity $= ₹68,000 \times 0.55 - ₹0 = \mathbf{₹37,400/\text{month}}$  
   - Lender Max Sanction (at 12.5% upper LAP rate over 10 years) $= \mathbf{₹25,83,000}$ (capped by LTV at ₹27L)
4. **Borrower Safe Capacity (Secured Surplus View):**  
   - Disposable Cash Flow $= ₹68,000 - ₹0 - ₹40,000 = ₹28,000/\text{month}$  
   - Secured Safe Factor $= 50\% + 15\% = \mathbf{65\%}$  
   - Safe Monthly EMI $= ₹28,000 \times 0.65 = \mathbf{₹18,200/\text{month}}$  
   - Safe Max Carrying Amount (at 12.5% upper LAP rate over 10 years) $= \mathbf{₹12,56,000}$
5. **Verdict Evaluation (O1):**  
   - Ravi asked for ₹15,00,000.  
   - His safe capacity is ₹12,56,000.  
   - Since $₹15,00,000 > ₹12,56,000 \implies \mathbf{BORROW\ LESS}$ (Recommend ₹12.5 Lakhs).
6. **Rate Band & APR:**  
   - Secured LAP pricing $\implies \mathbf{9.5\% – 12.5\%}$  
   - Upfront Fee $= 1.0\%$; with 18% GST $= 1.18\%$  
   - All-In APR (over 10yr) $= 12.5\% + \frac{1.18\%}{10} = \mathbf{12.62\%}$

---

### 4. The Four Outputs (Ravi)

- **O1 — Verdict:** **BORROW LESS** — Your requested ₹15,00,000 exceeds your safe cash-flow limit of ₹12,56,000. While the bank will happily sanction up to ₹25.8 Lakhs against your shop, borrowing ₹15L would stretch monthly EMIs to ₹21,900, eating into your working capital.
- **O2 — Amount:**
  - **Lender Sanction Limit:** ₹25,83,000 (Collateral supported)
  - **Safe Carrying Capacity:** **₹12,56,000**
  - **Recommendation:** *Stick to ₹12.5 Lakhs as your hard ceiling.*
- **O3 — Fair Rate:** **9.5% – 12.5%** (All-in APR: ~**12.62%**). Score unknown does not penalize because the loan is backed by prime commercial property.
- **O4 — EMI Ceiling:** **₹18,200/month** over 10 years. Under a 20% business revenue drop, safe EMI drops to ₹9,360/month.

---

### 5. Negotiation Card — Ravi

```
============================================================
LOKTA BORROWER COPILOT — NEGOTIATION CARD
============================================================
BORROWER: Ravi (Kirana Owner, Mysuru)
VERDICT: BORROW LESS (Secured LAP Strategy)
------------------------------------------------------------
TARGET LOAN:      ₹12,50,000 over 10 Years (Loan Against Property)
REQUESTED ASK:    ₹15,00,000 (Trim ask by ₹2.5L to protect cash flow)
LENDER CAPACITY:  ₹25,83,000 (Do NOT let branch upsell you)
------------------------------------------------------------
FAIR RATE BAND:   9.5% – 12.5% (Secured Property Card)
ESTIMATED APR:    ~12.62% (Includes 1% fee + 18% GST)
MAX SAFE EMI:     ₹18,200/month
COLLATERAL:       Commercial shop premises valued at ₹45,00,000
------------------------------------------------------------
TALKING POINTS FOR THE LENDER:
1. "I am pledging an unencumbered commercial shop valued at ₹45 Lakhs.
   This must be processed as a secured LAP loan, not an unsecured
   business loan."
2. "My target rate is 9.5%–10.5%. Do not price this off lack of CIBIL
   score — the loan is 3.5× collateralized."
3. "My wife is joining as formal co-applicant with documented teaching
   income of ₹18,000/month."
4. "The branch limit shows ₹25+ Lakhs. I will strictly take ₹12.5 Lakhs.
   Do not disburse higher."
------------------------------------------------------------
WALK-AWAY TRIGGER:
Walk away if lender tries to push an unsecured business loan at 16%–20%
instead of a secured LAP loan at 9.5%–12.5%.
============================================================
```

---

## Persona 3: Anita, 35 — Hubballi (Informal Platform Rider, Distressed Debt)

### 1. Profile Summary
- **Occupation:** Delivery-platform rider (electric/petrol) plus home tailoring
- **Income:** ₹26,000 – ₹30,000/month (midpoint ₹28,000/mo)
- **Family Context:** Two children; husband unemployed for 8 months (sole breadwinner)
- **Debt Burden:** Three app loans with **₹35,000 outstanding at 30%+ APR**
- **Repayment History:** **One EMI bounced last month**
- **Emergency Savings:** 0 months
- **Living Expenses:** ₹20,000/month
- **Borrower Request:** Wants **₹1,50,000** for an electric scooter to increase delivery runs

---

### 2. Adaptive Questions Asked & Answers Given

| Step | Question | User Input | Engine Effect |
|---|---|---|---|
| Q1 | What is this loan for? | "E-scooter for delivery" | Productive transport purpose |
| Q2 | How much are you looking to borrow? | ₹1,50,000 | Sets request target |
| Q3 | How do you earn? | Informal / gig work | Activates gig income range & stability questions |
| Q4 | How old are you? | 35 | Standard working age |
| Q5 | Monthly income range? | ₹26,000 – ₹30,000 | Midpoint taken at ₹28,000 |
| Q6 | Existing debts or app loans? | ₹35,000 balance at 30%+ | Amortizes informal debt burden to ~₹3,415/mo |
| Q7 | Any payment bounces in last 6 months? | **Yes — 1 bounce last month** | **TRIGGERS HARD STOP (STOP.BOUNCE)** |
| Q8 | Emergency savings in months? | 0 months | Multiplier penalized by 0.90x |
| Q9 | Monthly household living costs? | ₹20,000 | Evaluated against residual cash flow |

---

### 3. Step-by-Step Mathematical Derivation

1. **Effective Income:**  
   $$\text{Income} = \frac{₹26,000 + ₹30,000}{2} = \mathbf{₹28,000/\text{month}}$$
2. **Existing Debt Service:**  
   - ₹35,000 app debt at 30% APR amortized over 12 months $= \mathbf{₹3,415/\text{month}}$  
   - Existing Debt Service Ratio $= \frac{₹3,415}{₹28,000} = \mathbf{12.2\%}$
3. **Disposable Cash Flow:**  
   $$\text{Disposable} = ₹28,000 - ₹3,415 - ₹20,000 = \mathbf{₹4,585/\text{month}}$$
4. **Hard-Stop Evaluation (O1):**  
   - `STOP.BOUNCE`: A payment bounce occurred in the previous month.  
   - Taking a fresh ₹1,50,000 loan would require a monthly EMI of ~₹5,000/month, which exceeds her entire disposable cash flow of ₹4,585.  
   - **Verdict:** $\mathbf{DONT\_BORROW}$ (Non-negotiable protective stop).
5. **Constructive Path to Yes:**  
   - Do not take another high-cost loan.  
   - Clear existing ₹35,000 app loans first to recover ₹3,415/month in cash flow.  
   - Maintain 6 consecutive months of clean banking and zero bounces before reapplying.

---

### 4. The Four Outputs (Anita)

- **O1 — Verdict:** **DON'T BORROW** — A payment bounced in the last month and you have ₹35,000 in active app debt. Taking a ₹1.5L loan right now will trigger a default cycle that will damage your credit for years.
- **O2 — Amount:**
  - **Lender Sanction Limit:** ₹6,385/mo max EMI (~₹1,70,000 theoretical NBFC limit)
  - **Safe Carrying Capacity:** **₹0 (Until debt is consolidated)**
  - **Recommendation:** *Borrow ₹0 today. Do not take fresh credit.*
- **O3 — Fair Rate:** **11.0% – 15.0%** (NBFC Two-wheeler loan tier; predatory apps will charge 30%–45%).
- **O4 — EMI Ceiling:** **₹0/month**. Any new EMI would leave negative cash flow after living expenses.

---

### 5. Negotiation Card — Anita (Protective Guidance)

```
============================================================
LOKTA BORROWER COPILOT — FINANCIAL SAFETY CARD
============================================================
BORROWER: Anita (Platform Rider, Hubballi)
VERDICT: ⚠️ DO NOT BORROW TODAY
------------------------------------------------------------
CURRENT DEBT DRAIN: ₹3,415/month (₹35,000 app loans @ 30%+)
HOUSEHOLD SURPLUS:  ₹4,585/month (Too thin for a new ₹5k EMI)
BOUNCE STATUS:      1 Recent Bounce Detected
------------------------------------------------------------
🎯 YOUR STEP-BY-STEP PATH TO YES:
1. STOP ALL NEW BORROWING:
   Do not take another app loan or BNPL facility.

2. CLEAR THE 30%+ APP LOANS FIRST:
   If you have any family gold, taking a small ₹35,000 gold loan at
   9%–11% to clear the 30%+ app loans will immediately save you
   ₹800+/month in interest.

3. SIX MONTHS OF ZERO BOUNCES:
   Maintain 100% clean account transactions for the next 6 months.
   This resets your risk profile with formal NBFC lenders.

4. TARGET THE VEHICLE LOAN IN MONTH 7:
   Once the app loans are zero, your safe capacity jumps to ₹1,40,000
   and you can get a captive EV two-wheeler loan at 11%–13%.
============================================================
```
