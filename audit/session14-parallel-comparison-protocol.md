# Methodology 2.0 parallel-comparison protocol

Status: Session 14 architecture baseline. Session 17 freezes acceptance tests and the comparison-period length; Sessions 18–19 implement parallel outputs; Session 20 applies this protocol to cut over or reject.

The purpose is to compare auditability, identity, lifecycle, measured base rates, breadth, timing, and disagreement cases. Row-level agreement with legacy is not a success criterion.

## 1. Isolation and immutable inputs

Legacy continues to write:

```text
dashboard/public/divergence.json
log/YYYY-MM-DD.json
```

V2 writes only:

```text
dashboard/public/v2/2.0.0/signal.json
dashboard/public/v2/2.0.0/market.json
dashboard/public/v2/2.0.0/divergence.json
dashboard/public/v2/2.0.0/comparison.json
dashboard/public/v2/2.0.0/methodology.json

log/v2/2.0.0/runs/<run-id>/signal.json
log/v2/2.0.0/runs/<run-id>/market.json
log/v2/2.0.0/runs/<run-id>/divergence.json
log/v2/2.0.0/runs/<run-id>/comparison.json
log/v2/2.0.0/runs/<run-id>/manifest.json
log/v2/2.0.0/closes/<YYYY-MM-DD>.json
```

Each v2 run manifest references:

- `methodologyVersion`;
- source/input manifest and hashes;
- raw candidate file/hash;
- source-origin and cluster-assignment file/hash;
- registry version/hash;
- market input/hash;
- schema, parameters, leaf-channel map, and source-origin rules hashes;
- canonical output hashes;
- declared volatile metadata exclusions.

The v2 latest files are replaceable views. `log/v2/2.0.0/runs/<run-id>/` is immutable. Close summaries may be written once or append a clearly identified correction; they are never silently rewritten.

## 2. Comparison unit and join rules

Store three distinct keys:

- `runId`: ingestion/calculation transaction;
- `signalObservedAt` or `lastMaterialChangeAt`: timestamp relevant to the signal decision;
- `marketObservationId`: channel, `marketAsOf`, dating-rule version, eligible instrument-set version, and source-input hash.

Legacy and v2 rows join for descriptive comparison only when:

1. channel IDs map through the documented five-channel map;
2. both refer to the same recorded execution/run window;
3. their market close/as-of dates are explicitly retained;
4. any date difference is shown rather than coerced.

When legacy is globally dated and v2 is channel-dated, retain both dates and `asOfGap`. Do not relabel them as same-close observations.

The comparison period is counted in distinct eligible v2 market closes per channel. Session 17 freezes the required count and coverage rules. Calendar-day duration alone cannot satisfy it.

## 3. Collection cadence

For every parallel run:

1. Complete the unchanged legacy run.
2. Freeze the raw candidate and market input manifests.
3. Commit accepted source-origin and cluster assignments.
4. Produce deterministic v2 signal and market payloads.
5. Apply timestamp eligibility; leave after-close signals pending.
6. Produce v2 divergence and comparison records.
7. Reproduce the canonical v2 payload from the committed inputs and compare hashes.
8. Append run-level metrics; update public sanitized aggregates.

If a v2 step fails, preserve the legacy result and create a v2 failure manifest with stage, error, and input hashes. Do not substitute legacy rows into v2.

## 4. Signal compression and source metrics

For each run and for the cumulative period collect:

### Candidate/headline → event-cluster compression

- raw candidate observation count;
- unique conservative normalized-content count;
- event-eligible candidate count;
- accepted event-cluster count;
- exact/canonical duplicate count;
- same-origin repeat count;
- candidate-observation-to-cluster ratio;
- unique-content-to-cluster ratio.

Formula:

```text
compression ratio = eligible candidate observation count / unique event cluster count
```

If cluster count is zero, report numerator and `not-applicable` ratio. Selected-output-only legacy material never enters a claimed raw-candidate denominator.

### Reporting-origin concentration

For candidate assertions and clusters report:

- reporting-source distribution;
- accepted source-origin distribution;
- top-origin share;
- HHI: sum of squared origin shares;
- syndicated-copy share;
- official-statement-derived share;
- unknown-origin share;
- corrected/retracted/conflicting share.

Use origin assignments, not outlet/domain counts.

### Parent and leaf distribution

- clusters per `parentSeriesId`;
- standalone clusters;
- parent-series share and largest-parent share;
- event-type count/share;
- event-type unknown/unassessed rate;
- proposed out-of-vocabulary cases.

Parent series never replace cluster counts.

### Mechanism directness

By mechanism and target channel:

- direct/contextual/none counts and shares;
- zero-channel, one-channel, and multi-channel clusters;
- multi-channel clusters with separate evidence for every channel;
- mappings rejected for keyword/category proximity only.

