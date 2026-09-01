# Corrected Session 17 freeze candidate — correction report

Status: **correction-only pass completed; fresh independent PA-08 revalidation required before Session 18**

Methodology version: `2.0.0`

Failed manifest identity preserved as failed audit history: `809fb5119c3634ab6c30349c8b58ef7659effd4b0b227af69186ed876e63bf33`

Corrected manifest identity: `c99059b2aa12022d73d3fd5ffb5505d805de5e2e77aa093de975b309cdc8196c`

## Preservation and scope

- Preflight: `master` at `bfce08feece67444ce7fd98ea6fe2b42d15eea24`; `origin/master` identical; ahead/behind `0/0`; no tracked or staged changes.
- The 50 manifest-bound Session 14–16 evidence identities, Session 15's 11 preservation copies/597,000 bytes, the Session 16 canonical manifest, and all 12 production/legacy baselines reproduced before and after correction.
- The project log, Session 15/16 evidence, production scripts, workflow, current public outputs, legacy outputs/history, and private records were not edited.
- No Session 18/19 implementation, publication, staging, commit, or push occurred.
- The six bounded deferrals remain byte-identical; `audit/session17/deferred-items.json` remains SHA-256 `4c8f0ead8d1af79173c6388960216bfbb6e5a21a18470bef5281af06a2755360`.

## Six repairs

### 1. Normalized-content automatic clustering

`clustering-lifecycle-rules.json` now normatively freezes the exact Session 15 `conservativeNormalize` behavior as `crucix-session15-conservative-normalization/v1`:

```js
String(rawText).normalize("NFKC").replace(/\r\n?/g, "\n").trim().replace(/\s+/gu, " ")
```

Case, punctuation, numbers, negation, attribution, emoji/symbols, and URLs are preserved after NFKC; CRLF/CR becomes LF before all Unicode whitespace is collapsed to U+0020. The SHA-256 input is the exact normalized UTF-8 bytes without BOM or an inserted newline. `rawIdentity` now requires `normalizationVersion`, lowercase 64-hex `normalizedContentHash`, and a typed normalized-content retention state. Exact normalized-content automatic assignment requires both version and hash equality. Fuzzy, embedding, token-similarity, edit-distance, and undocumented semantic automatic joins are prohibited.

Fixtures reproduce equivalent hashes, preserve material/case/punctuation distinctions, reject version mismatch, malformed or miscalculated hashes, and require adjudication when otherwise exact evidence conflicts.

### 2. Ten adversarial records

| Immutable PA-08 case | Invariant | Enforcement | Negative fixture |
|---|---|---|---|
| Assessed enum without value | `INV-ASSESS-001` | `schema.json#/$defs/enumAssessment` assessed `oneOf` branch requires `value` | `adversarial-assessed-enum-without-value` |
| Unknown enum with value | `INV-ASSESS-002` | Unknown `oneOf` branch excludes `value` and requires a reason | `adversarial-unknown-enum-with-value` |
| Independent class with zero origins | `INV-ORIGIN-001` | `originEvidence` corroborated branch requires at least two origins/groups and count ≥2 | `adversarial-independent-class-with-zero-origins` |
| Unknown status with resolved origin | `INV-ORIGIN-001` | Unknown branch requires unknown/unverified class, zero resolved groups/count, and reason | `adversarial-unknown-status-with-resolved-origin` |
| Automatic assignment without rule/cluster | `INV-ASSIGN-001` | `assignment` conditionals require an allowed rule and cluster; each exact rule requires its identity inputs | `adversarial-automatic-assignment-without-rule-or-cluster` |
| Continuing transition marked material | `INV-LIFE-002` | `lifecycleTransition` continuing branch requires `material:false` and prohibits material-transition provenance | `adversarial-continuing-transition-marked-material` |
| Escalating transition marked nonmaterial | `INV-LIFE-002` | New/escalating/de-escalating branch requires `material:true` and explicit provenance | `adversarial-escalating-transition-marked-nonmaterial` |
| Eligible reading with exclusion and no window | `INV-MARKET-001` | Required complete `instrumentReading` window/history/age/state fields plus eligible-state conditional | `adversarial-eligible-reading-with-exclusion-and-no-window` |
| Assessed market with null statistic/empty cohort | `INV-MARKET-003` | Assessed `marketChannelOutput` branch requires a fresh quorum, set/key, statistic, threshold, result, driver, and diagnostics | `adversarial-assessed-market-with-null-statistic-and-empty-cohort` |
| Assessed divergence with inconsistent state | `INV-DIV-001` | Four boolean-to-state schema conditionals plus normative semantic mapping | `adversarial-assessed-divergence-with-inconsistent-state` |

The expanded validator confirms all ten records fail schema validation for the mapped invariant and does not weaken any unrelated requirement.

### 3. Lifecycle and market operational fields

`eventCluster` now requires `firstSeen`, both clocks, lifecycle status/assessment, assignment/provenance versions, aliases, parent/lineage references, and ordered evidence/lifecycle histories. Material transitions carry explicit provenance. Named semantic invariants reject timestamp contradictions, non-monotonic histories, lifecycle/current-state mismatch, and silent material-clock movement by continuing coverage.

