# Assumptions, limits and legal references

Everything the Hub calculates comes from *Beyond the Billable Hour: The Economics of Modern Legal Practice* (Stuart L. Stimpson, JAMBAR CLE Conference, 19 November 2026), principally Appendix C.

Each item below is marked:

- **Law** — binding in Jamaica.
- **Comparative** — guidance or evidence from another jurisdiction, not Jamaican law.
- **Model** — a teaching assumption or a formula, not a fact about any market.

---

## 1. The figures the tools carry

**The calculators open empty.** No money figure is filled in for the visitor. A calculator that opens on somebody else's numbers invites the reader to treat them as a benchmark, and the central claim of the paper is that no Jamaican benchmark exists. The paper's example is one button away on each tool, labelled as the paper's, and `?demo=1` loads it directly.

Rate sliders cannot be blank, so they start at neutral positions (realisation and collection at 100%) rather than at the paper's assumptions. The example sets them to the paper's figures along with everything else.

**Model.** The figures below are hypothetical Jamaican-dollar teaching assumptions from the paper, used by the example button and by the worked examples. None is a market rate, a survey result or a benchmark. No Jamaican fee scale exists for conveyancing, probate or anything else.

| Default | Value | Where it comes from |
| --- | --- | --- |
| Monthly overhead, before growth | $1,600,000 | Worked Example 1 |
| Monthly overhead, after growth | $2,300,000 | Worked Example 1 |
| Owner's labour allowance | $900,000 | Worked Example 1, treated as a market-level wage for her fee-earning work |
| Billable hours a month | 110 | 50 principal + 60 associate, Worked Example 1 |
| Cost per billable hour | $22,727.27 | (1,600,000 + 900,000) ÷ 110, Appendix C |
| Hourly rate | $35,000 | Worked Example 2 |
| Realisation | 85% | Worked Example 1 |
| Collection | 92% | Worked Example 1 |
| Recorded value, monthly | $3,500,000 then $5,400,000 | Appendix C |
| Opening office cash | $1,000,000 | Appendix C |
| Matter: expected hours | 40 | Worked Example 2 |
| Cap / fixed / first stage | $1,400,000 / $1,500,000 / $1,100,000 | Worked Example 2 |
| AI: tasks, baseline, draft | 20 a month, 3 hours each, 40 minute draft | Worked Example 3 |
| AI: subscription and set-up | $30,000 a month, $60,000 over 12 months | Worked Example 3 |
| Collected per additional hour | $27,370 | 35,000 × 85% × 92%, Appendix C |

## 2. Cost per billable hour

**Model.** Total cost ÷ realistic billable hours, where total cost is overhead plus an allowance for the principal's own professional labour.

The owner's labour is included because the principal's fee-earning work has a cost even though she takes drawings and no salary. The question the input asks is what the firm would have to pay another suitably qualified attorney to do that work. What remains after that cost and all others is the surplus that rewards ownership, management and risk.

"Recovery needed per hour" grosses the cost up for realisation and collection, and for any target surplus the user sets. It answers what must be charged for an hour to cover its cost, not what may be charged.

**Law.** Cost does not establish price. Canon IV(f) of the Legal Profession (Canons of Professional Ethics) Rules, 1978, as amended, requires a fee to be fair and reasonable, with time and labour one factor among several: the difficulty, the skill required, customary fees for similar work, the amount involved, urgency, the attorney's experience and reputation, and whether the fee is fixed or contingent.

## 3. Fee architecture

**Model.** Four arrangements on the same matter:

```
hourly       = hours × rate
capped       = min(hours × rate, cap)
fixed        = fixed fee × (1 + any risk allowance)
staged       = first-stage price + (rate × later-stage hours)
contribution = fee collected − (hours × cost per hour) − other delivery cost
```

Later-stage hours default to one quarter of the total, as in Worked Example 2. The preset assumes the fee is collected in full, which is what the paper's table does; the collection slider allows anything less.

Contribution is not profit. It has not paid for the overhead of matters that never came in, tax, financing or bad debts.

**Law.** Section 21 of the Legal Profession Act deals with written remuneration agreements and section 22 with the taxation of bills. *Russell (Trudy-Ann) v General Legal Council* [2024] JMCA Misc 2 holds that the gap between a fixed fee and a later hourly bill does not, alone, prove an unreasonable fee, and that a fee properly found to be unfair can amount to professional misconduct. Contingency fees are a separate statutory arrangement under the Legal Profession (Contingency Fees) Regulations, 2018, requiring a signed written agreement and subject to ceilings of 25%, 30% and 33⅓% depending on the stage reached.

**Law.** A fixed fee is not fully earned merely because a retainer ends early. Unearned sums must be accounted for.

**Model.** The paper's own conclusion on fixed pricing: the research reviewed does not show that moving to fixed fees will of itself improve profit or client satisfaction in a Jamaican practice. Test the change on defined types of matter and measure cost, quality and collections before extending it.

## 4. Cash flow

**Model.** A simplified cash-timing model, not a profit and loss statement.

```
billed(n)   = recorded(n − billing delay) × realisation
receipts(n) = recorded(n − billing delay − collection delay) × realisation × collection
cash(n)     = cash(n−1) + receipts(n) − overhead(n) − drawings
```

