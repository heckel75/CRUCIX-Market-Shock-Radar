# Session 16 executable market-audit protocol

Status: specified by Session 14. Execute this protocol in Session 16; do not modify production market or divergence logic while running it.

Purpose: measure the consequences of own-series transforms, channel dating/eligibility choices, raw versus empirical thresholds, market breadth, and timestamp-aware signal/market alignment using the existing sources and instruments.

## 1. Guardrails

- Sources remain FRED and Tiingo EOD.
- Tiingo price instruments use `adjClose`.
- The existing instrument/channel map remains the baseline under audit.
- Add no proxy, source, instrument, expected-direction rule, or causal interpretation.
- Leave `scripts/market-data.mjs`, `scripts/divergence.mjs`, `dashboard/public/*.json`, `docs/*.json`, and `log/YYYY-MM-DD.json` unchanged.
- The legacy global-common-date calculation and `max |z| >= 1.5` remain baseline comparators; they are not silently redefined.
- Do not choose percentile `alpha`, a v2 stale cutoff, minimum eligible count, maximum date gap, rolling window, or fallback in Session 14/16 output code. Measure candidates and send the decision to Session 17.
- Every historical calculation must be point-in-time with respect to observation date; no future observation or future channel statistic may enter a value at `t`.

## 2. Verified starting limitations

- `dashboard/public/market-readings.json` stores the latest transformed readings and metadata, not the complete raw FRED/Tiingo responses.
- Tracked close snapshots contain channel results and named drivers, not the raw historical source series.
- The current fetcher requests roughly 900 calendar days and currently uses a global intersection; the retained latest artifact reported 596 common dates at Session 14 preflight.
- Raw source snapshots/hashes were not historically archived. FRED values can be revised, and Tiingo adjusted history can change after corporate actions. A Session 16 download can support a frozen audit-time backtest, but cannot prove release-vintage bit identity for prior runs.
- Historical signal records often lack publication timestamps. Timing metrics must therefore use the Session 15 timestamp assessments and keep unknown/ambiguous cases out of definitive before/after denominators.

These limitations must appear in the Session 16 report.

## 3. Audit outputs

Create:

```text
audit/session16/input-manifest.json
audit/session16/raw-market-inputs/
audit/session16/instrument-observations.jsonl
audit/session16/instrument-transforms.jsonl
audit/session16/channel-date-eligibility.jsonl
audit/session16/channel-statistics.jsonl
audit/session16/threshold-results.jsonl
audit/session16/signal-market-timing.jsonl
audit/session16/tables/
audit/session16/metrics.json
audit/session16/market-audit-report.md
```

Keep credentials out of every artifact. Raw responses and normalized series are private audit inputs by default. The manifest records source URL templates without keys, request time, response hash, parser version/hash, series/symbol, value field, and row count.

## 4. Step A — establish the audit clock and input range

1. Record Git HEAD and working-tree status.
2. Set one `auditCutoffAt` in UTC before fetching. Store the corresponding local market calendar dates.
3. Use the existing series/symbol map:
   - FRED `DCOILBRENTEU`, `DCOILWTICO`, `VIXCLS`, `T10YIE`, `BAMLH0A0HYM2`, `DGS10`, `DTWEXBGS`;
   - Tiingo `GLD`, `ITA`, `EEM`, preferred `DBC` with existing `CPER` fallback, `KBE`, preferred `SOXX` with existing `SMH` fallback, `XLI`.
4. Resolve preferred/fallback instruments exactly as the current implementation does. Record the chosen symbol and why; the choice creates an `instrumentSetVersion`.
5. Request observations beginning no later than 900 calendar days before the fixed audit end, matching the current fetch horizon. Retain all returned valid observations through the cutoff.
6. Extend the request backward, without changing sources or instruments, if needed to obtain the transform warm-up and a usable post-warm-up evaluation history. Treat the final fetched range as an audit input choice, not a frozen v2 lookback.

Under the legacy five-observation transform and 252-transformed-observation z window, at least 258 valid raw observations are arithmetically required to produce one reading: five preceding valid observations plus 252 transformed observations including the current transform. More raw observations are required to measure a prior distribution of channel `M` values. Do not declare the percentile candidate viable merely because one z-score can be computed.

For every instrument report:

- requested start/end;
- actual first/last observation;
- valid count;
- missing/duplicate dates;
- source timezone/calendar metadata;
- whether at least 258 observations exist;
- number of post-warm-up evaluation dates;
- raw/normalized input hashes.

