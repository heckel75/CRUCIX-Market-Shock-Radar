# Methodology 2.0 core schema draft

Status: Session 14 design draft. It defines the minimum operational contract that Sessions 15–17 must test and freeze. It is not `methodology/2.0.0/schema.json` and is not production code.

## 1. Schema principles

1. Every canonical v2 artifact has `methodologyVersion`.
2. IDs and provenance are required; descriptive assessments may be explicitly unassessed, unknown, or not applicable.
3. An event episode, a parent series, a report, a reporting origin, a transmission mechanism, and a market channel are different entities.
4. Historical candidate observations and assignments are immutable.
5. Event clocks distinguish observation from material change.
6. Severity and confidence are independent dimensions.
7. An event type never elevates a channel without a separately evidenced mechanism.
8. Canonical arrays have a specified stable sort before hashing or comparison.

The production JSON Schema, enum descriptions, canonicalization rules, and semantic validation tests are frozen in Session 17.

## 2. Assessment wrapper

Generic shape:

```json
{
  "status": "assessed",
  "value": "a value of the field's declared type",
  "reasonCode": null,
  "evidenceCandidateIds": ["cand_example"]
}
```

Allowed status/value combinations:

| `status` | `value` | Meaning |
|---|---|---|
| `assessed` | Required and type-valid; zero, false, and an empty array are valid when meaningful | The assessment was performed and has a result. |
| `unassessed` | `null` | The pipeline or reviewer did not attempt it. |
| `unknown` | `null` | It was attempted but available evidence could not resolve it. |
| `not-applicable` | `null` | The concept does not apply to this record. |

`reasonCode` is required for `unknown` and `not-applicable` and recommended for `unassessed`. Evidence IDs are required when an `assessed` result depends on candidate evidence. They may be empty only for a mechanically derived result whose derivation inputs are separately referenced.

Do not put the strings `"unknown"`, `"unassessed"`, or `"not-applicable"` into numeric, array, timestamp, object, boolean, or domain-enum values.

## 3. Canonical entities

### 3.1 Candidate observation

One JSONL line in `inputs/candidates/<run-id>.jsonl` represents one observation in one run:

```json
{
  "recordType": "candidate-observation",
  "schemaVersion": "draft-session14",
  "methodologyVersion": "2.0.0",
  "runId": "run_example",
  "candidateId": "cand_example",
  "observedAt": "2026-08-11T12:00:00.000Z",
  "publishedAt": {
    "status": "unknown",
    "value": null,
    "reasonCode": "source-did-not-provide-time"
  },
  "sourceRecord": {
    "reportingSourceId": "telegram:intelslava",
    "sourceRecordId": {
      "status": "unknown",
      "value": null,
      "reasonCode": "upstream-id-missing"
    },
    "sourcePath": "root.tg.urgent[0]",
    "canonicalUrl": {
      "status": "unassessed",
      "value": null,
      "reasonCode": "not-resolved-in-ingestion"
    }
  },
  "content": {
    "normalizedText": "Permitted normalized content.",
    "rawContentSha256": "hex-digest",
    "normalizedContentSha256": "hex-digest",
    "retentionStatus": "full-permitted"
  },
  "sourceOriginId": {
    "status": "unassessed",
    "value": null,
    "reasonCode": "assigned-after-ingestion"
  }
}
```

Requirements:

- `candidateId` identifies this observation record and is stable for the same normalized input identity. Exact ID generation is frozen in Session 17.
- `observedAt` is the acquisition timestamp and is always required.
- `publishedAt` is not inferred from `observedAt`.
- `reportingSourceId` identifies where Crucix obtained the report; it is not assumed to be the reporting origin.
- Content hashes are computed before assignment.
- A redacted or hash-only record uses a declared `retentionStatus`; it never substitutes fabricated content.
- Records sort by `candidateId` within a run for canonical hashing unless the final schema freezes another order.

### 3.2 Source-origin assessment

