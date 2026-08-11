# Session 15 executable signal-audit protocol

Status: specified by Session 14. Execute this protocol in Session 15; do not implement production Methodology 2.0 while running it.

Purpose: collect defensible evidence about candidate duplication, reporting origins, event clustering, lifecycle, the minimal event/mechanism vocabulary, and signal-elevation alternatives. The audit must preserve missingness and selection bias rather than reconstructing an imaginary historical feed.

## 1. Guardrails

- Do not modify `scripts/market-shock-radar.mjs`, legacy thresholds, sources, dashboard output, historical snapshots, or daily automation.
- Do not fabricate missing historical raw candidates from explanations, headlines remembered by a reviewer, current web search, or later reporting.
- Do not turn `generatedAt`, close date, or file modification time into a missing publication/event timestamp.
- Do not treat a tracked top signal as proof that no other candidate existed.
- Do not treat a domain, outlet, or repost count as independent evidence.
- Do not let an LLM’s unpersisted answer become an accepted assignment.
- Keep all raw/private audit data outside `dashboard/public/` and `docs/`.
- Record every exclusion, unresolved value, correction, and adjudication.

## 2. Verified starting inventory

As of Session 14:

| Material | Availability | Fidelity and permitted use |
|---|---|---|
| `inputs/candidates/<run-id>.jsonl` | Absent | No historical v2 raw-candidate archive exists. |
| `runs/memory/cold/*.json` and `runs/memory/hot.json` | Present locally, ignored by Git | 27 distinct run timestamps from 2026-05-22 through 2026-06-23. Treat each run’s retained `data` as a reconstructable legacy input payload, not as a v2 candidate archive. |
| `runs/latest.json` | Present locally, ignored by Git | One current retained source response/run payload; deduplicate against memory by timestamp and content hash. |
| `dashboard/public/market-shock.json` | Tracked but overwritten | Latest selected output only: at preflight 15 items and a reported candidate count. Not historical raw input. |
| `log/YYYY-MM-DD.json` | 13 tracked close snapshots from 2026-06-15 through 2026-07-27 | 42 selected top-signal occurrences, 28 unique text strings. Selection-biased supplement only. |
| `log/runs/*.json` | Tracked | Run/freshness metadata; no candidate text. Useful only to prove a run occurred. |

Session 15 must rerun this inventory because local ignored files can disappear and new files may have accumulated.

## 3. Audit outputs

Create a Session 15 work area whose raw text is not published:

```text
audit/session15/inventory.json
audit/session15/input-manifest.json
audit/session15/candidate-observations.jsonl
audit/session15/manual-audit-set.jsonl
audit/session15/source-origin-ledger.jsonl
audit/session15/event-cluster-ledger.jsonl
audit/session15/assignment-ledger.jsonl
audit/session15/adjudication-notes.md
audit/session15/metrics.json
audit/session15/signal-audit-report.md
```

Before committing any Session 15 raw-text artifact, review repository visibility, source terms, and privacy. If raw text cannot be committed, keep it in access-controlled storage and commit only the manifest, hashes, aggregate metrics, sanitized examples, and report. Do not weaken or misstate the limitation.

Every output includes:

- audit protocol version/hash;
- creation timestamp;
- input-manifest hash;
- reviewer/automation provenance;
- selection stratum;
- field-level assessment statuses where applicable.

## 4. Step A — inventory and freeze inputs

1. Record Git HEAD and `git status --short`.
2. Enumerate:
   - existing `inputs/candidates/*.jsonl`, if any;
   - `runs/latest.json`;
   - `runs/memory/hot.json`;
   - `runs/memory/cold/*.json`;
   - `dashboard/public/market-shock.json`;
   - `log/YYYY-MM-DD.json`;
   - `log/runs/*.json`.
3. For every file, record absolute repository-relative path, byte count, SHA-256, modification time as filesystem metadata, parse status, and observed internal run/generated timestamps.
4. Classify each file:
   - `A-canonical-candidate-archive`: immutable raw-candidate JSONL;
   - `B-reconstructable-run-input`: retained full/reduced run payload from which the legacy candidate extractor can be run;
   - `C-selected-output-only`: top/selected signal with no complete candidate set;
   - `D-metadata-only`: run manifest or other evidence with no candidate content;
   - `E-unusable`: corrupt or insufficiently attributable material.
5. Deduplicate run payloads by the pair of internal run timestamp and canonical payload hash. If timestamps match but hashes differ, retain both and flag a conflict.
6. Freeze `input-manifest.json` before labeling. Later files are a separate prospective stratum and do not silently enter the historical sample.

If the 27 local memory runs observed in Session 14 are missing, say so. Do not rebuild them from tracked top signals.

## 5. Step B — extract and normalize candidate observations

### 5.1 Source records

For fidelity A, copy/reference the canonical observation records without semantic alteration.

