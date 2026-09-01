# CRUCIX Methodology 2.0.0 — corrected Session 17 freeze candidate

This directory is an isolated, machine-readable corrected freeze candidate for the signal, market, divergence, identity, lineage, storage, migration, and parallel-acceptance contracts. It supersedes the failed manifest identity `809fb5119c3634ab6c30349c8b58ef7659effd4b0b227af69186ed876e63bf33` without converting that failed PA-08 record into a pass. It is not production code, a cutover authorization, a PA-08 result, or a completed methodology release.

The candidate preserves every legacy path and writes any future v2 public output only below `dashboard/public/v2/2.0.0/` and `log/v2/2.0.0/`. Record-level signal evidence and frozen market inputs remain private. A fresh independent PA-08 revalidation must pass before Session 18 begins; public cutover remains separately gated.

## Frozen posture

- Event clusters, not reports, are the scoring unit. A cluster contributes at most once per channel and run.
- Signal elevation is structural. E2 accepts a resolved, nonconflicting single origin or independently corroborated origins; the action must be implemented or impact-observed, the lifecycle must record a material new/escalating/de-escalating transition, and a direct mechanism must map to the channel. Announced items remain visible but do not elevate.
- There is no scalar signal score, time decay, stale-event cutoff, expiry, inferred de-escalation, or unrecorded model decision.
- Candidate disposition is separate from event type. Multi-incident records are decomposed into immutable children only when safe; otherwise they remain `unresolved-multi-incident` and cannot score.
- Market transforms use each instrument's own valid observations: a five-valid-observation return or level change, followed by a 252-transform sample-standard-deviation z-score.
- Each channel independently selects its latest qualifying same-date cohort no more than three UTC weekdays old. Two-instrument channels require both instruments; three- and four-instrument channels require N−1. Mixed-date statistics are forbidden.
- The channel statistic is maximum absolute z. Its binary assessment uses a point-in-time nearest-rank 80th percentile of 126–252 prior observations conditioned on both instrument-set version and eligible count. Equality does not trigger and insufficient history has no fallback.
- Raw z values, driver, second driver, eligible count, raw-threshold diagnostics, and breadth remain visible. Breadth is diagnostic only.
- Divergence uses only `signal-leading`, `co-movement`, `market-only`, and `calm`. Pending, insufficient, and unknown timing outcomes remain outside that four-state set. The states are descriptive, never causal.

## Corrected specification boundary

- Exact normalized-content matching uses `crucix-session15-conservative-normalization/v1`: NFKC, CRLF/CR to LF, trim, then Unicode-whitespace collapse to one ASCII space. Case, punctuation, negation, attribution, and URLs are preserved. The exact normalized UTF-8 bytes are SHA-256 hashed; both version and lowercase 64-hex hash must match. Fuzzy, embedding, token-similarity, and undocumented semantic automatic matching remain prohibited.
- Origin records persist typed nodes and edges from candidate to reporter to assertion to reporting origin to independence group. Syndication and repeated quotation cannot manufacture corroboration; dangling, circular, or self-referential derivation edges are invalid.
- Lifecycle records require `firstSeen`, `lastObservedAt`, `lastMaterialChangeAt`, status/assessment/version fields, ordered histories, and explicit material-transition provenance. Continuing coverage may advance observation time but cannot move the material clock.
- Instrument readings require actual own-series window dates, window endpoints, six observations for the five-valid-observation transform, history count, set/count conditioning, ages, freshness, eligibility, typed z-score state, and exclusion reason. Market outputs bind their statistic and diagnostics to those readings.
- `crucix-canonical-json/v2.0.0` supplies a machine-readable set/sequence policy for every schema array, exact UTF-8/LF/number/null/unknown behavior, volatile-field exclusions, and repeatable byte fixtures.
- Session 15 evidence is recorded with separate denominators: `101/428` unresolved observations; `21/123` unknown-origin clusters; exact independent-source count assessed for `102/123` clusters. Corroboration is `97` single-origin, `4` corroborated-independent, `1` conflicting, and `21` unknown-origin.

## Artifact roles

- `schema.json` defines candidates, assignments, registries, clusters, parent series, mechanisms, signal/market/divergence outputs, run manifests, lineage, provenance, corrections, point-in-time evidence histories, and fixture suites.
- `enums.json`, `parameters.json`, and `leaf-channel-map.json` freeze controlled values, every numeric parameter, source/transform mapping, exact ordering, calendar, rounding, and hashing conventions.
- `source-origin-rules.json` and `clustering-lifecycle-rules.json` freeze provenance, independence, automatic-versus-adjudicated clustering, atomicity, lifecycle clocks, and signal selection.
- `storage-migration-contract.json` isolates v2, retains raw identity and lineage, and defines safe behavior while the durable private backend remains deferred.
- `parallel-acceptance.json` requires at least 30 distinct eligible market closes, permits extension or rejection, and requires an independent post-freeze validation before cutover.
- `fixtures/positive.json` and `fixtures/negative.json` exercise the acceptance boundary, all ten PA-08 adversarial records, complete production records, a connected end-to-end bundle, provenance topology, and exact canonical bytes. `audit/session17/validate-freeze.mjs` validates them and the full package.
- `manifest.json` hashes every frozen methodology artifact. Its self-identity is the SHA-256 of canonical manifest JSON with `selfIdentity.value` set to `null`; the manifest intentionally does not attempt an impossible physical self-hash fixed point.

## Canonical processing order

1. Freeze a run input manifest and derive the run ID.
2. Extract immutable candidates, preserving raw identities and typed unknowns.
3. Decompose safely separable multi-incident records or exclude them as unresolved.
4. Persist deterministic exact-match assignments or persist ambiguous proposals for human disposition.
5. Recover the registry and append assignments, lineage, corrections, and material lifecycle transitions.
6. Apply structural signal eligibility and transparent ranking.
7. Compute independently dated, same-date channel market assessments and conditioned point-in-time thresholds.
8. Align signal timing to a reliable eligible close; otherwise emit pending or unknown timing.
9. Persist private outputs, then publish a versioned manifest last only when publication is separately authorized.

For traceability, evidence limitations, deferrals, and validation results, see `audit/session17/`.