The accepted assignment record embeds or references:

```json
{
  "reportingSourceId": "outlet:example",
  "sourceOriginId": {
    "status": "assessed",
    "value": "origin:official-statement:example-identifier",
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "originType": {
    "status": "assessed",
    "value": "official-statement",
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "derivation": "quotes",
  "syndicationFamilyId": {
    "status": "not-applicable",
    "value": null,
    "reasonCode": "not-syndicated-copy"
  },
  "correctionState": "original"
}
```

Initial `originType` values:

- `outlet-original-reporting`
- `wire-report`
- `official-statement`
- `firsthand-observation`
- `derived-analysis`
- `aggregator-copy`
- `unknown-origin`

Initial `derivation` values:

- `original`
- `syndicates`
- `quotes`
- `summarizes`
- `reposts`
- `unknown`

Initial `correctionState` values:

- `original`
- `corrected`
- `retracted`
- `disputed`

The final vocabulary and matching rules belong in `methodology/2.0.0/source-origin-rules.json`.

### 3.3 Candidate-to-cluster assignment

One immutable line in `log/event-assignments/<run-id>.jsonl`:

```json
{
  "recordType": "event-assignment",
  "schemaVersion": "draft-session14",
  "methodologyVersion": "2.0.0",
  "runId": "run_example",
  "assignmentId": "assign_example",
  "assignmentVersion": 1,
  "candidateId": "cand_example",
  "normalizedContentSha256": "hex-digest",
  "eventClusterId": "event_example",
  "parentSeriesId": {
    "status": "assessed",
    "value": "series_example",
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "decision": "accepted",
  "clustering": {
    "method": "human",
    "rulesetId": "cluster-rules-draft",
    "rulesetSha256": "hex-digest",
    "similarity": {
      "status": "not-applicable",
      "value": null,
      "reasonCode": "human-assignment"
    },
    "similarityThresholdVersion": {
      "status": "not-applicable",
      "value": null,
      "reasonCode": "human-assignment"
    },
    "actorMatch": "unknown",
    "locationMatch": "unknown",
    "timeMatch": "unknown",
    "tieBreak": "not-required",
    "model": {
      "status": "not-applicable",
      "value": null,
      "reasonCode": "no-model-used"
    }
  },
  "priorRegistryVersion": 4,
  "intendedRegistryVersion": 5,
  "acceptedAt": "2026-08-11T12:05:00.000Z",
  "acceptedBy": "human",
  "reviewerId": {
    "status": "assessed",
    "value": "reviewer:pseudonymous-id",
    "reasonCode": null,
    "evidenceCandidateIds": []
  },
  "supersedesAssignmentId": {
    "status": "not-applicable",
    "value": null,
    "reasonCode": "initial-assignment"
  },
  "reason": "Same discrete incident, actor, target, location, and event window."
}
```

`assignmentVersion` versions the assignment/provenance format or decision policy, not a mutable revision of the line. A correction is a new line with a new `assignmentId` and an assessed `supersedesAssignmentId`. The old line remains.

If embedding/model assistance is used, the `model` assessed value must contain provider, model/embedding ID, immutable version/snapshot where available, prompt/ruleset hash, configuration, and tool version. Canonical scoring consumes only `decision: "accepted"` records.

### 3.4 Registry envelope

`state/events/registry.json` is a recoverable materialized view:

```json
{
  "recordType": "event-registry",
  "schemaVersion": "draft-session14",
  "methodologyVersion": "2.0.0",
  "registryVersion": 5,
  "lastAppliedRunId": "run_example",
  "lastAppliedAssignmentSha256": "hex-digest",
  "clusters": [],
  "parentSeries": [],
  "aliases": [],
  "provenance": [],
  "canonicalContentSha256": "hex-digest"
}
```

Canonical arrays sort as follows:

- clusters by `eventClusterId`;
- parent series by `parentSeriesId`;
- aliases by alias ID then canonical successor ID;
- provenance by decision timestamp then provenance ID.

