# Borrower Copilot — Build Prompt

Paste this whole thing into an AI coding agent (Claude Code, Cursor, etc.) as the first message,
then iterate. You already understand every rule in here — that's the point of using this, not a
substitute for it. The follow-up interview will ask you to change one of these rules live, and
you'll need to do it without the prompt.

---

## Role & objective

You are a senior full-stack engineer building "Borrower Copilot" — a client-side-only web app that
helps an Indian borrower self-assess a loan **before** talking to a lender. No login. No bureau
pull. No data leaves the browser. The app must produce four outputs plus a one-page Negotiation
Card, from an adaptive questionnaire, entirely through a transparent, deterministic rules engine —
not a machine-learning model.

## The four outputs (non-negotiable)

1. **O1 — Verdict**: Borrow / Borrow less / Don't borrow, with a one-sentence reason. "Don't
   borrow" must be genuinely reachable — not a decorative option that never fires.
2. **O2 — Maximum amount**: two numbers, clearly separated — what a lender will likely sanction
   (FOIR-on-income-only view) and what the borrower can safely carry (nets out living
   expenses/obligations, plus a stress buffer). State which one to use, and why they differ.
3. **O3 — Fair rate**: a band, not a point, plus the all-in APR including a processing fee — so a
   lender's quote can be checked against it honestly.
4. **O4 — EMI ceiling**: a monthly number not to cross, the tenure trade-off, and one stress case
   (income -20% or rate +2 points).

## Architecture