If an instrument lacks sufficient history, retain the failure as an eligibility result. Do not replace it with a proxy.

## 5. Step B — freeze and validate normalized source series

For each source response:

1. Save the immutable audit response or permitted normalized equivalent and SHA-256.
2. Parse dates and values using a versioned audit parser.
3. Reject nonfinite values and duplicate dates with conflicting values; record same-value duplicates.
4. Sort ascending by source observation date.
5. Record the source’s latest observation available in the frozen download.
6. Record value provenance (`FRED series ID` or `Tiingo symbol/adjClose`).
7. Produce a canonical normalized series and hash.

Point-in-time backtest rule: a calculation at evaluation date `t` may use only normalized observations whose observation date is at or before `t` and only earlier channel `M` values for threshold history. The audit must not use later dates to fill a missing observation at `t`.

Vintage caveat: because the frozen download may contain revised historical values, label results `audit-download-vintage`. No statement may claim these values equal what the API returned on the historical run date unless a matching raw response/hash exists.

## 6. Step C — reproduce the legacy baseline

Before evaluating v2 candidates:

1. Reproduce the current global all-instrument date intersection.
2. Use the exact legacy transform and z definition.
3. Build the named max-absolute-z driver for every channel.
4. Apply `abs(z) >= 1.5`.
5. On the latest audit date compatible with the frozen input, compare calculated fields with `dashboard/public/market-readings.json` where dates/input vintages overlap.

Differences caused by revised source history, later input dates, fallback-symbol choice, rounding, or absent archived inputs must be attributed, not “fixed” by tuning.

The legacy z definition to reproduce is:

- price transform: `x(i,t) = P(i,t) / P(i,t-5 valid observations) - 1`;
- level transform: `x(i,t) = L(i,t) - L(i,t-5 valid observations)`;
- the z window is the 252 transformed observations ending at `t`, including `x(i,t)`;
- mean uses those 252 values;
- standard deviation is the sample standard deviation with denominator `n - 1`;
- `z(i,t) = (x(i,t) - mean(i,t)) / sd(i,t)`.

This exact definition isolates the calendar change during own-series comparison. Session 16 may flag transform concerns, but it must not silently substitute another z formula.

## 7. Step D — compute own-series transforms

For each instrument independently:

1. Use its own sorted valid observation calendar.
2. For every index with five prior valid observations, calculate the price return or level change above.
3. For every index with 252 transformed values ending at the index, calculate the legacy-compatible z-score.
4. Persist:
   - `instrumentId` and `instrumentSetVersion`;
   - `windowStart`: actual date of the fifth prior valid observation;
   - `windowEnd` and `asOf`: current observation date;
   - raw/current and prior value;
   - transform value;
   - z-score and absolute z-score at full precision plus published-rounding candidate;
   - z-history start/end and `historyCount`;
   - calendar span of the five-observation move;
   - input/parser/configuration hashes.

Never label this “five calendar days.” It is five valid observations for that instrument.

At each evaluation timestamp, calculate:

- calendar age between evaluation date and `asOf`;
- business-day age under the declared audit calendar;
- freshness candidate and eligibility reason.

Keep age fields even when an instrument is excluded.

## 8. Step E — compare channel dating and eligibility rules

Evaluate the legacy global rule plus all three v2 candidates below on the same own-series readings.

### Rule 0 — legacy global intersection

- `marketAsOf`: latest date shared by every instrument on the entire board.
- All channel instruments are evaluated on that date.
- Purpose: baseline only.

### Rule 1 — strict channel common date

- For each channel, `marketAsOf` is the latest date shared by all mapped instruments in that channel.
- Every included instrument has `asOf == marketAsOf`.
- No mixed dates; mapped instrument count is fixed unless an instrument has insufficient history.

### Rule 2 — latest same-date eligible cohort

- At each evaluation point and candidate minimum count `k`, find the latest date on which at least `k` mapped instruments have valid own-series readings and meet the candidate freshness rule.
- `marketAsOf` is that shared date.
- Include only instruments observed on that date.
- Record excluded mapped instruments and reasons.
- No mixed dates.

### Rule 3 — bounded mixed-date cohort

- Anchor `marketAsOf` to the latest valid own-series reading among candidate-eligible mapped instruments.
- Include an instrument only when its `asOf` is no later than the anchor and its age/date gap meets the candidate bound `g`.
- Persist minimum and maximum included `asOf`, calendar gap, business-day gap, and per-instrument age.
- Require the candidate minimum count `k`.
- This is the only candidate that permits differently dated instruments in one statistic, and the mixture is always visible.