The registry digest is calculated over the canonical object without `canonicalContentSha256` itself. Exact JSON canonicalization is frozen in Session 17.

### 3.5 Event cluster

Minimum cluster record:

```json
{
  "eventClusterId": "event_example",
  "identityState": "active",
  "canonicalSuccessorId": {
    "status": "not-applicable",
    "value": null,
    "reasonCode": "active-cluster"
  },
  "parentSeriesId": {
    "status": "assessed",
    "value": "series_example",
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "eventType": {
    "status": "assessed",
    "value": "energy-system-event",
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "actionStage": {
    "status": "assessed",
    "value": "implemented",
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "mechanisms": {
    "status": "assessed",
    "value": [
      {
        "mechanismId": "energy-supply-disruption",
        "directness": "direct",
        "evidenceCandidateIds": ["cand_example"],
        "assessmentVersion": 1
      }
    ],
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "reporting": {
    "candidateIds": ["cand_example"],
    "reportingSourceIds": ["outlet:example"],
    "sourceOriginIds": ["origin:example"]
  },
  "independentSourceCount": {
    "status": "assessed",
    "value": 1,
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "corroborationStatus": {
    "status": "assessed",
    "value": "single-origin",
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "firstSeen": "2026-08-11T12:00:00.000Z",
  "lastObservedAt": "2026-08-11T12:00:00.000Z",
  "lastMaterialChangeAt": "2026-08-11T12:00:00.000Z",
  "lifecycleState": {
    "status": "assessed",
    "value": "new",
    "reasonCode": null,
    "evidenceCandidateIds": ["cand_example"]
  },
  "assignmentVersion": 1,
  "provenanceVersion": 1,
  "lineage": {
    "derivedFrom": [],
    "mergedFrom": [],
    "splitInto": []
  }
}
```

`identityState` values:

- `active`
- `alias`
- `superseded`
- `split-parent`

Identity state is not lifecycle state.

### 3.6 Parent series

```json
{
  "parentSeriesId": "series_example",
  "label": "Reviewer-readable label",
  "firstSeen": "2026-08-11T12:00:00.000Z",
  "lastObservedAt": "2026-08-11T12:00:00.000Z",
  "childEventClusterIds": ["event_example"],
  "identityState": "active",
  "provenanceVersion": 1
}
```

Parent series organize related episodes. They have no severity, elevation, decay, or market contribution. A standalone cluster uses `parentSeriesId.status: "not-applicable"`.

## 4. Core vocabularies

### 4.1 Event type

| Value | Definition | Exclusions |
|---|---|---|
| `armed-conflict-action` | A discrete use of force, mobilization/force-posture action, or operational conflict episode. | General commentary without an action or episode. |
| `policy-restriction-action` | A discrete sanction, tariff, export control, asset restriction, regulatory constraint, or comparable policy act. | Generic policy discussion with no identifiable act. |
| `energy-system-event` | A discrete outage, damage, production/processing change, or transport event centered on energy systems. | Price movement alone. |
| `financial-distress-event` | A discrete default, funding, liquidity, solvency, banking, or credit-availability event. | Market price movement alone. |
| `production-logistics-event` | A discrete industrial outage, input shortage, port/freight/chokepoint interruption, or logistics episode. | Generic supply-chain commentary without an episode. |

When no leaf can be responsibly selected, `eventType.status` is `unknown`. Do not create an ad hoc leaf during audit. Proposed additional leaves go into adjudication notes for Methodology 2.1 or Session 17 review.

### 4.2 Action stage

| Value | Operational label |
|---|---|
| `rhetoric` | Statement, posture, or advocacy with no evidenced operational commitment. |
| `threatened` | Conditional or intended action is explicitly threatened. |
| `announced` | An authoritative decision/order is announced, but implementation is not evidenced. |
| `implemented` | The action has begun, been executed, or is in force. |
| `impact-observed` | A material real-world consequence is observed and attributed to the episode by the retained evidence. |