- **Stack**: Next.js + TypeScript (or plain Vite + React + TS if you'd rather skip SSR). No
  backend, no database — everything computes client-side.
- **Rules separated from UI, hard requirement**: put every threshold, formula, and band in
  `/lib/rules/config.ts` (plain data) and `/lib/rules/engine.ts` (pure functions, no React, no
  side effects, fully unit-testable). UI components only call the engine and render its output —
  they never contain a threshold.
- **RULES.md and config.ts must stay in sync** — RULES.md is the human-readable mirror of
  config.ts. If you change a number, change both in the same commit.
- **Tests**: unit-test the engine against the three personas below as fixtures (Vitest or Jest).
  These tests double as your "three run-throughs" deliverable if you snapshot the outputs.
- **Negotiation Card export**: render as a print-friendly view, or export via a lightweight
  client-side PDF lib (e.g. `jspdf`) or the browser's print-to-PDF — no server round-trip.
- **No ML, no bureau API, no persistence** — this is explicitly not scored and works against you
  if you add it; it makes the reasoning less auditable, which is the opposite of what's tested.

## Domain rules to encode (starting point — adjust and justify any change in RULES.md)

**Effective income**
- Salaried: declared net salary, as-is.
- Self-employed: last ITR annual income ÷ 12, plus a haircut on any cash income above that: 40%
  haircut if unverified, 15% if 6 months of bank statements are provided. If business vintage < 3
  years, fall back to the informal ceilings below — a young business hasn't proven income
  stability yet.
- Informal/gig: midpoint of the borrower's stated income range. Add a co-earner's income only if
  they're a formal co-applicant.

**Affordability ceilings (FOIR-style, % of effective income available for EMI)**

| Segment | Lender-view ceiling | Borrower-safe ceiling |
|---|---|---|
| Salaried, income ≥ ₹50k/mo | 55% | 50% of (income − existing EMI − household expenses) — usually the tighter number |
| Salaried, income < ₹50k/mo | 45% | same disposable-income method |
| Self-employed (≥3yr vintage) | 45% | same disposable-income method |
| Informal / gig | 35% | 25%, further adjusted ±10 points by stated emergency-savings months |
| Any of the above, secured by collateral | ceiling +10 points | safe factor +15 points, capped by LTV regardless |

Document the disposable-income method clearly:
`safe EMI = (income − existing EMI − household expenses) × 0.5`.
This is *why* the lender number and the borrower number are legitimately different — the lender's
FOIR check usually ignores rent and lifestyle costs; the borrower can't.

**Credit / pricing**
- Known score ≥750: 10.5–13%. 700–749: 13–16%. 650–699: 16–20%. <650: 20–24% (flag likely decline
  for unsecured at this tier).
- Unknown score: never assume a value. Use the 650–699 band widened ±2 points, and say plainly
  that a bureau check would likely narrow it.
- Collateral present and requested amount within LTV (property 60%, gold 75%): route to a secured
  product (LAP for property, gold loan for gold) and price off collateral, not the credit score —
  score becomes irrelevant to eligibility, only informative if known.
- APR = quoted rate + (processing fee % ÷ tenure in years). Flag this as a simplified
  straight-line estimate, not the exact RBI Key Fact Statement XIRR method — be honest about the
  approximation.

**Verdict logic**
- Any payment bounce in the last 6 months (informal segment) → **Don't borrow**, full stop,
  regardless of other numbers.
- Existing EMI ÷ income ≥ 30% and includes flagged high-cost debt (24%+, e.g. app loans) →
  **Don't borrow**.
- Requested amount > safe-carry ceiling, no red flags → **Borrow less**, recommend the safe-carry
  number.
- Otherwise → **Borrow**. If the requested amount sits well under the safe ceiling, say so
  explicitly — the constraint may be rate, not amount.

**Confidence**
- Confidence is a first-class piece of state, not decoration. Start wide. Each "additional"
  question answered (bank-statement verification, collateral details, co-applicant, savings
  buffer, income-stability detail) should visibly narrow the displayed range or move a number —
  if a question doesn't do that in your implementation, cut it.

## Question design

- **Must-tier (8–10 questions, everyone answers these)**: purpose, amount wanted, loan type,
  employment type, income (form varies by employment type), existing EMI total, household
  expenses, age, credit score or "don't know."
- **Adaptive branches** — only show what applies:
  - Salaried → nothing extra required, but fold rent into the household-expenses field.
  - Self-employed → business vintage, ITR income, cash income range, bank-statement-verified
    toggle, collateral type/value, co-applicant toggle.
  - Informal → income range, recent-bounce toggle, high-cost-debt toggle, emergency-savings
    months.
- Every additional question must move a number in the engine. If you add one that doesn't, cut
  it — this is explicitly scored.

## Three test personas (use as engine fixtures)

1. **Priya**, 29, Bengaluru, salaried, ₹1,10,000/mo net, 5yr tenure at a large MNC, car EMI
   ₹14,000 (2yr left), score 780, rent ₹28,000, wants ₹8,00,000 personal loan for a wedding.
2. **Ravi**, 42, Mysuru, self-employed 14yr kirana owner, cash income ₹40,000–80,000/mo, ITR shows
   ₹4,20,000/yr, owns his shop (~₹45,00,000, unencumbered), no formal credit history, wife earns
   ₹18,000, wants ₹15,00,000 for stock + a delivery vehicle.
3. **Anita**, 35, Hubballi, informal delivery rider + tailoring, ₹26,000–30,000/mo, two kids,
   husband unemployed 8 months, three app loans (₹35,000 outstanding, 30%+ APR), one bounce last
   month, wants ₹1,50,000 for an e-scooter.

Expected shape of the answers (yours may differ in exact numbers — that's fine, the reasoning is
what's graded):
- Priya: **Borrow**, well inside her safe capacity — the real lever is negotiating rate, not
  amount.
- Ravi: route to **Loan Against Property**, not an unsecured business loan — his collateral
  covers what his undocumented cash income alone can't prove. Likely **Borrow less** than his
  ₹15L ask on income grounds alone, with a clear path (bank statements, co-applicant) to close
  the gap.
- Anita: **Don't borrow** — the bounce and existing high-cost debt are hard stops. The
  Negotiation Card should pivot to "what to do instead," not a rate to negotiate.

## Deliverables to produce alongside the app

1. Working app, runs locally from README in under 5 minutes, no backend.
2. `RULES.md` — table format: *what · value · why · source or "my judgement"*. This is read as
   carefully as the code.
3. Three run-throughs (Priya, Ravi, Anita): questions asked, four outputs, Negotiation Card.
4. A five-minute walkthrough (recording or written): what you'd build next, what you'd cut.

## Explicit non-goals

No ML model. No real bureau integration. No login or data storage. No loan products beyond what
the three personas need (personal, LAP, gold, business, two-wheeler is enough). Don't
over-engineer the UI — a clean, honest, mobile-first form beats a polished shell around thin
reasoning; the rubric weights reasoning and explainability at roughly 70% of the score, product
craft at 15%, and engineering hygiene at 10%.