`instrumentReading` now requires the six actual own-series observation dates used by a five-valid-observation transform, `windowStart`, `windowEnd`, `asOf`, `historyCount`, instrument-set/version conditioning, calendar/business-day ages, freshness, eligibility, exclusion reason, and typed z-score assessment. `marketChannelOutput` binds cohort/set/count, M, threshold result, drivers, threshold counts, and breadth to those readings. Complete-record mutations cover missing, malformed, contradictory, and chronology-invalid fields.

### 4. Recoverable origin topology

The new `originProvenance` record persists stable reporting-source, originating-assertion, reporting-origin, independence-group, and provenance-edge nodes. `originEvidence` references each topology layer and carries an assessment version and semantic-validator version. The required path is recoverable without prose:

```text
candidate → reporting source → originating assertion/observation
          → reporting origin → independence group
```

Rules and fixtures collapse 30 syndicated reports and repeated quotations of one official statement to one group, admit a separately evidenced direct observation as a second group, preserve unknown derivation as non-corroborating, and prevent conflicting origins from increasing confidence. Dangling, circular, and self-referential edges fail.

### 5. Complete records and canonical bytes

`parameters.json` defines executable `crucix-canonical-json/v2.0.0` behavior: UTF-8 without BOM, recursively sorted object keys, no insignificant whitespace, exactly one final LF, ECMAScript finite-number serialization after 12-place persisted rounding, negative-zero normalization, retained nulls and typed unknowns, named volatile exclusions, and a required policy for every schema array.

The validator finds 47 array-bearing schema properties and requires each to be declared set-like with a deterministic key or sequence-like with a monotonic rule. Set arrays normalize order; ordered histories are validated and never silently sorted.

The positive suite contains a connected complete `runBundle` covering candidate, origin topology, assignment, event cluster/registry/parent/lineage, signal output, complete instrument readings, five market-channel outputs, five divergence outputs, and run manifest. The deliberately reordered complete run-manifest fixture canonicalizes twice to the exact LF-terminated UTF-8 bytes and SHA-256 `e871a28d2d2b6634246939c4b078b0116c8f4b65fb04ff37e7082218f0f7c7c7`. An out-of-order lifecycle history is rejected rather than reordered.

Fixture totals are 46 positive and 48 negative, up from 37 and 26.

### 6. Evidence traceability

Observation disposition and cluster-origin assessment are now kept separate everywhere in the mutable Session 17/corrected Methodology records:

- `101/428` observations unresolved and not confirmed non-events;
- `21/123` active clusters unknown-origin;
- exact independent-source count assessed for `102/123` clusters;
- corroboration: `97` single-origin, `4` corroborated-independent, `1` conflicting, `21` unknown-origin.

The expanded validator recomputes these values directly from the immutable Session 15 assignment and event-cluster ledgers and rejects the old denominator wording outside the immutable failed PA-08 artifacts.

## Exact files changed or created

Changed Methodology files:

- `methodology/2.0.0/README.md`
- `methodology/2.0.0/clustering-lifecycle-rules.json`
- `methodology/2.0.0/fixtures/negative.json`
- `methodology/2.0.0/fixtures/positive.json`
- `methodology/2.0.0/manifest.json`
- `methodology/2.0.0/parameters.json`
- `methodology/2.0.0/schema.json`
- `methodology/2.0.0/source-origin-rules.json`

Changed non-independent Session 17 files:

- `audit/session17/freeze-report.md`
- `audit/session17/parameter-traceability.json`
- `audit/session17/validate-freeze.mjs`
- `audit/session17/validation-report.md`

Created:

- `audit/session17/correction-report.md`

## Failed PA-08 artifact preservation

- `audit/session17/independent-validation-report.md`: `59f2d82692c8a052b3758e92ceed8fb3a3382dbfcaa6178d7d0bf86b934e1f9b`
- `audit/session17/independent-validation-results.json`: `34f1daf6ddd07f675c2c107a66e84bf25711503d15f08b24a5b58cbbaff8260e`
- `audit/session17/validate-independent.mjs`: `cb82199c3160e22dc16f18a45b843a07e4ae043aa4b3af66241cb3df08eebc0c`

These hashes are also recorded in the corrected manifest. None of the three files was edited or replaced.

## Validation and manifest regeneration

`node audit/session17/validate-freeze.mjs` passes all 24 groups. It validates parsing/refs, 94 fixture outcomes, exact normalization hashes, all ten adversarial records, required lifecycle/market surfaces, topology recovery/invalid edges, 11 connected production definitions, 47 array policies, exact canonical bytes/hash, corrected traceability, failed-PA-08 preservation, unchanged selections/deferrals, manifest/evidence identities, production/legacy preservation, worktree scope, and `git diff --check`.

Artifact hashes were regenerated from physical bytes. Two separate clean Node processes independently derived the same corrected manifest identity:

`c99059b2aa12022d73d3fd5ffb5505d805de5e2e77aa093de975b309cdc8196c`

## Frozen selections and remaining gate

No frozen methodological selection changed: Candidate C/E2; two-origin corroboration; implemented/impact boundary; explicit lifecycle with no decay; Rule 2, age 3, gap 0; quorum 2/2, 2/3, 3/4; alpha `.20`; prior-only same-set/count history 126–252; strict comparison; no fallback; breadth weight 0; after-close pending; 30-close minimum; no cutover.

This is the **corrected Session 17 freeze candidate**. The expanded first-pass PASS is not PA-08. Fresh independent revalidation remains the only material blocker before Session 18; the existing PA-09 durable-storage/retention controls continue to block public cutover as already deferred.
