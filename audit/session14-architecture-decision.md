# Session 14 — Methodology 2.0 architecture decision

Status: accepted as the Session 14 design baseline on 2026-08-11. This document freezes architecture and audit contracts only. It does not implement Methodology 2.0 or change the legacy pipeline.

Related artifacts:

- `audit/methodology-2-core-schema-draft.md`
- `audit/methodology-2-parameter-register.md`
- `audit/session14-signal-audit-protocol.md`
- `audit/session14-market-audit-protocol.md`
- `audit/session14-parallel-comparison-protocol.md`

## 1. Verified repository preflight

- Git HEAD at the start of Session 14: `72bba8e568cb46841632cbb779416ff74cc1777b`.
- `git status --short` was empty at the start of the session. The only Git diagnostic was the pre-existing warning that `C:\Users\heyke\.config\git\ignore` could not be read.
- The 2026-07-10 Methodology 2.0 architecture-review amendment is present in `CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md`.
- Legacy automation is present in `scripts/market-shock-radar.mjs`, `scripts/market-data.mjs`, `scripts/divergence.mjs`, `scripts/daily-snapshot.mjs`, `scripts/daily-run.mjs`, and `.github/workflows/daily-snapshot.yml`.
- The legacy implementation still uses a stateless candidate extractor, exact/canonical-text deduplication, the Phase 1 keyword score, the 60% signal threshold, global all-instrument date intersection, five-common-observation transforms, a trailing 252-common-observation z-score window, and `max |z| >= 1.5`.
- None of the following existed at preflight: `inputs/candidates/`, `state/events/`, `log/event-assignments/`, `methodology/`, `audit/`, an explicit Methodology 2.0 output namespace, a `methodologyVersion` field outside planning text, or empirical channel-percentile thresholds.
- No production file or historical snapshot needed to change to make the architecture feasible.

Available historical signal material is incomplete:

- `runs/latest.json` and `runs/memory/` exist locally but are ignored by Git. The local memory contains 27 distinct run timestamps spanning 2026-05-22 through 2026-06-23. These are reconstructed Crucix run payloads, not a v2 raw-candidate archive.
- Thirteen tracked close snapshots in `log/YYYY-MM-DD.json` span 2026-06-15 through 2026-07-27. They contain 42 top-signal occurrences representing 28 unique texts, but only selected winning signals, not the full candidate population.
- `log/runs/*.json` records run outcomes and freshness, not candidate text.
- `dashboard/public/market-shock.json` is overwritten and contains only the latest selected 15 items, although it reports the latest extraction candidate count.

Session 15 must preserve these fidelity distinctions and must not manufacture missing candidates, timestamps, URLs, origins, or historical assignments.

## 2. Decision boundary

Session 14 freezes the following architecture invariants:

1. v2 is stateful, versioned, and parallel to legacy.
2. The scored signal unit is an event episode with a stable `eventClusterId`, not a report.
3. A broader `parentSeriesId` groups related episodes but is never the scored unit.
4. Raw candidate observations, source-origin decisions, and accepted cluster assignments are persisted before deterministic scoring.
5. Historical assignments are append-only; registry state is recoverable from immutable inputs.
6. Event type, transmission mechanism, and market channel are separate layers.
7. Source independence is based on reporting origin, not outlet or domain count.
8. Severity, evidence confidence, and publication volume are separate.
9. Own-series market transforms replace global all-instrument alignment in v2 architecture, but the channel dating and eligibility rule remains an audit question.
10. A signal first observed after the applicable market close remains pending until the next eligible market observation.
11. All v2 payloads carry `methodologyVersion` and use a namespace that cannot overwrite legacy output.

Numeric signal thresholds, decay rates, similarity cutoffs, market eligibility limits, percentile `alpha`, percentile history, and the final v2 elevation and market-moving rules are not frozen here.

## 3. Persistence architecture

### 3.1 Provisional paths accepted

These paths are accepted as the Session 14 design target:

