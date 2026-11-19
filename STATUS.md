# Status

Built overnight on 19 November 2026 for the keynote that morning. This records what is done, what is not, and what needs a decision.

## Complete

| Item | State |
| --- | --- |
| Landing page with all six tools | Done |
| Three-minute diagnostic | Done. No score, no verdict on financial health. |
| Cost-per-hour calculator, with utilisation, realisation, collection, target surplus and an hours sensitivity table | Done |
| Fee architecture simulator: hourly, capped, fixed, staged, four outcomes, scope prompts, Canon IV(f) warning | Done |
| Cash-flow simulator with billing and collection delays, growth step, 30/60/90 day comparison and a month-by-month table | Done |
| AI economics calculator with review-time sensitivity and break-even redeployment | Done |
| Practice scorecard: five starting measures, four further, client-account reconciliation kept separate | Done |
| 30-day plan, tickable, shaped by the diagnostic, printable and copyable | Done |
| Resources: the paper as PDF, the staged fee clause, the measures defined, Jamaican law and comparative material | Done |
| Demonstration mode (`?demo=1` on any calculator) | Done |
| QR assets, decoding verified | Done |
| Automated tests against the paper's figures | Done, 37 passing |
| Browser pass on all pages at 390px and 1280px | Done, no console errors, no overflow |
| Print layouts for the scorecard, the plan and the diagnostic result | Done |
| Print and Copy on all four calculators, each printing as a report with a record of the figures entered | Done |
| The staged fixed-fee clause and its schedule as a Word file and a PDF, linked from Resources | Done |
| Privacy: no analytics, no tracking, no network calls, no financial data stored | Done |

## Not built, and why

- **A separate big-screen presentation view.** The keynote deck does not include a live demonstration of the Hub, so this view had nothing to be used for on the day. The print layout already produces a clean large-type page. Worth adding if the Hub is ever shown on screen.
- **A single combined report across all the tools.** Each tool prints and copies on its own. One report gathering every tool's figures into a single document is a larger job and was not attempted overnight.
- **A short custom domain.** The address is `slstimpson.github.io/beyond-the-billable-hour-hub/`. The QR code carries it, so length does not matter on the slide. A custom domain can be added later in Settings > Pages without changing anything else, but the QR assets would then need regenerating.
- **Saving a session between visits.** Deliberate. Figures are never written to durable storage.

## Needs a decision

1. **Where the QR goes in the deck.** The recommendation is the discussion slide, which stays on screen through the question period, with one line on the "back in office" slide saying the scorecard is in the paper and the Hub runs it on your own numbers.
2. **Whether the paper PDF should be public before the JBA circulates it.** It is currently published at `paper/beyond-the-billable-hour.pdf` and linked from the Resources page. Removing it is one file deletion and one edit to `resources.html`.

## If something is wrong on the day

The site is nine static files. Nothing can break at the venue, because nothing is fetched after the page loads and no network is needed once it is open.

If a figure looks wrong, the paper governs. Every tool shows its own calculation under "Show the calculation", so a disagreement can be traced in front of whoever raises it.