Record the furthest stage directly evidenced for the current episode; preserve earlier stages in provenance. Do not infer implementation from rhetoric or announcement.

### 4.3 Mechanism and directness

Initial mechanism IDs:

- `security-risk-repricing`
- `trade-asset-access-restriction`
- `energy-supply-disruption`
- `funding-credit-transmission`
- `production-transport-bottleneck`

Directness:

- `direct`: evidence states or demonstrates the event-specific transmission path.
- `contextual`: the path is plausible background but not established for this event.
- `none`: evidence does not support that mechanism.

Each mechanism item has its own directness and evidence IDs. A cluster-level directness field is prohibited because one event may have direct evidence for one channel and only contextual evidence for another.

### 4.4 Corroboration

Initial statuses:

- `single-origin`
- `corroborated-independent`
- `conflicting`
- `unknown-origin`
- `retracted-only`

`independentSourceCount` is the count of distinct accepted origins after syndication/derivation grouping. It is not an outlet count. A numerically larger count does not override `conflicting` or `retracted-only`.

### 4.5 Lifecycle

- `new`
- `escalating`
- `continuing`
- `de-escalating`

The lifecycle wrapper may be `unknown` when retained history cannot support a transition. Missing coverage is never labeled de-escalation.

## 5. Event-to-channel mapping record

A channel mapping is derived from mechanism items, not directly from `eventType`:

```json
{
  "eventClusterId": "event_example",
  "channelId": "energy-disruption",
  "mechanismId": "energy-supply-disruption",
  "directness": "direct",
  "evidenceCandidateIds": ["cand_example"],
  "elevationAssessment": {
    "status": "unassessed",
    "value": null,
    "reasonCode": "signal-gate-not-frozen"
  }
}
```

Allowed channel/mechanism pairs:

| Channel | Required mechanism |
|---|---|
| `conflict-escalation` | `security-risk-repricing` |
| `sanctions-policy` | `trade-asset-access-restriction` |
| `energy-disruption` | `energy-supply-disruption` |
| `credit-stress` | `funding-credit-transmission` |
| `supply-chain` | `production-transport-bottleneck` |

An event may have:

- no mapping: valid signal-only event;
- one mapping;
- multiple mappings with separate mechanism/evidence records.

Repeated candidates do not create repeated mappings. One cluster contributes at most once to one channel/run.

## 6. Market record draft

Per-instrument core:

```json
{
  "instrumentId": "brent",
  "sourceId": "FRED:DCOILBRENTEU",
  "instrumentSetVersion": "audit-candidate",
  "type": "price",
  "windowStart": "2026-07-20",
  "windowEnd": "2026-07-27",
  "asOf": "2026-07-27",
  "calendarAge": 0,
  "businessDayAge": 0,
  "freshness": "eligible",
  "eligibilityReason": "meets-candidate-rule",
  "transformValue": 0.0123,
  "zScore": 1.234,
  "absZScore": 1.234,
  "historyCount": 252,
  "inputSha256": "hex-digest"
}
```

Dates and values above are illustrative, not frozen thresholds. `windowStart` and `windowEnd` are actual observation dates, not labels claiming an exact calendar span.

Per-channel core:

```json
{
  "channelId": "energy-disruption",
  "marketAsOf": "2026-07-27",
  "minimumInstrumentAsOf": "2026-07-27",
  "maximumInstrumentAsOf": "2026-07-27",
  "maximumDateGapBusinessDays": 0,
  "eligibleInstrumentCount": 3,
  "mappedInstrumentCount": 3,
  "largestAbsZScore": 1.234,
  "primaryDriverInstrumentId": "brent",
  "secondLargestAbsZScore": 0.987,
  "secondDriverInstrumentId": "wti",
  "numberAboveThreshold": {
    "status": "unassessed",
    "value": null,
    "reasonCode": "v2-threshold-not-frozen"
  },
  "breadthRatio": {
    "status": "unassessed",
    "value": null,
    "reasonCode": "v2-threshold-not-frozen"
  },
  "breadthIndicator": {
    "status": "unassessed",
    "value": null,
    "reasonCode": "breadth-definition-not-frozen"
  },
  "thresholdRuleId": "audit-candidate",
  "marketMoving": {
    "status": "unassessed",
    "value": null,
    "reasonCode": "v2-threshold-not-frozen"
  },
  "instruments": []
}
```