For fidelity B, use an audit-only extractor that reproduces the legacy traversal and useful-text collection from the frozen source file. Do not change the production script. Record:

- input file and run timestamp;
- legacy object path;
- all source-provided IDs;
- reporting source/channel;
- raw permitted text;
- source-provided publication/event timestamp;
- audit extraction timestamp;
- raw and normalized SHA-256;
- whether the legacy keyword classifier matched it;
- whether it entered the legacy top-15 result after dashboard filters;
- legacy category, score, confidence, and path when applicable.

For fidelity C, create a record with `sampleRole: "selected-output-supplement"` and explicitly mark unavailable raw-candidate context as `unassessed`. It cannot enter a full-run candidate denominator.

Fidelity D produces inventory records only.

### 5.2 Audit normalization

Use this conservative normalization for audit comparison:

1. preserve the permitted raw string and its hash;
2. Unicode-normalize to NFKC;
3. normalize line endings;
4. trim and collapse whitespace;
5. retain punctuation, numbers, negation, named entities, and source attribution;
6. create a lowercase comparison copy only for exact/canonical duplicate detection;
7. do not translate, summarize, complete truncated text, remove attribution phrases, or repair missing facts.

Record both the legacy canonical-text key and the conservative audit normalized hash. Do not propagate a manual label across records unless their conservative normalized hashes match exactly. Near duplicates require an explicit clustering decision.

### 5.3 Stable audit IDs

Generate:

- candidate observation ID from run ID, source path/record ID, and raw content hash;
- normalized content ID from normalized content hash;
- reporting-source ID from the actual feed/channel/outlet;
- no source-origin ID until Step D.

ID generation code/hash must be recorded in the audit manifest.

## 6. Step C — deterministic sample selection

The census contains every extracted observation and supports automated counts and exact-duplicate rates. Manual labeling uses this predeclared selection rule:

1. Include every candidate that entered the legacy top-15 result for every fidelity A/B run.
2. Include every tracked top-signal occurrence from fidelity C that is not already represented by the same normalized hash and observation time. Keep duplicated occurrences for frequency/lifecycle measurement.
3. Add an unmatched control from each fidelity A/B run and each nonempty legacy source-priority band (`High`, `Medium`, `Low`): choose the record with the lexicographically smallest normalized SHA-256. This tests event/mechanism material that keywords did not elevate without discretionary picking.
4. When an included normalized content ID occurs in other inventoried runs, include all its occurrences so recurrence and publication duplication can be measured.
5. Sort the resulting manual audit set by `observedAt`, then normalized hash, then observation ID.

This is a selection rule, not a category quota. Report separate denominators for:

- full extracted census;
- legacy-selected A/B observations;
- unmatched controls;
- selected-output supplements;
- unique normalized contents;
- source-origin assertions;
- event clusters.

If fewer than 200 candidate observations remain in the manual set, collect prospective complete runs without changing sources until the set reaches 200 observations across at least five distinct UTC dates, or until Session 15’s declared collection window ends. Label prospective records separately. The numbers are audit-coverage targets, not Methodology 2.0 parameters.

If the audit set is too large to label faithfully in Session 15, finish deterministic batches in order and report coverage. Do not silently sample a convenient subset or claim unreviewed records were clustered.

## 7. Step D — normalize reporting origin

For each unique candidate assertion:

1. Identify `reportingSourceId`: the outlet, feed, Telegram channel, official feed, or collector from which Crucix obtained it.
2. Identify explicit attribution in the retained text/metadata: wire, named outlet, official, eyewitness/firsthand source, document, dataset, or unknown.
3. Assign `sourceOriginId` only when the origin is supported. Otherwise use an assessment wrapper with `unknown`.
4. Assign `originType` and `derivation` from the core schema vocabulary.
5. Group syndicated/near-verbatim copies by common wire/byline/attribution and content evidence. Record the grouping evidence.
6. Group outlets quoting the same official statement under the statement origin. Outlet commentary based on that statement is not another independent observation.
7. Treat an official assertion and genuinely independent direct observation as separate origins only when the direct observation is not derived from the official assertion.
8. Conservatively group near-identical unknown-provenance copies into one unresolved origin family. Multiple domains alone never establish independence.
9. Link corrected reports to the original origin; do not increment independent-source count.
10. Append retractions/disputes, retain prior records, and set correction state.
11. When origins conflict, preserve both, label `conflicting`, and write an adjudication note. Do not treat conflict as higher confidence.

Required origin-ledger fields:

- candidate IDs;
- reporting source;
- source-origin assessment;
- origin type and derivation;
- syndication family;
- independence group;
- correction/retraction state;
- evidence and reasoning;
- reviewer and review time;
- uncertainty/status.

After grouping, calculate `independentSourceCount` as distinct accepted independence groups, not distinct outlets.