```text
inputs/candidates/<run-id>.jsonl
state/events/registry.json
log/event-assignments/<run-id>.jsonl

methodology/2.0.0/schema.json
methodology/2.0.0/parameters.json
methodology/2.0.0/leaf-channel-map.json
methodology/2.0.0/source-origin-rules.json
```

They are not created in Session 14 because their schemas and measured parameters are not frozen until Session 17.

`run-id` must be unique, sortable, and independent of market close date. It identifies one ingestion/assignment transaction. The exact ID encoding is frozen in Session 17; IDs must not be inferred from a volatile `generatedAt` value alone.

### 3.2 Commit order and atomic registry update

One v2 signal transaction uses this order:

1. Acquire an exclusive registry writer lock. The lock records the run ID, process identity, acquisition time, and prior registry version. Lock timeout and stale-lock recovery are parameters to freeze in Session 17.
2. Normalize candidates, give each observation a stable content-derived candidate identifier, write `inputs/candidates/<run-id>.jsonl` to a same-directory temporary file, flush it, validate every line, calculate its SHA-256 digest, and atomically rename it to its final name. An existing run file is never overwritten.
3. Read `state/events/registry.json` and validate its schema version, monotonic registry version, cluster-ID uniqueness, lineage references, last-applied run, and stored digest. Refuse to score if validation fails.
4. Produce source-origin and event-cluster decisions. Write the complete `log/event-assignments/<run-id>.jsonl` to a same-directory temporary file. Each record refers to a candidate ID and content hash and records the prior and intended registry versions. Flush, validate, hash, and atomically rename it. An existing assignment file is never appended to or replaced.
5. Apply that accepted assignment file to the in-memory registry. Write the next registry to a unique same-directory temporary file, flush and close it, read it back, validate it, and atomically replace `state/events/registry.json`. Preserve the immediately preceding valid registry as a recovery checkpoint.
6. Release the lock.
7. Only after steps 1–6 succeed may the deterministic scorer consume the committed candidate file, assignment file, registry version, and frozen methodology files.

The assignment log is committed before the registry. Therefore, interruption after step 4 leaves a replayable unapplied transaction; interruption before step 4 leaves no accepted assignment to score.

Atomic replacement must occur on the same filesystem. Implementations must use an atomic rename/replace primitive and file flush where supported; they must not truncate the live registry and rewrite it in place.

### 3.3 Recovery contract

On startup:

1. Remove no files automatically.
2. Validate the live registry. If it is valid, compare its `lastAppliedRunId` and registry version with complete assignment files.
3. If a complete assignment file is newer than the registry, replay files in their recorded sequence and verify each prior-version link and digest.
4. If the live registry is corrupt, quarantine it, load the latest valid checkpoint, and replay complete assignment files.
5. Ignore unrenamed temporary files for scoring, retain them for investigation, and report them as interrupted transactions.
6. If a digest, sequence, candidate reference, or lineage check fails, stop v2 processing. Never guess, silently skip a committed assignment, reuse an ID, or fall back to an empty registry.

Because the raw candidate files and assignment files are immutable, the registry is a recoverable materialized state, not the sole historical record.

### 3.4 Retention and growth

- Candidate observations that contributed to any retained v2 audit, parallel, or public payload remain retained for as long as that payload is supported. They are not automatically pruned.
- During Sessions 15–20, all newly collected v2 audit candidates are retained. Session 15 measures bytes per run, candidates per run, duplicate rate, and projected monthly/annual growth; Session 17 may then freeze tiering or external archival without weakening reproduction.
- Assignment history and lineage are retained indefinitely. Corrections append records; no history-rewriting compaction is permitted.
- Registry checkpoints may be compacted only when the immutable assignment history can rebuild the same registry and the retained checkpoint policy is versioned.
- Full raw responses that cannot legally or safely be retained must not be silently replaced by invented text. The candidate record must instead carry a content hash, permitted normalized content, acquisition metadata, and an explicit retention/redaction status. Any resulting limit on bit-identical reproduction is disclosed.