### Candidate grid without premature choice

For each channel with `N` mapped instruments:

- evaluate every feasible `k` from one through `N`;
- evaluate `g = 0` and every distinct positive within-channel business-day gap actually observed in the audit data;
- evaluate no stale exclusion as a diagnostic;
- evaluate the frozen legacy calendar-age statuses as a baseline only;
- evaluate every distinct observed business-day-age cutoff as a v2 sensitivity curve.

This exhaustive observed-value grid avoids inventing one unexplained date gap or minimum count. It does not make every candidate acceptable. Session 17 selects a rule based on coverage, age, base-rate stability, and inspectability.

For every channel/date/rule/grid point record:

- `marketAsOf`;
- mapped and eligible instrument counts;
- included instrument IDs and a stable `instrumentSetVersion`;
- excluded IDs/reasons;
- min/max instrument `asOf`;
- maximum calendar/business-day gap;
- driver and second driver;
- `M(c,t)`;
- breadth fields;
- whether the statistic mixed dates;
- whether the result exists or is `unassessed`.

## 9. Step F — changing eligible instrument sets

For each dating/eligibility candidate:

1. Assign `instrumentSetVersion` as the sorted included instrument IDs plus source/symbol map version.
2. Report transitions in set/version by channel.
3. Calculate market statistics under:
   - pooled prior `M` history regardless of set, labeled `pooled`;
   - same-set-only prior history, labeled `conditioned`;
   - same eligible-count prior history, labeled `count-conditioned`.
4. Report how often conditioned histories are unavailable and how much thresholds/base rates change.

Do not silently pool incomparable instrument sets. Session 17 decides whether and how histories bridge a set change.

## 10. Step G — market threshold audit

For every channel/date/eligibility candidate calculate:

```text
M(c,t) = max absolute z-score among eligible instruments in channel c at time t
```

The named primary driver is the instrument producing `M`. Resolve equal absolute z-scores using stable instrument ID lexical order and record the tie.

### Candidate A — legacy raw threshold

- market moving when `M(c,t) >= 1.5`;
- retain as the legacy baseline;
- measure empirical trigger rate by channel, dating rule, eligible count, and instrument-set version.

Also report the empirical distribution of `M`, because identical raw thresholds give channels with different instrument counts different crossing opportunities.

### Candidate B — empirical channel percentile

For time `t`:

1. Build history only from eligible `M(c,s)` values with `s < t`.
2. Calculate the empirical inverse-CDF/order-statistic threshold from that prior history.
3. Market is moving only when `M(c,t)` strictly exceeds the point-in-time threshold.
4. Apply one common candidate `alpha` across all channels in each comparison.

Do not select an `alpha` in Session 16. Produce the complete attainable-alpha trigger-rate curve from the empirical ranks supported by the prior sample. For each attainable rank report the implied `alpha`, channel thresholds, realized trigger rates, confidence intervals, and unavailable dates. Session 17 can then select or reject a common alpha without Session 16 optimizing for interesting output.

Compare:

- expanding prior history;
- every feasible rolling history length supported by the audit data;
- every feasible minimum-history requirement;
- same-set, eligible-count-conditioned, and pooled histories;
- fallback modes:
  - `unassessed-until-history`;
  - `legacy-raw-until-history`;
  - `no-binary-state-until-history`.

Summarize the full surface; do not choose a winner by visual appeal. Low-sample configurations must be clearly identified.

### Candidate C — raw rule plus measured base rates/breadth

Keep `M >= 1.5` but publish:

- measured trigger rate;
- primary and second driver;
- eligible count;
- number of included instruments whose `absZ` crosses 1.5;
- breadth ratio;
- instrument-set version and date gap.

This tests whether transparency is sufficient without a percentile binary rule.

### No-look-ahead assertions

Automated checks must prove for every row:

- all instrument observation dates are at or before its evaluation/anchor;
- every z input date is at or before instrument `asOf`;
- percentile history dates are strictly before `t`;
- rolling windows end at the immediately prior eligible `M`;
- future instrument-set membership does not change a historical set ID;
- fallback status depends only on history available by `t`.

## 11. Step H — market breadth

Persist for every channel/date/threshold candidate:

- largest absolute z-score;
- primary driver ID/name and signed z-score;
- second-largest absolute z-score and second driver;
- mapped instrument count;
- eligible instrument count;
- number above the candidate threshold;
- numeric breadth ratio: above-threshold count divided by eligible count when denominator is nonzero;
- a candidate categorical breadth indicator;
- all included instrument z-scores and dates.

