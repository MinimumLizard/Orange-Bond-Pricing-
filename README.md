# Orange Bond pricing: an illustrative model

This interactive page estimates the coupon on Alliance Finance Company PLC's planned 3-year Orange Bond (up to LKR 1bn; board approval 27 Oct 2026). It works from AFC's last two issues:

- the guaranteed **Green Bond** (Feb 2025);
- the unsecured **Social Bond** (Aug 2025).

Every input is sourced, dated, quoted and given a verification status. All the maths is in one file of pure functions, and it is tested.

**Live page:** https://minimumlizard.github.io/Orange-Bond-Pricing-/

Prepared by Nathan Savundranayagam. Independent illustration using public information. It is not affiliated with, prepared for publication by, or endorsed by Alliance Finance Company PLC. It is not a price quote, an offer, or investment advice. The arranger and AFC set actual terms.

## Run it locally

There is no build step and there are no dependencies. Chart.js 4.4.1 is the only external file, loaded from jsDelivr with an exact pinned version and an SRI hash. Without it, the page still works and shows a table in place of the first chart.

- Open `index.html` in a browser, **or**
- serve the folder:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

Run the tests (Node 18 or later, no packages):

```bash
node --test tests/model.test.mjs
```

After editing `data/inputs.json`, regenerate its browser copy (a test fails if they differ):

```bash
node tools/sync-inputs.mjs
```

## Files

| Path | What it is |
|---|---|
| `index.html`, `styles.css` | The page: light and dark themes, works at 375 px, no horizontal scroll |
| `src/model.js` | All the maths, as pure functions with JSDoc |
| `src/format.js` | Number formatting: `12.84%`, `+1.50 pts`, `LKR 9.5m`, `LKR 1.0bn` |
| `src/app.js` | Rendering, sliders, charts, URL state |
| `data/inputs.json` | **The source of truth.** For every input: value, unit, description, source URL, name and date, verbatim quote, status, notes, and your original figure (`user_value`) |
| `data/inputs.js` | A generated copy of `inputs.json`, so that the page also works from `file://` |
| `tests/model.test.mjs` | `node:test` suite (16 tests) |
| `tools/sync-inputs.mjs` | Regenerates `data/inputs.js` |

## Method (summary)

The full text is in the Methodology section of the page.

1. Put every coupon on the **semi-annual basis** used for Sri Lankan Treasury bond yields:
   - `annualToSemi(r) = 2(√(1+r) − 1)`;
   - `semiToAnnual(r) = (1 + r/2)² − 1`.
2. **Historical spread** = coupon (semi-annual basis) − tenor-matched government yield at pricing.
   - Green 3y (vs 15.02.28): **+0.67**
   - Social 4y (vs 15.10.29): **+1.50**
   - Social 5y (vs 01.07.30): **+1.59**
3. **Unsecured spread** = average of the two Social spreads = **+1.54**; its range runs from 1.50 to 1.59. **Guaranteed spread** = the Green spread = **+0.67**.
4. **Guarantee effect** = unsecured − guaranteed = **0.87 pts**. This is an estimate from two issues priced on different dates, at different tenors and in different conditions.
5. **Orange coupon** (semi-annual basis), with g = government yield now = **11.30%** (15.12.29 mid, 3 Nov 2026):
   - No enhancement = g + unsecured + tenor adjustment.
   - Full guarantee = g + guaranteed.
   - Partial = g + (unsecured + adj) − share × guarantee effect.
   - The annual-pay equivalent of each comes from `semiToAnnual`.
6. **Economics**, with size S and tenor T = 3:
   - Interest = S × coupon.
   - Gross saving a year = S × (unenhanced − guaranteed coupon).
   - Covered amount = S × coverage factor.
   - Breakeven fee = gross saving a year ÷ covered amount.
   - Net saving = (gross − fee × covered) × T, **undiscounted**.

### Base-case outputs (verified inputs)