## 8. Step E — manual event clustering

### 8.1 Unit of identity

An event cluster is one discrete episode. Compare:

- actors;
- action;
- target/object;
- location;
- event/occurrence time or interval;
- policy/order/instrument identifier where applicable;
- observed consequence;
- whether the report is a correction/update of the same incident.

Same cluster:

- exact or near-duplicate reporting of the same incident;
- later confirmation/correction of the same incident;
- a stage/consequence update that remains part of the same discrete episode.

New cluster with the same parent series:

- a separate strike, outage, policy instrument, default, closure, reopening, or other discrete episode;
- a new target/location/time episode even within the same campaign;
- a later action whose market mechanism must be assessed independently.

Never use one immortal war/crisis cluster. Never fragment wording variations of one incident into separate clusters.

### 8.2 Assignment order

Process observations chronologically:

1. Check exact normalized content matches.
2. Check source-provided incident IDs/URLs.
3. Compare the event identity tuple above with existing clusters.
4. If one cluster clearly matches, propose it.
5. If several match, apply the Session 14 tie-break: exact incident-key match; smallest event-time distance; earliest cluster `firstSeen`; lexicographically smallest cluster ID.
6. If required fields are unknown and the result remains substantively ambiguous, mark `needs-adjudication`. Do not use the lexical tie-break to conceal uncertainty.
7. Persist the proposal, reason, and all matching evidence.
8. A second pass accepts or corrects every `needs-adjudication` proposal and every proposed merge/split.

Session 15 is manual evidence collection. Use opaque audit IDs. Do not claim the audit IDs are production IDs or edit historical legacy payloads.

### 8.3 Parent-series assignment

Assign a parent series only when multiple discrete episodes share a documented broader crisis, campaign, policy program, disruption series, or continuing stress episode. A parent series:

- has a stable audit ID and readable label;
- may contain many clusters;
- contributes no severity or channel count;
- is `not-applicable` for a standalone episode;
- is `unknown` when a relationship is suspected but unsupported.

Record why episodes share a parent. Country/category overlap alone is insufficient.

### 8.4 Merge, split, and correction during audit

Never edit an accepted assignment line. Append:

- `supersedesAssignmentId` for a correction;
- alias/canonical-successor provenance for a merge;
- new child IDs and `derivedFrom` provenance for a split.

Recalculate current audit views from the append-only ledger and retain pre-correction metrics for an audit trail.

## 9. Step F — label event fields

### 9.1 Event type

Choose one of:

- `armed-conflict-action`
- `policy-restriction-action`
- `energy-system-event`
- `financial-distress-event`
- `production-logistics-event`

Use the primary nature of the episode, not the desired market channel. If none fits, mark `unknown` and propose a vocabulary change in adjudication notes. Do not invent an audit-only leaf.

### 9.2 Action stage

Label the furthest directly evidenced stage:

- `rhetoric`: statement/posture without operational commitment;
- `threatened`: explicit conditional or intended action;
- `announced`: authoritative decision/order, implementation not evidenced;
- `implemented`: action begun, executed, or in force;
- `impact-observed`: material consequence observed and supported.

Record evidence IDs. Do not infer implementation from rhetoric or announcement. Keep severity separate from confidence; do not assign weights in Session 15 unless evaluating an explicitly labeled candidate mapping.

### 9.3 Mechanism and directness

Assess each of the five mechanisms independently:

- `security-risk-repricing`
- `trade-asset-access-restriction`
- `energy-supply-disruption`
- `funding-credit-transmission`
- `production-transport-bottleneck`

For each:

- `direct`: retained evidence states or demonstrates the episode-specific transmission path;
- `contextual`: plausible background relationship, no episode-specific path;
- `none`: no supporting path.

Store evidence IDs and a one-sentence non-causal explanation. Keywords and event-type proximity are insufficient. Multiple direct mechanisms require separate evidence records.

### 9.4 Corroboration and confidence evidence

Label:

- `single-origin`
- `corroborated-independent`
- `conflicting`
- `unknown-origin`
- `retracted-only`

Record independent-origin count separately. For candidate confidence mappings, tabulate origin type, independent count, correction state, conflict, and evidence directness; do not turn outlet count into confidence and do not let confidence determine severity.

### 9.5 Lifecycle

Within the retained chronological evidence:

- first eligible observation: `new`;
- accepted material increase/stage/consequence: `escalating`;
- re-observation without material change: `continuing`;
- explicit reversal/cessation/repair/relief: `de-escalating`.

Set:

- `firstSeen` from the earliest retained eligible observation;
- `lastObservedAt` from every accepted recurrence;
- `lastMaterialChangeAt` only from a documented material transition.

If earlier coverage is incomplete or observation order cannot be established, use `unknown`. Silence never creates `de-escalating`. Record whether repeated reports would have incorrectly refreshed decay under a last-observed clock.