### 3.5 Private, public, and reviewable artifacts

Private operational artifacts, never copied to `dashboard/public/` or `docs/`:

- `inputs/candidates/<run-id>.jsonl`;
- `state/events/registry.json` and checkpoints;
- `log/event-assignments/<run-id>.jsonl`;
- full URLs, source payloads, reviewer identifiers, and licensed/restricted text where applicable.

Public/tracked methodology artifacts after Session 17:

- `methodology/2.0.0/schema.json`;
- `methodology/2.0.0/parameters.json`;
- `methodology/2.0.0/leaf-channel-map.json`;
- `methodology/2.0.0/source-origin-rules.json`.

Public v2 board artifacts contain event summaries, aggregate evidence status, channel mappings, market diagnostics, and artifact/configuration hashes, but not private raw text by default.

“Private” means access-controlled and excluded from the published static dashboard. It does not by itself decide whether an artifact is stored in Git, encrypted object storage, or CI artifacts. Session 15 must measure growth and identify licensing/privacy constraints; Session 17 freezes the storage backend. Reviewability is preserved through stable JSONL ordering, content hashes, run manifests, immutable decisions, and sanitized aggregate exports.

## 4. Event identity, lifecycle, and provenance

### 4.1 Identity hierarchy

- `eventClusterId` identifies one discrete event episode. It is opaque, stable, and never reused.
- `parentSeriesId` identifies a broader crisis, campaign, policy program, disruption series, or continuing stress episode. It is not scored or counted as an event cluster.
- Separate incidents within a long crisis get separate cluster IDs and may share one parent series.
- Repeated or corrected reports about the same incident remain observations of the same event cluster.

Cluster IDs contain no mutable semantics such as category, country, or date. Changes in labels do not require a new ID.

### 4.2 Observation clocks

- `firstSeen` is the first time Crucix observed an eligible candidate for the cluster. It is not asserted to be the real-world start time.
- `lastObservedAt` advances whenever another accepted observation of the episode is recorded.
- `lastMaterialChangeAt` advances only when accepted evidence changes action stage, observed consequence, material scope/severity, explicit mechanism, escalation, or de-escalation.
- Republishing, syndication, wording changes, or another outlet repeating the same origin advances `lastObservedAt` but not `lastMaterialChangeAt`.
- Decay keys from `lastMaterialChangeAt`. The decay function and stale intervals are measured in Session 15 and frozen in Session 17.

### 4.3 Lifecycle vocabulary

The core lifecycle values are:

- `new`: first observed eligible episode in the retained Crucix history;
- `escalating`: new accepted evidence shows a material increase or a later qualifying stage/consequence within the same episode;
- `continuing`: the episode is re-observed without a material change;
- `de-escalating`: accepted evidence shows a material reversal, cessation, relief, repair, rollback, or reduced consequence.

Silence is not evidence of de-escalation. Where prior coverage is incomplete, the lifecycle assessment uses the typed `unknown` or `unassessed` status rather than backfilling an invented transition.

### 4.4 Merge, split, alias, and correction rules

- A merge never rewrites old assignments. One cluster may declare `canonicalSuccessorId`, and the registry records aliases and a merge provenance record. Historical payloads continue to show the ID used at their run.
- A split creates new cluster IDs. Each child records `derivedFrom` and the split decision; earlier assignments stay on the original cluster unless a later correction record supersedes a specific assignment for future canonical views.
- Human correction appends a new provenance record with reviewer, reason, decision time, and `supersedesAssignmentId` or `supersedesProvenanceId`. The superseded record remains readable.
- An alias resolves current lookup but does not cause historical run material to be rewritten.
- A canonical successor can receive future observations; old IDs are never recycled.

## 5. Minimum Methodology 2.0 signal core

The core field contract is detailed in `audit/methodology-2-core-schema-draft.md`. The initial event-type leaves are deliberately small:

1. `armed-conflict-action`
2. `policy-restriction-action`
3. `energy-system-event`
4. `financial-distress-event`
5. `production-logistics-event`