| Structure | Semi-annual basis | Range | Annual-pay equivalent | Interest on LKR 1.0bn |
|---|---|---|---|---|
| No enhancement | **12.84%** | 12.80% – 12.88% | 13.25% (13.20% – 13.30%) | LKR 128.4m a year |
| Partial DFI guarantee (50%) | **12.40%** | 12.38% – 12.42% | 12.79% | LKR 124.0m a year |
| Full bank guarantee | **11.97%** | – | 12.32% | LKR 119.7m a year |

Guarantee economics:

- **Gross saving:** LKR 8.7m a year, or LKR 26.2m over 3 years.
- **Covered amount:** LKR 1.1bn.
- **Breakeven fee:** 0.79% a year.
- **Net saving at the 0.50% placeholder fee:** LKR 9.7m over 3 years.
- **Rule of thumb:** 0.25 pts on LKR 1bn = LKR 2.5m a year.

### Changes from the brief, and why

The method reproduces the brief's expected results exactly from your original figures. The test `brief: original figures reproduce every expected result in the brief` checks this: Green +0.60, Social +1.50 / +1.59, coupons 12.55–12.64% / 12.12% / 11.65%, saving LKR 9.4m a year and LKR 28.3m over 3 years, breakeven 0.86%. Verification moved four inputs:

| Input | Brief | Verified | Effect |
|---|---|---|---|
| Gov. yield at Green pricing | 10.15% (15.02.28, 7 Feb 2025) | **10.08%** (15.02.28, Wealth Trust 17 Feb 2025) | Green spread +0.60 → **+0.67** |
| Gov. yield at Social pricing, 4y | 9.36% "15.09.29" | **9.355%** (15.10.29, midpoint of 9.36–9.35%) | Social 4y spread unchanged at +1.50. Maturity label corrected. |
| Gov. yield at Social pricing, 5y | ~9.50% "2030" (approximate) | **9.505%** (01.07.30, midpoint of 9.51–9.50%), now *verified* | Spread unchanged at +1.59 |
| Gov. yield now (3y) | 11.05% (15.09.29 auction 11.00%, 13 Oct 2026) | **11.295%** (15.12.29 mid of 11.25/11.34, Wealth Trust 3 Nov 2026) | All Orange coupons +0.245 pts |

Net effect on the outputs:

- **Coupons:** the unenhanced coupon moves from about 12.59% to 12.84%, and the guaranteed coupon from 11.65% to 11.97%.
- **Guarantee effect:** narrows from 0.94 to 0.87, because the Green spread is 0.07 wider.
- **Guarantee saving:** LKR 9.4m → 8.7m a year.
- **Breakeven fee:** 0.86% → 0.79%.

The tests assert these new values, and the brief's values in a separate test.

## Decisions I made without asking

