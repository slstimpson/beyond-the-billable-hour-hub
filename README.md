# Practice Economics Hub

**Know your costs. Test your fees. Understand your cash flow.**

A companion application to *Beyond the Billable Hour: The Economics of Modern Legal Practice*, the keynote opening Theme 1, Practice Profitability and The Modern Law Firm, at the Jamaican Bar Association Continuing Legal Education Conference on 19 November 2026.

Author of the paper and the keynote: Stuart L. Stimpson.

Live site: <https://slstimpson.github.io/beyond-the-billable-hour-hub/>

---

## What it is

A static website. Eight pages, no build step, no framework, no server, no database and no account. Every calculation runs in the visitor's own browser. Nothing a visitor types is transmitted, stored remotely or sent to any AI service.

| Page | What it does |
| --- | --- |
| `index.html` | Landing page and the six tools |
| `check.html` | Three-minute diagnostic: five questions, three priorities, no score |
| `cost-per-hour.html` | Full cost of one billable hour, with sensitivity to hours billed |
| `fees.html` | One matter priced hourly, capped, fixed and staged, across four outcomes |
| `cash-flow.html` | Work, record, bill, collect, with billing and collection delays |
| `ai.html` | Hours released by an AI tool against its cost, and break-even redeployment |
| `scorecard.html` | Five starting measures and four further ones, each defined |
| `plan.html` | The paper's checklist as four weeks, tickable and printable |
| `resources.html` | The paper, the staged fee clause in Word and PDF, the measures and the legal sources |

## The rule that governs this repository

**The conference paper governs.** Every formula, figure, worked example and legal reference comes from the paper, principally Appendix C. Where this site and the paper disagree, the paper is right and the site has a bug.

`tests/calc.test.mjs` exists to enforce that. It asserts the site's engine against the figures printed in the paper: every fee and contribution in Worked Example 2, the full twelve-month cash table in Appendix C, the receipt figures of $2,737,000 and $4,222,800, the lowest cash at 30, 60 and 90 days ($785,000, $322,000 and minus $141,000 in month 7), and the AI table including $27,370 collected per additional hour and break-even redeployment of 2.95%, 3.49% and 4.80%.

Do not change a figure in `assets/calc.js` to make a test pass. If the paper changes, change the test first, then the engine.

## Running it

Any static server. There is no build.

```bash
python3 -m http.server 8099     # then open http://localhost:8099
```

Opening `index.html` directly from the file system will not work, because the pages load ES modules and browsers block module imports over `file://`.

## Tests

```bash
npm test          # or: node --test tests/calc.test.mjs
```

37 tests, no dependencies, Node 18 or later. They cover the paper's figures, division by zero, negative and empty inputs, and the rule that the diagnostic produces no score and no verdict on financial health.

A browser pass lives outside this repository: it loads all eight pages at 390px and 1280px, fails on any console error, on any `NaN`, `undefined` or `Infinity` reaching the screen, on sideways scrolling on a phone, and on any paper figure that does not appear.

## Structure

```
index.html, check.html, ...   one file per tool, each standalone
assets/calc.js                every formula, pure functions, no DOM
assets/ui.js                  page chrome, input binding, SVG charts, printing
assets/styles.css             the whole design, mobile first
paper/                        the conference paper, and the staged fee clause as .docx and .pdf
qr/                           QR assets for the keynote slide
assets/brand/                 the SLS mark and the full lockup, in dark and white
tests/                        verification against the paper
```

Calculations are kept entirely separate from the interface. `assets/calc.js` imports nothing and touches nothing outside itself, which is why it can be tested in Node.

The four calculators open with nothing entered and show a prompt instead of a result, so that no visitor mistakes the paper's teaching figures for a market rate. The example is one button away and `?demo=1` still loads it for a demonstration. The scorecard has always worked this way; the calculators now match it.

Every calculator prints as a report: the input panel is replaced by a record of the figures entered, under a heading and a date, with the calculation expanded. `setupReport()` in `assets/ui.js` builds it and keeps it in step with the form, and the same function supplies the plain-text version behind the Copy button.

The Word and PDF versions of the clause are generated, not hand-made. The script that builds them is kept outside this repository; the text is Appendix B of the paper, reproduced verbatim.

Charts are hand-written SVG in `assets/ui.js`. No charting library, so the site carries no third-party code, loads on a poor connection and prints cleanly.

The brand assets are generated from the two source logos: the background is thresholded away so both sit cleanly on dark and light, the lockup carries authorship in the footer, the hero and the head of anything printed, and the mark alone becomes the tab icon. Nothing on the site advertises services or carries contact details.

There are no webfonts, for the same reason. Headings use the system serif, interface text the system sans.

## Deploying

GitHub Pages, from the `main` branch, root folder. `.nojekyll` is present so that Pages serves the files as they are.

To publish from GitHub Desktop: Add > Add Existing Repository, choose this folder, Publish repository (leave "Keep this code private" unticked), then on github.com go to Settings > Pages and set Source to "Deploy from a branch", branch `main`, folder `/ (root)`. The site appears within a few minutes.

## The QR code

`qr/hub-qr.png` and `qr/hub-qr.svg` encode the live URL at error-correction level H, which tolerates a projector, a camera angle and a few metres of distance. Both decode correctly; this was verified rather than assumed.

`qr/hub-qr-for-dark-slide.png` is the same code on a white panel, for a dark slide. A light-on-dark inverted code is deliberately not supplied: it failed to decode in testing, and many phone scanners refuse inverted codes.

If the URL ever changes, regenerate the assets. Any QR generator will do; these were made with `segno` at `error='h'`.

## Changing it after the conference

Edit the HTML file for the page you want to change. Each page carries its own content and its own small script; there is no shared template to learn and no build to run.

To change a calculation, edit `assets/calc.js`, run `npm test`, and fix the engine rather than the expectation if a test fails.

To add a tool, copy the closest existing page, add a pure function to `assets/calc.js`, add tests for it, and add the page to the `PAGES` array at the top of `assets/ui.js` so it appears in the navigation.

## What it deliberately does not do

- No benchmarks. There are no verified Jamaican figures for these measures, and an imported foreign average would mislead.
- No score, and no verdict on whether a practice is financially sound.
- No view on whether a fee is fair and reasonable. That is Canon IV(f), judged on the actual matter.
- No treatment of client money as available cash, and no opinion on whether a transfer from the clients' account is lawful.
- No analytics, no tracking, no cookies, no storage that survives closing the tab.
- No request for a client name, account number, matter description, privileged document or banking credential.

See `ASSUMPTIONS.md` for the full list of modelling assumptions and legal references, and `STATUS.md` for what is built and what is not.