They describe what happened. They do not themselves elevate a market channel. Cross-cutting enrichments and the complete proposed 16-leaf ontology remain Methodology 2.1 candidates.

Each core event carries:

- stable event and parent-series identity;
- event type and action stage;
- one or more separately evidenced transmission mechanisms, each with directness;
- reporting-source and reporting-origin identifiers;
- assessed independent-source count and corroboration state;
- the three event clocks;
- lifecycle state;
- assignment and provenance version;
- explicit `methodologyVersion`.

### 5.1 Typed assessment wrapper

Every field whose value might not have been attempted, might be unknowable, or might not apply uses:

```json
{
  "status": "assessed",
  "value": "example"
}
```

Allowed statuses are `assessed`, `unassessed`, `unknown`, and `not-applicable`. Only `assessed` may have a non-null value. `assessed` must have a value of the declared type, including zero or an empty array when those are the assessed result. The other statuses must have `value: null` and may carry a reason code.

Required wrappers in the v2 core:

- `parentSeriesId`;
- `eventType`;
- `actionStage`;
- `mechanisms`;
- `independentSourceCount`;
- `corroborationStatus`;
- `lifecycleState` when prior history is incomplete;
- source-origin identity for each observation when origin resolution can fail;
- occurrence/published time when it is distinct from observed time;
- any scope, actor, location, affected-asset, expected-direction, or directional-consistency enrichment.

Invariant identifiers, `methodologyVersion`, `firstSeen`, `lastObservedAt`, assignment references, hashes, and provenance records are not wrappers: a canonical record is invalid if they are absent.

## 6. Clustering reproducibility

Deterministic clustering is the preferred production method if Session 15 shows adequate identity and lifecycle behavior. Model or embedding assistance may propose a cluster but cannot be called during canonical reproduction.

Every assignment records:

- clustering method: deterministic, embedding-assisted, model-assisted, or human;
- ruleset identifier and content hash;
- model/embedding provider, identifier, immutable version or snapshot, when used;
- prompt template version/hash, decoding/configuration settings, and tool version, when used;
- similarity value and threshold version, when applicable;
- actor, location, target, and time matching results and window versions;
- deterministic tie-break result;
- candidate raw and normalized content hashes;
- candidate, assignment, registry, and methodology versions;
- proposed and accepted cluster ID;
- acceptance time and acceptor type;
- reviewer and human-override provenance where applicable.

If multiple eligible clusters are tied, the default decision order is: exact normalized incident-key match, then smallest event-time distance, then earliest cluster `firstSeen`, then lexicographically smallest `eventClusterId`. If required incident fields are unknown and the choice is substantively ambiguous, the system records an unresolved proposal for human adjudication rather than silently applying the final lexical tie-break. Similarity formulas, matching windows, and the threshold are measured in Session 15 and frozen in Session 17.

Accepted model-assisted assignments must be committed to `log/event-assignments/<run-id>.jsonl` before scoring. Production replay reads that file and never reruns the model.

### 6.1 Reproducibility equation

```text
normalized raw candidates
+ persisted source-origin assignments
+ persisted event-cluster assignments
+ frozen methodology configuration
= reproducible canonical Methodology 2.0 board payload
```

The canonical comparison includes all semantic results, stable IDs, event clocks derived from the inputs, channel rows, market input hashes, market `asOf` values, thresholds used, stable ordering, and specified rounding.

Excluded volatile envelope fields may include `generatedAt`, fetch duration, process/host ID, temporary path, retry count, request ID, and log formatting. `asOf`, `firstSeen`, `lastObservedAt`, `lastMaterialChangeAt`, source observations, and accepted provenance are not volatile exclusions.

Every public v2 manifest lists the exact candidate, assignment, registry, market-input, schema, parameter, map, and source-rule digests used.

## 7. Source origin and evidence independence

The unit of independent evidence is an originating assertion or observation:

- Syndicated copies of one wire story share one `sourceOriginId` and count once.
- Multiple outlets quoting the same official statement share the official statement as origin and count once, even when their headlines differ.
- An official statement and a genuinely independent direct observation may count as two origins. “Independent” means the observation is not derived from the statement or the same upstream report.
- Unknown provenance is conservative. Near-identical unknown copies form one unresolved origin family; multiple domains do not establish independence.
- Conflicting independent origins remain separately recorded, but conflict sets `corroborationStatus` to `conflicting` and does not mechanically raise confidence.
- Repeated publication from the same origin can update observation time but never severity or independent-source count.
- A correction remains the same origin and links to the corrected assertion. It does not add corroboration.
- A retraction is appended, invalidates the affected assertion prospectively, and can lower confidence or create de-escalation evidence. It never erases the earlier record.

Severity derives from action, implementation, consequence, and material change. Confidence derives from origin independence, evidence quality, consistency, and correction state. Publication count is separately reportable and controls neither.

## 8. Event → mechanism → channel map

Event type is descriptive. A channel is eligible only through a separately recorded mechanism assessment and evidence references.

| Market channel | Qualifying mechanism ID | Typical compatible event types | What direct evidence must establish |
|---|---|---|---|
| Conflict escalation | `security-risk-repricing` | `armed-conflict-action`; sometimes another type occurring in an armed confrontation | The episode materially changes conflict exposure, force use, or immediate security risk relevant to the named market instruments. |
| Sanctions / policy | `trade-asset-access-restriction` | `policy-restriction-action` | An announced/implemented rule or observed consequence changes access to trade, technology, assets, capital, or cross-border transactions. |
| Energy disruption | `energy-supply-disruption` | any leaf, commonly `energy-system-event`, `armed-conflict-action`, or `policy-restriction-action` | An event-specific path changes production, processing, transport, inventory availability, or legally accessible energy supply. |
| Credit stress | `funding-credit-transmission` | `financial-distress-event`; sometimes `policy-restriction-action` | Event-specific evidence shows impaired funding, repayment, solvency, liquidity, spreads, or credit availability. |
| Supply chain | `production-transport-bottleneck` | `production-logistics-event`; sometimes another leaf | Event-specific evidence shows constrained production, critical inputs, freight, port/chokepoint throughput, or delivery capacity. |

`direct`, `contextual`, and `none` are recorded per mechanism. Keyword/category proximity is not mechanism evidence. One event may have zero channels. It may enter multiple channels only through distinct mechanism records with separate evidence. The same cluster contributes at most once to a given channel/run; repeated reports add evidence, not severity.

The mapping is a Session 14 audit vocabulary and architecture default. Session 15 tests its coverage and Session 17 freezes the production map.

## 9. Signal elevation and aggregation

The legacy 60% keyword-score threshold remains legacy only. Session 15 evaluates this v2 audit candidate:

```text
explicit transmission mechanism
AND sufficient evidence/corroboration
AND qualifying action stage or observed consequence
AND new event, material escalation, or material de-escalation
```

Session 15 must compare the structural gate with a scalar event score and a documented combination; Session 17 chooses. Session 14 does not define “sufficient,” assign action-stage weights, set a scalar cutoff, or select a decay function.

Aggregation invariants:

- count one event cluster once per channel/run;
- publication repetition affects corroboration diagnostics only;
- expose the leading qualifying event and the number of qualifying clusters;
- expose signal breadth without category quotas;
- permit zero-channel signal-only events;
- require a separate evidenced mechanism for each channel of a multi-channel event.

## 10. Market architecture

The audited baseline remains FRED, Tiingo EOD `adjClose`, price returns, level changes, and a named max-absolute-z driver. No source, instrument, proxy, production transform, or legacy threshold changes in Session 14.

V2 retains per instrument:

- actual `windowStart` and `windowEnd` for the five-valid-observation transform;
- `asOf`;
- calendar age and business-day age measured at the recorded evaluation timestamp;
- freshness and eligibility status with reason;
- raw z-score and absolute z-score;
- history count and input hash.