The final dating, eligibility, breadth, and threshold semantics are Session 16 evidence questions and Session 17 freeze decisions.

## 7. Divergence and timing record draft

```json
{
  "methodologyVersion": "2.0.0",
  "runId": "run_example",
  "channelId": "energy-disruption",
  "signalAssessment": {
    "status": "assessed",
    "value": true
  },
  "marketAssessment": {
    "status": "assessed",
    "value": false
  },
  "timing": {
    "status": "assessed",
    "value": "signal-before-close",
    "signalTimestamp": "2026-08-11T14:00:00.000Z",
    "relevantMarketCloseAt": "2026-08-11T20:00:00.000Z",
    "nextEligibleMarketCloseAt": "2026-08-12T20:00:00.000Z"
  },
  "state": "signal-leading",
  "leadingEventClusterId": "event_example",
  "qualifyingClusterCount": 1
}
```

V2 state values:

- `signal-leading`
- `co-movement`
- `market-only`
- `calm`
- `pending`
- `unassessed`

`pending` applies when the signal is after the relevant close and the next eligible market observation is unavailable. `unassessed` applies when required signal, market, or timing inputs cannot be assessed. Neither is forced into the four-state matrix.

## 8. Provenance and lineage events

Registry provenance record types:

- `cluster-created`
- `observation-attached`
- `material-change-accepted`
- `lifecycle-changed`
- `origin-corrected`
- `assignment-corrected`
- `cluster-aliased`
- `clusters-merged`
- `cluster-split`
- `canonical-successor-set`
- `retraction-recorded`

Every record includes a stable provenance ID, event time, decision time, affected IDs, evidence IDs, assignment/rules version, actor type, reviewer ID wrapper, reason, prior digest, and resulting digest. No provenance record is edited or removed.

## 9. Semantic validation requirements

Session 17 acceptance tests must reject a canonical record when:

- a v2 artifact lacks `methodologyVersion`;
- an ID is duplicated or a cluster ID is reused;
- `lastObservedAt` precedes `firstSeen`;
- `lastMaterialChangeAt` precedes `firstSeen` or exceeds `lastObservedAt`;
- repeated publication alone changes `lastMaterialChangeAt`;
- a parent series contributes directly to a channel;
- a channel mapping lacks a mechanism or evidence;
- the same cluster contributes more than once to a channel/run;
- a non-assessed wrapper has a non-null value;
- an assessed wrapper has null or an invalid type;
- an assignment references a missing candidate or mismatched content hash;
- a correction overwrites rather than supersedes an assignment;
- merge/split lineage points to missing or reused IDs;
- `independentSourceCount` is calculated from domains rather than accepted origin IDs;
- a model-assisted accepted assignment lacks persisted model/configuration provenance;
- scoring attempts to consume an uncommitted assignment;
- a pending after-close signal is classified against the preceding close;
- canonical reproduction changes any nonvolatile field.

## 10. Methodology 2.1 candidates

The following are intentionally outside the minimum 2.0 core unless Sessions 15–17 prove them essential:

- complete 16-leaf ontology;
- exhaustive actors, locations, infrastructure, assets, and scope extraction;
- source-quality scoring/weights beyond origin and correction provenance;
- expected/observed direction and directional consistency;
- richer consequence/severity models;
- additional market channels;
- probabilistic causal attribution.