Before the delay reaches back past month 1, receipts come from the opening pipeline of earlier work, as the paper describes. The surplus column is fees billed less that month's overhead; it excludes the owner's pay, tax, financing and bad debts and is not profit.

Growth adds overhead from the month it starts, while the matching fees arrive later. That timing difference is the point of the model.

**Model.** The paper's suggestion that a firm might aim for payment within 14 to 28 days of billing for suitable clients is the author's own proposal. No Jamaican benchmark supports it.

**Law.** Client money is excluded entirely. Money in the clients' trust account is not office cash. An advance for work not yet done is client money, whatever the engagement calls it, and may be transferred only against fees properly earned and billed or as the law otherwise permits: Legal Profession (Accounts and Records) Regulations, 1999, as amended, including the GLC consolidation through 2017 and Gazette amendments of 2 April 2019, 4 June 2021 and 28 July 2021 (effective 1 January 2022). The Hub cannot and does not say whether any particular transfer is lawful.

**Law.** Any suspension of work for non-payment must comply with Canon IV(n) and (o), the engagement and court procedure.

## 5. AI economics

**Model.**

```
hours released          = tasks × (baseline hours − (draft + review) ÷ 60)
collected per hour      = rate × realisation × collection
monthly technology cost = subscription + set-up ÷ months allocated
break-even redeployment = technology cost ÷ (hours released × contribution per hour)
```

The model assumes payroll does not change and that replacement work uses existing capacity without additional expenditure. Where extra staff, supervision or other costs are needed, the per-hour cost input must carry them. In this simplified model incremental collections equal incremental contribution because no additional delivery cost is assumed.

"Idle" means released hours do not become new paid work. "Redeployed" means they are used for another paying assignment.

The review time is an assumption the user chooses. **No figure in the Hub suggests what a professionally sufficient review would be.** Checking takes time and belongs in the cost of the work.

**Law.** Supreme Court of Jamaica Practice Direction No 1 of 2025, effective 17 September 2025, requires AI-assisted court documents to be verified and disclosed by the prescribed declaration and, subject to its express terms, prohibits using generative AI to draft or alter affidavits or witness statements meant to express personal knowledge or belief, to generate purported expert evidence or to fabricate evidence. Caribbean Court of Justice Practice Direction No 1 of 2025 (14 February 2025) also requires verification and care with confidential and privileged material.

**Comparative.** The Law Society of England and Wales practice note of 21 October 2026 says that only time actually and properly spent may be billed on time-based fees, and expects a clear scope and a justified fee under other models. Queensland and Virginia guidance points the same way. None of this is Jamaican law. The paper reads it as a foreshadowing of a conversation the profession here will have.

## 6. Scorecard

**Model.** Nine measures, each defined on the page, from Appendix A. The five starting measures are cost per billable hour, collection rate, debtor days, cash reserve and matter contribution margin. Debtor days and unbilled work are expressed against average daily billings over the period entered.

Realisation is meaningful for hourly work and should not be applied to fixed fees.

**Law.** Client-account reconciliation is a mandatory compliance check under the Accounts and Records Regulations. It is kept out of the commercial measures deliberately: it is not a performance target, and a current reconciliation says nothing about profitability. Practitioners should confirm the applicable deadline and sign-off for their own practice.

**Model.** No benchmarks are offered. The comparison that means anything is a practice against its own history.

## 7. The diagnostic

**Model.** Five self-reported answers produce up to three management priorities, ordered by the weight of the answer given. There is no score. It does not describe a practice as financially healthy or unhealthy, and it is not a financial audit. A practice answering well at every question is pointed towards depth rather than given an invented fault.

## 8. Privacy

No analytics, no tracking, no cookies, no third-party code, no network requests after the page loads. Diagnostic answers and the 30-day ticks are held in `sessionStorage` so that one tool can hand over to another; they are discarded when the tab closes. Financial inputs are never stored at all.

The Hub never asks for a client name, a client account number, a matter description, a privileged document or a banking credential.

## 9. Links to the sources

Every legal source on the Resources page links to its official publisher: the Ministry of Justice for the Act, the General Legal Council for the Canons, the Accounts and Records Regulations and the Contingency Fees Regulations, the Court of Appeal and the Supreme Court for the judgments and practice directions, and the Caribbean Court of Justice for its own. Links were checked on 19 November 2026.

Two qualifications. Supreme Court Practice Direction No 2 of 2018 is linked to the Court's practice directions index rather than to a document address, because no stable direct address was found. The Law Society of England and Wales restricts automated access to its site, so that address comes from the practice note's own published link rather than from opening the page.

Legislation is amended and pages move. Verify the current text and status of any provision before relying on it in a matter.

## 10. Known limits

- The cash model runs twelve months and assumes a single growth step. A practice with several hiring events or seasonal work needs its own model.
- The fee tool prices one matter. Firm-wide averages can hide matters that lose money, which is why the paper recommends comparing each completed stage with its own cost.
- The AI tool models one recurring task type, not a whole practice.
- Amounts are before tax unless stated and exclude disbursements.
- GCT is not modelled anywhere.