V2 computes transforms on each instrument’s own valid observation calendar. Session 16 compares, without prematurely choosing:

1. strict per-channel common-date evaluation;
2. latest same-date eligible cohort meeting a candidate quorum;
3. a bounded mixed-date cohort anchored to a declared `marketAsOf` and exposing min/max dates and date gap.

For each candidate it measures stale exclusion, every feasible minimum eligible count, observed within-channel date gaps, changing instrument sets, breadth denominators, and whether mixed dates materially change results. Session 17 freezes the rule.

The market channel record includes largest absolute z-score and named primary driver, second-largest absolute z-score, eligible instrument count, number above the evaluated threshold, and numeric/categorical breadth diagnostics.

### 10.1 Threshold candidates

Legacy `max |z| >= 1.5` remains a baseline diagnostic. Session 16 evaluates:

1. the legacy raw rule;
2. a channel-specific point-in-time empirical percentile using one common but not-yet-selected `alpha`;
3. a raw threshold with empirical base rates and breadth displayed.

For the percentile candidate:

```text
M(c,t) = max absolute z-score among eligible instruments in channel c at time t

market moving when M(c,t) exceeds the point-in-time
(1 - alpha) empirical quantile of channel c's prior M distribution
```

Every threshold at `t` uses only `M` values strictly earlier than `t`. Session 16 measures rolling versus expanding history, feasible history length, minimum sample, fallback behavior, eligible-set versioning, stale handling, and regime sensitivity. No `alpha` or final market-moving rule is frozen in Session 14.

## 11. Signal/market timing

Each comparison stores the signal timestamp with precision/uncertainty, the relevant market close timestamp and calendar, the market observation’s source availability where known, and the next eligible close.

- Signal timestamp at or before the relevant close: `signal-before-close`.
- Signal timestamp after the close with no next eligible observation yet: `signal-after-close-pending`; divergence state is `pending`.
- A moving market close strictly before first signal observation: `market-move-preceding-signal`.
- A later eligible moving close after the signal: `signal-followed-by-market-move`.
- Missing, date-only, conflicting, or overlapping timestamp ranges: `ambiguous-timing`.

Generated timestamps are not substitutes for missing publication/observation timestamps. FRED observation dates do not establish intraday availability. No timing label asserts causation.

## 12. V2 states and namespace

Provisional v2 state names map to legacy as follows:

| Legacy | Methodology 2.0 | Boolean meaning |
|---|---|---|
| `radar-claim` | `signal-leading` | signal elevated, market not moving |
| `priced` | `co-movement` | signal elevated, market moving |
| `radar-miss` | `market-only` | signal not elevated, market moving |
| `calm` | `calm` | neither elevated |

`pending` and `unassessed` are v2 comparison statuses outside the four-cell matrix. Legacy snapshots and labels remain unchanged.

The provisional parallel namespace is:

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

Every file contains `methodologyVersion: "2.0.0"` and configuration hashes. The version directory is an architecture default for the first parallel implementation; Session 17 confirms the release version. No v2 process may write `dashboard/public/divergence.json` or `log/YYYY-MM-DD.json`.

## 13. Explicitly deferred

Session 15 measures signal clustering adequacy, thresholds/windows, source-origin edge cases, taxonomy coverage, action-stage and corroboration distributions, decay/lifecycle behavior, elevation alternatives, and candidate storage growth.

Session 16 measures market dating, freshness, eligibility, minimum instrument count, date gap, threshold base rates, percentile configurations, breadth behavior, instrument-set changes, raw-input persistence needs, and timing availability.

Session 17 freezes the exact schema files, production version, ID encoding, deterministic clustering rules, numeric parameters, signal gate/score, market threshold, comparison-period acceptance criteria, storage backend, migration contract, and acceptance tests.

Methodology 2.1 retains richer ontology, full entity/geographic/scope extraction, source-quality weights, direction models, and additional channels unless evidence makes one structurally necessary for 2.0.