### 9.6 Assessment status

Use wrappers for parent series, event type, action stage, mechanisms, independent-source count, corroboration, lifecycle when history is insufficient, occurrence/published time, and all optional scope/entity fields.

Do not collapse:

- not attempted → `unassessed`;
- attempted but unresolved → `unknown`;
- irrelevant → `not-applicable`;
- resolved typed value → `assessed`.

## 10. Step G — evaluate signal-elevation alternatives

Evaluate on the same labeled cluster/run records:

### Candidate A — structural gate

```text
explicit transmission mechanism
AND sufficient evidence/corroboration
AND qualifying action stage or observed consequence
AND new event, material escalation, or material de-escalation
```

Do not choose “sufficient,” “qualifying,” or a directness rule silently. Enumerate observed candidate definitions in a sensitivity table and show which clusters change.

### Candidate B — scalar event score

If evaluated, list every component, weight, cap, missingness rule, and cutoff as an audit candidate. Do not reuse the legacy 60% threshold. Report whether different component choices change ranking/elevation.

### Candidate C — documented combination

Test a structural minimum gate followed by a scalar ranking only if the data supports it. Ranking must not let repeated publication add severity.

For every candidate rule:

- count a cluster once per channel/run;
- require a separate direct mechanism per channel;
- permit zero-channel events;
- expose leading qualifying cluster and qualifying cluster count;
- report repeated reports as corroboration/publication diagnostics only;
- use no category quotas.

Session 15 recommends candidates; Session 17 freezes the rule.

## 11. Required measurements

Calculate overall and by run/date/source stratum:

1. extracted candidate observations;
2. unique conservative normalized contents;
3. exact/legacy-canonical duplicates;
4. event-eligible and non-event/control records;
5. unique event clusters;
6. candidate-observation → event-cluster compression ratio;
7. unique-content → event-cluster compression ratio;
8. reporting-source count versus source-origin count;
9. top-origin share and reporting-origin concentration (HHI with origin shares squared);
10. syndicated, official-statement-derived, unknown-origin, corrected, retracted, and conflicting shares;
11. parent-series cluster/event distribution;
12. event-type distribution and unknown rate;
13. action-stage distribution and assessment-status distribution;
14. mechanism distribution and direct/contextual/none share per channel;
15. zero-, one-, and multi-channel mechanism counts;
16. independent-source-count distribution;
17. single-origin/corroborated/conflicting/unknown/retracted-only distribution;
18. new/escalating/continuing/de-escalating/unknown lifecycle distribution;
19. repeated observations that update `lastObservedAt` but not `lastMaterialChangeAt`;
20. elevation frequency by channel under every candidate rule;
21. clusters whose result differs between structural, scalar, and combined candidates;
22. legacy selected observations that collapse into duplicate/contextual clusters;
23. unmatched controls that carry direct mechanisms;
24. cluster assignment ambiguity, corrections, merge/split proposals, and adjudication rate;
25. cluster identity stability for normalized content recurring across runs;
26. bytes per run, candidates per run, and projected storage growth using observed distributions.

Every percentage names its numerator, denominator, exclusions, and assessment-status handling. Fidelity C material is reported separately and never enters full-candidate compression denominators.

## 12. Adjudication

`adjudication-notes.md` must record:

- record/cluster IDs;
- competing labels/assignments;
- evidence for each;
- missing evidence;
- decision and rationale;
- reviewer(s);
- whether the decision suggests a parameter, schema, or vocabulary change;
- whether it is required for 2.0 or can wait for 2.1.

Do not resolve systematic ambiguity by adding an unrecorded rule. Proposed rule changes go to the parameter register for Session 17.

## 13. Completion checks

Session 15 is complete only when:

- the input manifest and selection logic can reproduce the audit set;
- all labeled records carry source fidelity and assessment statuses;
- raw candidates are not fabricated;
- exact duplicates and semantic clusters remain distinguishable;
- reporting source and reporting origin remain distinguishable;
- accepted assignments are persisted before metrics;
- event episode and parent series remain separate;
- cluster corrections are append-only;
- lifecycle clocks are derived from retained evidence;
- all required measurements include denominators and limitations;
- the report recommends evidence-backed items for Session 17 without freezing them prematurely.

## 14. Stop/report conditions

Stop and report rather than invent when:

- all fidelity A/B historical material is absent or corrupt;
- source text cannot be retained or reviewed under its terms;
- candidate times are too incomplete for lifecycle/timing claims;
- reporting origin cannot be resolved at a rate that makes independence metrics meaningful;
- manual coverage is insufficient to compare the map/elevation candidates;
- an apparent need to change production code arises.

The audit can still complete with explicit limitations and a prospective-collection recommendation. It must not claim a representative historical raw-candidate audit when only selected legacy outputs were available.