1. **Repository and publishing.** This session runs in a sandbox that cannot run `gh repo create` or call the GitHub Pages API: the `gh` token is invalid, and the proxy blocks `/pages`. The repository already existed as `MinimumLizard/Orange-Bond-Pricing-` (the trailing hyphen serves as the suffix) and was empty. So I:
   - committed on the session's working branch `claude/amazing-turing-xhej13`;
   - pushed the same commit to `main`, as the brief asks Pages to serve from main;
   - pushed a `gh-pages` branch to trigger GitHub's automatic Pages set-up.

   GitHub enabled Pages automatically, serving **`gh-pages` / root**. All three branches hold the same commit. **To serve from `main` / root, as the brief intended:** Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)` → Save. The URL does not change. The repository's default branch also became `claude/amazing-turing-xhej13`, because that was pushed first. To switch it to `main`: Settings → General → Default branch.
2. **Reference date for government yields** = the date the coupon was fixed, where it is public. Otherwise, the opening date.
   - Social: prospectus dated **7 Aug 2025**, so I used the Daily FT / Wealth Trust report of 5 Aug 2025.
   - Green: I could not find the prospectus date, so I used the opening date, **17 Feb 2025**, and the Wealth Trust report of that date.
   - Alternatives: using the Green report of 7 Feb gives +0.60; using the Social opening date (21 Aug) gives a 4y spread of +1.46.
3. **Ranges become midpoints.** Where a source quotes a range (9.36%–9.35%), I use the midpoint. For today's yield I use the midpoint of the closing offer and bid.
4. **The 3-year match for "now" is 15.12.29,** not 15.09.29. If the bond issues around Dec 2026 after regulatory clearance, a 3-year bond matures around Dec 2029. Using 15.09.29 (mid 11.175%) would lower every Orange coupon by 0.12 pts. The slider covers it.
5. **Tenor adjustment applies only to the unsecured spread.** The guaranteed spread already comes from a 3-year bond. A partial guarantee carries the adjustment in proportion to (1 − share).
6. **Guarantee fee default = 0.50% a year.** You did not give one, and no public source discloses Seylan's fee on the Green Bond. It is marked **unverified / assumption** on the page and must be replaced with a real quote. The breakeven fee does not depend on it.
7. **Coverage factor 1.10** (your default) is marked *approximate*: it is supported by the Green Bond's actual cover of LKR 1.107bn on LKR 1bn.
8. **Partial-guarantee economics** are not shown separately. In this linear model the saving and the covered amount both scale with the share, so the breakeven fee is the same. The page says so.
9. **Interest a year** = S × the semi-annual-basis coupon, which is the total of the two semi-annual payments.
10. **Reference-only inputs** are listed but not used in the calculation:
    - the 13 Oct 2026 auction (11.00%);
    - the 15.10.30 range in mid-October;
    - the 29 Oct 2026 auction (15.05.30 at 11.44%).
11. **Chart colours:** government yield grey, Green green, Social blue, Orange #D9661C. I validated them for colour-vision deficiency and contrast in both themes. Every series also has a text label (legend, row labels, values), so colour is never the only signal. Net saving is shown with ▲/▼ and words as well as green/red.
12. **No AFC logo or brand styling.** The page uses a neutral research-note design.
13. **The `data/inputs.js` mirror** lets "open index.html" work from disk. Browsers block `fetch()` of local JSON on `file://`. A test keeps the mirror identical to `inputs.json`.
14. **Ada Derana link.** The Ada Derana Biz English link returned 403/404 from this environment, so I verified the Social Bond investor list against the Daily FT, 17 Sep 2025.

## Verification log

I opened every source on 4 Nov 2026. Status counts: **26 verified, 1 approximate, 3 unverified**. The 1 approximate and 3 unverified items are all model assumptions, not market data.