The denominator is mechanism assessments, with unassessed/unknown reported separately.

### Origin/corroboration

- single-origin;
- corroborated-independent;
- conflicting;
- unknown-origin;
- retracted-only;
- distribution of assessed `independentSourceCount`.

Severity and confidence distributions are reported separately. Publication count is never a severity input.

### Lifecycle

- new/escalating/continuing/de-escalating/unknown counts;
- repeat observations updating only `lastObservedAt`;
- material transitions updating `lastMaterialChangeAt`;
- stale/decay status under the frozen Session 17 rule;
- explicit de-escalation cases;
- invalid or ambiguous transitions.

## 5. Signal elevation metrics

For each channel/run:

- signal assessment status;
- elevated boolean when assessed;
- leading qualifying `eventClusterId`;
- qualifying cluster count;
- total direct mechanism count;
- event types and parent series represented;
- single-origin versus corroborated composition;
- new/escalating/de-escalating contribution;
- clusters suppressed by evidence/directness/stage/lifecycle gates;
- zero-channel signal-only cluster count.

Report:

- signal channel-elevation frequency by channel and overall;
- number of channels elevated per run;
- elevation due to one cluster versus multiple clusters;
- multi-channel contribution from one cluster with separately evidenced mechanisms;
- no-category-quota distribution.

## 6. Market metrics

For each channel and each distinct eligible market close:

- `marketAsOf` and relevant close timestamp/status;
- included instrument-set version;
- eligible/mapped instrument count;
- date gap and mixed-date flag;
- largest absolute z-score and named driver;
- second-largest absolute z-score;
- threshold rule/value/history count used;
- number above threshold;
- breadth ratio/indicator;
- market-moving status or unassessed.

Report:

- market-moving frequency by channel;
- empirical threshold/base rate by channel;
- driver-frequency distribution;
- single-instrument versus multi-instrument/broad move shares;
- eligibility failure and changing-set rates;
- mixed-date usage and date-gap distribution;
- percentile fallback/unassessed rate, if applicable.

## 7. Full state-distribution matrix

For assessed and timing-eligible rows, tabulate:

| Signal | Market | V2 state |
|---|---|---|
| elevated | quiet | `signal-leading` |
| elevated | moving | `co-movement` |
| quiet | moving | `market-only` |
| quiet | quiet | `calm` |

Keep these outside the four-cell denominator:

- `pending` after-close rows;
- signal unassessed;
- market unassessed/ineligible;
- ambiguous timing.

Required cuts:

- channel;
- distinct eligible market close;
- instrument-set version;
- signal lifecycle;
- corroboration status;
- driver breadth;
- before/after-close timing.

Show counts and rates with exact denominators. Do not merge pending into `signal-leading` or `calm`.

## 8. Legacy/v2 disagreement records

Create one inspectable record per joined row with:

- legacy and v2 run/close keys;
- both signal values and decision rules;
- both market values, dates, drivers, and decision rules;
- legacy state and mapped v2 state;
- disagreement dimensions;
- relevant candidates, clusters, origins, mechanisms, lifecycle, and eligible instruments;
- timestamp class;
- human-readable mechanical explanation;
- input/configuration hashes.

Disagreement dimensions:

- `signal-only-disagreement`;
- `market-only-disagreement`;
- `both-sides-disagree`;
- `date-eligibility-disagreement`;
- `pending-vs-legacy-classified`;
- `unassessed-vs-legacy-classified`;
- `state-name-only`.

Mandatory case queues:

1. legacy elevation caused by exact/near duplicate reporting;
2. legacy elevation caused only by contextual mechanism proximity;
3. v2 elevation absent in legacy;
4. one underlying v2 cluster counted through multiple legacy items;
5. single-origin versus independently corroborated changes;
6. raw-threshold versus empirical-threshold changes;
7. global-date versus channel-date changes;
8. stale-instrument exclusion changes;
9. single-driver versus broad market move cases;
10. market move preceding the signal;
11. after-close/pending signal;
12. ambiguous timestamp;
13. zero-channel signal-only event;
14. separately evidenced multi-channel event.

Do not score v2 success by agreement percentage. Agreement is descriptive.

## 9. Timing sequences

For every elevated or materially changed signal:

- identify the last eligible market close at or before the signal;
- determine whether the signal was before or after that close;
- identify the next eligible market observation;
- list later market-moving observations in distinct eligible-close units;
- identify the nearest prior market-moving observation;
- retain timestamp uncertainty.

Classify:

- `signal-before-close`;
- `signal-after-close-pending`;
- `market-move-preceding-signal`;
- `signal-followed-by-market-move`;
- `ambiguous-timing`.

Report counts and lags; do not say “caused,” “priced in,” “predicted,” or equivalent.

## 10. Cluster identity stability

Because accepted historical assignments are immutable, two different stability questions are reported:

### Historical assignment integrity

- candidate ID/content hash assigned to more than one active historical cluster without a superseding correction;
- missing assignment targets;
- changed assignment file/hash;
- reused event ID.

The acceptable count for silent mutation or ID reuse is zero.

### Ongoing clustering consistency

For newly observed candidates referring to an existing episode:

- attached to expected existing cluster;
- created unnecessary new cluster;
- ambiguous/adjudicated;
- merge/split/canonical-successor action;
- model proposal versus accepted assignment.

Report recurrence attachment rate and case list. Session 17 sets any acceptance threshold after Session 15 evidence.

## 11. Lifecycle stability

Across consecutive observations of a cluster report:

- state transition matrix;
- material-change evidence for each transition;
- changes caused only by repeated publication;
- transitions revised by correction/retraction;
- long-running parent series with appropriately separate event episodes;
- episode fragmentation or mega-cluster cases;
- decay clock based on `lastMaterialChangeAt` versus counterfactual `lastObservedAt`.

Any lifecycle change without evidence/provenance is a failure case. The target distribution itself is not predetermined.

## 12. Reproducibility test

For every successful v2 run:

1. Start from the committed normalized candidate file, source-origin/cluster assignments, registry checkpoint plus assignment history, frozen market input, and exact methodology artifacts.
2. Disable network/model calls.
3. Rebuild signal, market, divergence, and comparison canonical payloads.
4. Remove only declared volatile envelope fields.
5. Canonicalize ordering and rounding under the frozen schema.
6. Compare SHA-256 with the original canonical hashes.

Allowed volatile exclusions:

- `generatedAt`;
- fetch/process duration;
- host/process ID;
- retry/request ID;
- temporary path and log text.

Not excluded:

- input/assignment/config hashes;
- source observations and market `asOf`;
- `firstSeen`, `lastObservedAt`, `lastMaterialChangeAt`;
- cluster/parent IDs;
- lifecycle;
- mechanisms/directness;
- signal/market decisions;
- driver, breadth, and state.

Any unexplained nonvolatile mismatch blocks cutover.

## 13. Period summaries required for Session 20

Produce:

1. run and distinct-eligible-close coverage table;
2. missing/failed/unassessed/pending table;
3. all signal compression/origin/leaf/mechanism/corroboration/lifecycle metrics;
4. signal elevation frequency by channel;
5. market-moving/base-rate frequency by channel;
6. complete v2 state matrix;
7. legacy/v2 mapped state matrix;
8. disagreement dimension counts and case index;
9. duplicate/contextual legacy elevations;
10. single-instrument versus broad market moves;
11. market-before-signal and signal-followed-by-market cases;
12. after-close/pending and ambiguous cases;
13. cluster identity/integrity report;
14. lifecycle transition/stability report;
15. reproducibility pass/fail table;
16. methodology/configuration changes during the period;
17. measured repository/storage growth;
18. unresolved blocker and adjudication register.

If a methodology parameter changes, start a new versioned comparison stratum. Do not pool before/after runs as one fixed-methodology period.

## 14. Acceptance principles

Session 20 may recommend cutover only when:

- every published v2 result is traceable to persisted inputs, assignments, registry state, and frozen configuration;
- offline canonical reproduction passes;
- cluster IDs are not reused and historical assignments are not silently changed;
- lifecycle transitions have evidence and distinguish observation from material change;
- source independence follows origin rules;
- channel elevation requires separately evidenced mechanisms;
- signal and market base rates are measured and inspectable;
- breadth and eligibility are visible;
- after-close cases remain pending;
- disagreement cases have been reviewed under declared categories;
- no hidden parameter or model call determines canonical output;
- legacy output/history remained unchanged during parallel operation.

There is deliberately no target legacy agreement rate, no desired distribution of interesting states, and no category quota.

Session 17 must freeze before parallel collection:

- minimum distinct eligible closes and per-channel coverage;
- maximum tolerated failed/unassessed runs;
- required adjudication coverage;
- any quantitative cluster/lifecycle stability thresholds;
- reproducibility test fixtures;
- cutover/rejection decision owners.

## 15. Rejection or extension conditions

Reject cutover or extend the parallel period when:

- canonical reproduction fails;
- accepted assignments depend on rerunning a live drifting model;
- cluster identity churn or mega-cluster/fragmentation cases remain unexplained;
- origin provenance is too weak to support corroboration claims;
- lifecycle changes are driven by repeated publication;
- market trigger rates are unstable or rely on insufficient/look-ahead history;
- mixed-date or stale-instrument behavior is not inspectable;
- timing data forces many after-close signals into prior closes;
- a material methodology parameter changed without a version boundary;
- the comparison lacks the Session 17-required distinct eligible closes.

Rejection preserves legacy and the parallel audit artifacts. It does not authorize rewriting historical snapshots.