For the percentile candidate, “above threshold” means instrument `absZ` strictly exceeds that date’s channel threshold. For the legacy candidate it means `absZ >= 1.5`.

Evaluate categorical breadth as a presentation candidate derived from the numeric count/ratio. Do not freeze boundaries in Session 16. Required comparisons:

- driver-only market moves;
- two-or-more-instrument moves;
- all-eligible-instrument moves;
- sensitivity when eligible count changes.

## 12. Step I — signal-versus-market timing

Use Session 15 event fields where available:

- `firstSeen`;
- `lastMaterialChangeAt`;
- timestamp precision/uncertainty;
- channel-specific direct mechanism;
- signal-elevation candidate result.

For every channel observation store:

- relevant event timestamp used and why;
- `marketAsOf`;
- relevant market-close timestamp and calendar;
- source observation availability timestamp/status where known;
- next eligible market observation;
- timing classification.

Classify:

- `signal-before-close`: signal/material change is at or before the relevant close;
- `signal-after-close-pending`: it is after the close and the next eligible observation does not yet exist;
- `market-move-preceding-signal`: a moving eligible close precedes first signal observation;
- `signal-followed-by-market-move`: a later eligible moving close follows the signal;
- `ambiguous-timing`: timestamp is date-only, missing, conflicting, or overlaps the close boundary.

When the next eligible observation arrives, pending can resolve to a four-state v2 classification for that observation. Never classify the signal against the preceding close.

Do not infer an exchange close time for a FRED observation merely from its date. If the relevant close/availability time cannot be documented, mark the timing assessment unknown/ambiguous. Report lag in distinct eligible market observations as well as elapsed time. Do not select a predictive horizon or use causal wording.

## 13. Required tables and statistics

Produce at least:

1. source/instrument inventory, raw date range, counts, hashes, and vintage limitations;
2. latest-date and missing-date distribution per instrument;
3. five-valid-observation calendar-span distribution per instrument;
4. own-series versus legacy-global z-score differences by instrument/date;
5. channel `marketAsOf`, age, gap, and coverage under every dating candidate;
6. exclusions and eligible instrument counts by channel;
7. instrument-set transition matrix;
8. `M(c,t)` distribution by channel and candidate rule;
9. legacy raw trigger count/rate with denominator and interval by channel;
10. attainable-alpha percentile trigger-rate curves by channel;
11. expanding versus rolling and history/minimum-sample sensitivity;
12. pooled versus same-set/count-conditioned threshold sensitivity;
13. fallback availability and state impact;
14. primary-driver frequency and second-driver distribution;
15. single-instrument versus multi-instrument/broad move frequency;
16. breadth ratio distribution and eligible-count sensitivity;
17. full channel/date disagreement table across threshold candidates;
18. signal-before-close, after-close/pending, market-before-signal, signal-followed-by-market, and ambiguous counts;
19. all rows that cannot be reproduced because historical raw inputs/vintages are absent;
20. configuration candidates recommended for Session 17, each with measured tradeoffs.

Every rate includes numerator, denominator, excluded/unassessed count, dating rule, eligibility rule, set conditioning, history mode, and threshold candidate.

## 14. Acceptance checks for the audit

- Re-running from the frozen audit input manifest produces bit-identical normalized series, transforms, and result tables, excluding only declared volatile envelope metadata.
- No calculation reads an observation or `M` value after its evaluation date.
- Own-series `windowStart`/`windowEnd` are actual dates.
- All freshness/eligibility exclusions carry reasons.
- Differently dated instruments appear together only under Rule 3 and expose the date gap.
- No threshold result hides changing eligible instrument sets.
- Empirical trigger rates are reported for every channel.
- No `alpha`, minimum sample, date gap, stale cutoff, minimum eligible count, breadth category, or fallback is called frozen.
- Signal timestamps after close remain pending.
- Unknown timestamps remain unknown/ambiguous.
- No source/proxy or production output changed.

## 15. Stop/report conditions

Stop the affected calculation and report when:

- credentials/source access cannot supply the existing instrument map;
- normalized input has conflicting duplicates or insufficient history;
- an instrument would require a new proxy/source;
- current download vintage cannot be distinguished from a historical claimed vintage;
- source/calendar metadata is insufficient for intraday timing;
- Session 15 signal timestamps are unavailable;
- implementing the audit appears to require modifying legacy production files.

An incomplete but reproducible table with explicit exclusions is preferable to a silently mixed-date or look-ahead result.