| Input | Your value | Verified value | Status | Source |
|---|---|---|---|---|
| Green Bond coupon | 10.75% semi-annual | 10.75% p.a., paid semi-annually (AER 11.03%) | verified | [LRA Green Bond rating report](https://www.alliancefinance.lk/wp-content/uploads/2025/06/Green-Bond-Rating-Report.pdf); Daily FT 19 Feb 2025; AFC AR 2025/26 note 38.2 |
| Green Bond tenor / size | 3y | 3 years, LKR 1bn, matures 20 Feb 2028 | verified | LRA report |
| Guarantee | Seylan Bank | Seylan Bank (A+): principal + two interest payments, max LKR 1.107bn | verified | LRA report |
| Green rating at issue | A- | A- (Stable), preliminary, 20 Nov 2024 | verified | LRA report, rating history |
| Green rating final | A+ | A+ (Stable), upgrade 6 Jun 2025; maintained 30 Jan 2026 | verified | LRA report; [LRA ratings](https://lra.com.lk/ratings/) |
| AFC entity rating at Green issue | (to find) | **BBB- (lka), LRA**; upgraded to BBB on 3 May 2025 | verified | [AFC Annual Report 2024/25](https://cdn.cse.lk/cmt/upload_report_file/341_1749177212157.pdf) |
| Green opening date | Feb 2025 | 17 Feb 2025 (closed same day) | verified | Daily Mirror 1 Mar 2025; Daily FT 19 Feb 2025 |
| Gov. yield at Green pricing | ~10.15% (15.02.28) | **10.08%** (15.02.28) | verified (changed) | [Wealth Trust 17 Feb 2025](https://wealthtrust.lk/wp-content/uploads/2025/02/Daily-report-for-the-17th-February-2025.pdf) |
| Social Bond size / security | LKR 2bn, unsecured | LKR 2.0bn, unsecured, senior | verified | [Daily FT 1 Sep 2025](https://www.ft.lk/financial-services/AFC-announces-allotment-for-Rs-2-b-Social-Bonds-proposes-fresh-Rs-1-b-High-Yield-Bonds/42-781040) |
| Social rating | BBB | BBB (LRA), issue and entity | verified | [Social Bond prospectus](https://alliancefinance-2024.sgp1.digitaloceanspaces.com/2.%20Prospectus_Alliance%20Finance%20Company%20PLC_Social%20Bond%20Issue%202025_compressed.pdf); AR 2025/26 |
| Social 4y coupon | 11.15% annual | 11.15% p.a., paid annually | verified | Prospectus; Daily FT |
| Social 5y coupon | 11.40% annual | 11.40% p.a., paid annually | verified | Prospectus; Daily FT |
| Applications | 64 | 64 (≈ LKR 2.47bn) | verified | Daily FT 1 Sep 2025 |
| Key investors | BOC, DFCC, NSB, HDFC, Nations Trust | Same | verified | [Daily FT 17 Sep 2025](https://www.ft.lk/financial-services/Alliance-Finance-launches-Sri-Lanka-s-first-Social-Bond/42-781801) (the Ada Derana link was unreachable) |
| Social dates | Aug 2025 | Prospectus 7 Aug; opened and closed 21 Aug; listed 28 Aug 2025 | verified | Prospectus; Daily FT |
| Gov. yield at Social pricing, 4y | 9.36% (15.09.29) | 9.355% (**15.10.29**, 9.36–9.35%) | verified (maturity corrected) | [Daily FT 5 Aug 2025](https://www.ft.lk/financial-services/Yields-steady-activity-zooms-in-on-short-end-of-curve/42-779910) |
| Gov. yield at Social pricing, 5y | ~9.50% (2030), approximate | 9.505% (01.07.30, 9.51–9.50%) | **verified** (upgraded) | Daily FT 5 Aug 2025 |
| Gov. yield now (3y) | 11.05% base | **11.295%** (15.12.29: 11.25% offer / 11.34% bid) | verified (newer data) | [Wealth Trust 3 Nov 2026](https://wealthtrust.lk/wp-content/uploads/2026/11/Daily-report-for-the-03rd-November-2026.pdf) |
| 15.09.29 auction 13 Oct 2026 | 11.00% | 11.00% weighted average | verified (reference) | [Daily FT 19 Oct 2026](https://www.ft.lk/financial-services/Secondary-Bond-market-yields-increase/42-798823) |
| 15.10.30 traded | 11.38–11.50% | 11.38% → 11.5% intraweek | verified (reference) | Daily FT 19 Oct 2026 |
| 15.05.30 auction 29 Oct 2026 | – | 11.44% weighted average | verified (reference) | Wealth Trust 3 Nov 2026 summary |
| Orange Bond size / tenor / date | ≤ LKR 1bn, 3y, 27 Oct 2026 | Same; **unsecured**, rated, listed; pricing "announced later" | verified | [Daily FT 29 Oct 2026](https://www.ft.lk/front-page/AFC-to-raise-Rs-1-b-via-Sri-Lanka-s-first-Orange-Bond/44-799339) |
| AFC entity rating now | (to find) | **BBB (Stable), LRA, maintained 5 Aug 2026** | verified | [LRA ratings](https://lra.com.lk/ratings/) |
| Coverage factor | 1.10 | 1.10 (Green precedent 1.1075) | approximate (assumption) | LRA report |
| Partial guarantee share | 0.5 | 0.5 | unverified (assumption) | – |
| Tenor adjustment | 0.00 | 0.00 | unverified (assumption) | – |
| Guarantee fee | – | 0.50% placeholder | unverified (assumption) | – |

Each quote is reproduced verbatim in `data/inputs.json` and behind "Show quote" on the page.

Two sources disagree on the date of AFC's rating upgrade:

- The AR 2024/25 says the upgrade to BBB came on 3 May 2025.
- The AR 2025/26 says the rating was published on 5 May 2025.
- The Social Bond prospectus cites a rating action commentary dated "2nd April 2024".

All three agree that AFC was BBB by Aug 2025, and the AR 2024/25 shows BBB- for 2024. Neither date changes the model.

### Page verification

I verified the page with Playwright and Chromium at 1280 px and 390 px. The checks:

- HTTP 200, no console errors;
- both charts render: 6 bars on the canvas, and the SVG has drawn;
- no horizontal scroll;
- moving a slider updates the cards, the chart and the URL;
- a shared link reproduces the scenario;
- "Reset to base case" restores the exact base values;
- the dark theme renders;
- the quote toggles work.

I ran the same checks against the live URL after publishing (see the log below).

#### Live verification log (4 Nov 2026, https://minimumlizard.github.io/Orange-Bond-Pricing-/)

```text
PASS  [desktop] HTTP status  — 200
PASS  [desktop] no console errors
PASS  [desktop] Chart.js loaded and build chart has 6 bars  — bars=6
PASS  [desktop] build chart canvas painted  — painted samples=8098
PASS  [desktop] guarantee chart rendered  — paths=4
PASS  [desktop] no horizontal scroll  — 1280 vs 1280
PASS  [desktop] data table rows  — rows=30, unverified badges=3
      base cards: 12.84%, 12.40%, 11.97%; econ: LKR 8.7m, LKR 26.2m, 0.79%, LKR 9.7m; as of 3 November 2026
PASS  [desktop] slider updates cards  — 12.84% / 12.40% / 11.97% -> 13.09% / 12.66% / 12.22%
PASS  [desktop] slider updates chart  — orange gov=11.55
PASS  [desktop] URL stores state  — ?g=11.55
PASS  [desktop] unsecured slider moves Orange spread  — spread=2
PASS  [desktop] link reproduces scenario  — 13.55% / 12.89% / 12.22%
PASS  [desktop] reset restores base values  — 12.84% / 12.40% / 11.97%
PASS  [desktop] quote toggle opens
PASS  [desktop] no console errors after interaction
PASS  [mobile] HTTP status  — 200
PASS  [mobile] no console errors
PASS  [mobile] Chart.js loaded and build chart has 6 bars  — bars=6
PASS  [mobile] build chart canvas painted  — painted samples=1796
PASS  [mobile] guarantee chart rendered  — paths=4
PASS  [mobile] no horizontal scroll  — 390 vs 390
PASS  [mobile] data table rows  — rows=30, unverified badges=3
      base cards: 12.84%, 12.40%, 11.97%; econ: LKR 8.7m, LKR 26.2m, 0.79%, LKR 9.7m; as of 3 November 2026
PASS  [mobile] slider updates cards  — 12.84% / 12.40% / 11.97% -> 13.09% / 12.66% / 12.22%
PASS  [mobile] slider updates chart  — orange gov=11.55
PASS  [mobile] URL stores state  — ?g=11.55
PASS  [mobile] unsecured slider moves Orange spread  — spread=2
PASS  [mobile] link reproduces scenario  — 13.55% / 12.89% / 12.22%
PASS  [mobile] reset restores base values  — 12.84% / 12.40% / 11.97%
PASS  [mobile] quote toggle opens
PASS  [mobile] no console errors after interaction

ALL CHECKS PASSED
```
