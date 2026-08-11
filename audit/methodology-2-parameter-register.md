# Methodology 2.0 parameter register

Status: Session 14 architecture register. This is not `methodology/2.0.0/parameters.json`. Session 17 converts accepted decisions into versioned machine-readable artifacts.

## 1. Status meanings

Every parameter has exactly one current status:

| Status | Meaning |
|---|---|
| `frozen legacy` | Existing pre-2.0 production behavior. It remains unchanged for legacy output and is not automatically adopted by v2. |
| `Session 14 architecture default` | Structural default accepted for audit/design. Session 17 still validates the production representation unless the item is an invariant. |
| `to measure Session 15` | Signal evidence is required; no final value is selected. |
| `to measure Session 16` | Market evidence is required; no final value is selected. |
| `to freeze Session 17` | Architecture/evidence can support a decision, but the final production value/contract must be frozen with acceptance tests. |
| `Methodology 2.1 candidate` | Deliberately outside the minimum 2.0 core unless evidence shows it is essential. |

Numeric values shown under `frozen legacy` describe existing code only. Session 14 freezes no new numeric signal cutoff, decay interval, similarity threshold, stale cutoff, market percentile `alpha`, minimum percentile history, maximum channel date gap, minimum eligible count, or parallel-period length.

## 2. Persistence, versioning, and reproducibility

| Parameter | Current value/candidate | Status | Evidence/decision note |
|---|---|---|---|
| Raw candidate path | `inputs/candidates/<run-id>.jsonl` | `Session 14 architecture default` | Immutable one-file-per-run design target. |
| Event registry path | `state/events/registry.json` | `Session 14 architecture default` | Recoverable materialized state. |
| Assignment history path | `log/event-assignments/<run-id>.jsonl` | `Session 14 architecture default` | Complete per-run file committed atomically; never overwritten. |
| Methodology artifact paths | `methodology/2.0.0/{schema,parameters,leaf-channel-map,source-origin-rules}.json` | `Session 14 architecture default` | Artifacts are not created until schema/values freeze. |
| Draft methodology version | `2.0.0` for the provisional namespace | `Session 14 architecture default` | Release value confirmed in Session 17. |
| Registry write transaction | lock → immutable candidate file → immutable assignment file → atomic registry replace → score | `Session 14 architecture default` | Assignment commits before registry so interruption is replayable. |
| Registry lock timeout/stale-lock handling | Unset | `to freeze Session 17` | Must be operational and tested without inventing a timeout now. |
| Registry recovery | validate; load valid checkpoint; replay hash-linked complete assignment files; stop on mismatch | `Session 14 architecture default` | Never fall back to empty state or skip a committed assignment. |
| Candidate retention invariant | Retain every candidate needed by a retained v2 result; no automatic pruning during Sessions 15–20 | `Session 14 architecture default` | Session 15 measures growth. |
| Long-term candidate tiering/duration | Unset | `to freeze Session 17` | Must preserve reproduction and respect source terms/privacy. |
| Assignment/lineage retention | Indefinite and append-only | `Session 14 architecture default` | Corrections supersede; they do not erase. |
| Private/public boundary | Raw candidates, registry, assignments private; methodology configs and sanitized v2 outputs public | `Session 14 architecture default` | “Private” means access-controlled/not published; storage backend remains open. |
| Private storage backend | Git/private object storage/CI artifact choice unset | `to freeze Session 17` | Use Session 15 growth/licensing evidence. |
| Canonical JSON ordering/canonicalization | Stable ordering required; exact standard unset | `to freeze Session 17` | Needed for bit-identical hashes. |
| Hash algorithm | SHA-256 design target | `Session 14 architecture default` | Applies to input/config/output manifests. |
| Reproducibility inputs | normalized candidates + persisted origin assignments + persisted cluster assignments + frozen configuration + frozen market inputs | `Session 14 architecture default` | Network/model calls prohibited during replay. |
| Volatile comparison exclusions | `generatedAt`, duration, host/process/request/retry/temp/log metadata only | `Session 14 architecture default` | Semantic/as-of/provenance fields are not excluded. |
| Parallel public namespace | `dashboard/public/v2/2.0.0/*.json` | `Session 14 architecture default` | Cannot overwrite legacy public files. |
| Parallel immutable namespace | `log/v2/2.0.0/runs/<run-id>/*` and `log/v2/2.0.0/closes/<date>.json` | `Session 14 architecture default` | Exact manifest/correction mechanics freeze in Session 17. |
| Methodology stamping | Required `methodologyVersion` on every v2 artifact | `Session 14 architecture default` | Legacy snapshots remain unstamped/unchanged. |

## 3. Signal identity and clustering

| Parameter | Current value/candidate | Status | Evidence/decision note |
|---|---|---|---|
| Scored unit | One underlying event cluster | `Session 14 architecture default` | Reports are observations/evidence, not scored shocks. |
| Event ID behavior | Stable opaque `eventClusterId`; never reused | `Session 14 architecture default` | Mutable semantics must not be embedded. |
| Event ID encoding/generator | Unset | `to freeze Session 17` | Must pass collision and deterministic/monotonic tests. |
| Parent identity | Separate `parentSeriesId` for broader crisis/campaign/series | `Session 14 architecture default` | Parent is never scored. |
| Parent assignment boundary | Shared documented broader series; country/category overlap alone insufficient | `Session 14 architecture default` | Session 15 measures mega-cluster/fragmentation cases. |
| Historical assignment mutation | Prohibited | `Session 14 architecture default` | Corrections append provenance. |
| Merge rule | Alias/canonical successor; do not rewrite prior assignments | `Session 14 architecture default` | Exact active-view resolution tests freeze in Session 17. |
| Split rule | New IDs with `derivedFrom`/lineage; retain original history | `Session 14 architecture default` | No child reuses parent ID. |
| Human correction rule | Append new decision with reason/reviewer and superseded record reference | `Session 14 architecture default` | Never delete old provenance. |
| Preferred clustering approach | Deterministic if Session 15 finds it adequate | `to measure Session 15` | Model assistance is permitted only as persisted proposals. |
| Cluster similarity function | Unset | `to measure Session 15` | Compare identity tuple and any candidate similarity method. |
| Cluster similarity threshold | Unset | `to measure Session 15` | Do not infer from legacy keyword scores. |
| Actor matching window/rule | Unset | `to measure Session 15` | Missing actors use assessment status. |
| Location matching window/rule | Unset | `to measure Session 15` | Location overlap alone does not force a merge. |
| Event-time matching window | Unset | `to measure Session 15` | Measure by event type/episode behavior. |
| Target/policy-identifier match | Required evidence dimension; exact rules unset | `to measure Session 15` | Helps distinguish episodes. |
| Tie-break order | exact incident key → smallest event-time distance → earliest `firstSeen` → lexical cluster ID; substantively ambiguous cases adjudicated | `Session 14 architecture default` | Exact matching/window definitions freeze later. |
| Model/embedding use | Optional proposal aid; never live canonical dependency | `Session 14 architecture default` | Accepted assignment must persist before scoring. |
| Model/embedding identifier/config/prompt hash | Required if assistance is adopted; value unset | `to freeze Session 17` | Session 15 determines whether assistance is needed. |
| Candidate normalized-content rules | Conservative audit normalization defined; production rules unset | `to freeze Session 17` | Must preserve negation/numbers/entities and be hashable. |
| Assignment version | Required; exact initial value/semantics unset | `to freeze Session 17` | Separate from methodology and registry versions. |
| Reviewer/override provenance | Required for human corrections/acceptance | `Session 14 architecture default` | Reviewer ID may be pseudonymous/private. |

## 4. Signal taxonomy, evidence, lifecycle, and elevation

| Parameter | Current value/candidate | Status | Evidence/decision note |
|---|---|---|---|
| Minimum event leaf set | `armed-conflict-action`; `policy-restriction-action`; `energy-system-event`; `financial-distress-event`; `production-logistics-event` | `Session 14 architecture default` | Session 15 tests coverage; Session 17 freezes production enum. |
| Complete 16-leaf ontology | Deferred | `Methodology 2.1 candidate` | Do not force into 2.0. |
| Event-type missingness | Typed assessed/unassessed/unknown/not-applicable wrapper | `Session 14 architecture default` | Unknown does not create an “other” leaf. |
| Action-stage mapping | `rhetoric`, `threatened`, `announced`, `implemented`, `impact-observed` with evidence definitions | `Session 14 architecture default` | Furthest directly evidenced current stage. |
| Action-stage weights | None selected; including whether weights are needed | `to measure Session 15` | Do not inherit keyword weights. |
| Severity mapping | Unset; action/implementation/consequence only, separate from confidence | `to measure Session 15` | Repeated publication cannot add severity. |
| Source-origin rules | Group wire copies, common official assertions, derivations, corrections/retractions; unknown provenance conservative | `Session 14 architecture default` | Edge-case rates measured in Session 15. |
| Independent-source definition | Distinct accepted reporting origins/observations, not domains/outlets | `Session 14 architecture default` | Official statement plus genuinely independent observation may count separately. |
| Unknown-origin counting | Near-identical unresolved copies form one conservative origin family | `Session 14 architecture default` | No independence inferred from multiple domains. |
| Conflicting-origin treatment | Preserve origins; `conflicting` status; no automatic confidence increase | `Session 14 architecture default` | Count and consistency remain separate. |
| Corrected/retracted treatment | Same origin; append correction/retraction; do not erase or add corroboration | `Session 14 architecture default` | May change current confidence/lifecycle with provenance. |
| Corroboration vocabulary | single-origin, corroborated-independent, conflicting, unknown-origin, retracted-only | `Session 14 architecture default` | Session 15 tests coverage. |
| Corroboration/confidence mapping | Unset | `to measure Session 15` | Independent count alone is insufficient. |
| Source-quality categories/weights | Not in minimum core beyond origin/correction provenance | `Methodology 2.1 candidate` | Add only if evidence makes them essential. |
| `firstSeen` | First retained Crucix observation, not claimed real-world start | `Session 14 architecture default` | Required timestamp. |
| `lastObservedAt` clock | Advances on every accepted repeated observation | `Session 14 architecture default` | Separate from decay. |
| `lastMaterialChangeAt` clock | Advances only on material stage/consequence/severity/mechanism/escalation/de-escalation change | `Session 14 architecture default` | Republication alone cannot advance it. |
| Decay clock | Key from `lastMaterialChangeAt` | `Session 14 architecture default` | Exact function/interval unset. |
| Decay function/rate | Unset | `to measure Session 15` | Compare observed recurrence/material-change intervals. |
| Lifecycle vocabulary | new, escalating, continuing, de-escalating | `Session 14 architecture default` | Unknown wrapper permitted when history incomplete. |
| Lifecycle materiality/transition rules | Structural definitions set; edge rules/intervals unset | `to measure Session 15` | Silence never means de-escalation. |
| Stale-event rule | Unset | `to measure Session 15` | Must use material-change clock. |
| De-escalation expiry/contribution | Unset | `to measure Session 15` | De-escalation must remain representable. |
| Mechanism vocabulary | security-risk-repricing; trade-asset-access-restriction; energy-supply-disruption; funding-credit-transmission; production-transport-bottleneck | `Session 14 architecture default` | Session 15 tests minimal coverage. |
| Mechanism-to-channel map | One named mechanism for each of the five current market channels | `Session 14 architecture default` | Event type is not a channel mapping. |
| Directness vocabulary | direct, contextual, none per mechanism | `Session 14 architecture default` | No cluster-global directness. |
| Directness gate | Exact qualifying directness rule unset | `to freeze Session 17` | Session 15 measures direct/contextual cases. |
| Signal elevation rule | Structural gate vs scalar score vs combination unset | `to freeze Session 17` | Session 15 measures all candidates. |
| Structural gate candidate | explicit mechanism + sufficient evidence + qualifying stage/consequence + new/material escalation/de-escalation | `to measure Session 15` | Candidate, not final rule. |
| Scalar event score/components/cutoff | Unset, including whether a scalar is needed | `to measure Session 15` | Legacy 60% does not port. |
| Evidence sufficiency exception | No single unverified origin exception selected | `to freeze Session 17` | Any exception must be documented/tested. |
| Cluster/channel contribution cap | One logical contribution per cluster per channel/run | `Session 14 architecture default` | Repeated reports cannot multiply it. |
| Multi-channel contribution | Allowed only through separately evidenced mechanisms | `Session 14 architecture default` | One event may also map to zero channels. |
| Leading event/breadth | Expose leading qualifying cluster and qualifying cluster count | `Session 14 architecture default` | Exact ranking if ties remains to freeze. |
| Category quotas | Prohibited | `Session 14 architecture default` | Distributions are measured, not forced. |
| Full actor/location/asset/infrastructure/scope enrichment | Deferred with typed status if field appears | `Methodology 2.1 candidate` | Not required for minimum core. |

## 5. Legacy market baseline

| Parameter | Current value | Status | Evidence/decision note |
|---|---|---|---|
| Primary sources | FRED and Tiingo EOD | `frozen legacy` | Session 14/16 add no source. |
| Tiingo value field | `adjClose` | `frozen legacy` | Applies to ETF price instruments. |
| Instrument/channel map | Existing five-channel map in `scripts/market-data.mjs` | `frozen legacy` | Baseline under audit; fallback symbols are recorded. |
| Price transform | five-common-observation return | `frozen legacy` | V2 audits five valid own-series observations. |
| Level transform | five-common-observation level change | `frozen legacy` | V2 audits five valid own-series observations. |
| Observation lookback | 5 common observations | `frozen legacy` | Not a v2 calendar-day claim. |
| Z-score history | 252 common-date transformed observations ending at current transform | `frozen legacy` | Uses sample standard deviation. |
| Fetch horizon implementation | 900 calendar days | `frozen legacy` | Audit acquisition baseline, not a frozen v2 history. |
| Date alignment | Global intersection across all instruments | `frozen legacy` | Explicit v2 audit target. |
| Channel statistic/driver | maximum absolute z-score; named instrument | `frozen legacy` | Retained as v2 diagnostic architecture. |
| Market-moving threshold | `max \|z\| >= 1.5` | `frozen legacy` | Legacy output only. |
| Current freshness diagnostics | current ≤3 calendar days; stale >14 calendar days | `frozen legacy` | V2 cutoffs must be measured. |
| Legacy divergence states | radar-claim, priced, radar-miss, calm | `frozen legacy` | Historical names remain untouched. |
| Legacy signal threshold | 60% of Phase 1 score ceiling | `frozen legacy` | Not inherited by v2. |

## 6. V2 market transform, dating, eligibility, threshold, and breadth

| Parameter | Current value/candidate | Status | Evidence/decision note |
|---|---|---|---|
| V2 calculation calendar | Each instrument’s own valid observations | `Session 14 architecture default` | Avoid global all-instrument intersection. |
| V2 price/level distinction | Price returns; level changes | `Session 14 architecture default` | Exact lookback/history still audited. |
| V2 observation lookback | Legacy five-valid-observation candidate; final value unset | `to measure Session 16` | Retain actual `windowStart`/`windowEnd`. |
| V2 z-score history window | Legacy-compatible 252 candidate; final rolling/history definition unset | `to measure Session 16` | Audit point-in-time behavior. |
| V2 z mean/standard deviation definition | Legacy-compatible sample SD candidate; exact canonical rounding unset | `to freeze Session 17` | Session 16 reproduces it exactly. |
| Per-instrument retained fields | window start/end, asOf, ages, freshness/eligibility, z, history count, input hash | `Session 14 architecture default` | Required for auditability. |
| Channel dating rule | Compare strict channel-common, latest same-date quorum, bounded mixed-date | `to measure Session 16` | Legacy global intersection remains baseline. |
| `marketAsOf` | Defined per dating candidate; final rule unset | `to measure Session 16` | Mixed dates must expose min/max/gap. |
| Stale eligibility rule | Enumerate legacy baseline and observed business-day-age cutoffs | `to measure Session 16` | No new cutoff frozen. |
| Maximum within-channel date gap | Unset; evaluate every observed feasible gap including zero | `to measure Session 16` | Differently dated inputs only under explicit bounded candidate. |
| Minimum eligible instrument count | Unset; evaluate every feasible count for each channel | `to measure Session 16` | Report unassessed rows. |
| Changing eligible instrument sets | Compare pooled, same-set, and eligible-count-conditioned histories | `to measure Session 16` | Every row has `instrumentSetVersion`. |
| Named primary driver | Largest absolute z-score among eligible instruments | `Session 14 architecture default` | Stable ID tie-break required. |
| Second driver | Second-largest absolute z-score/instrument retained | `Session 14 architecture default` | Missing/not-applicable when fewer than two eligible. |
| Market threshold candidates | legacy raw baseline; empirical channel percentile; raw with base rates/breadth | `to measure Session 16` | Session 17 chooses. |
| Percentile `alpha` | Unset; calculate attainable-alpha sensitivity curves with one common candidate per comparison | `to measure Session 16` | Do not optimize for interesting states. |
| Percentile history type | Expanding versus all feasible rolling histories | `to measure Session 16` | Strictly prior `M` values only. |
| Percentile history length | Unset | `to measure Session 16` | Report stability/coverage surface. |
| Percentile minimum sample | Unset; evaluate feasible requirements | `to measure Session 16` | Low-sample candidates labeled unstable. |
| Percentile quantile definition | Empirical inverse CDF/order statistic candidate; exact canonical method | `to freeze Session 17` | Session 16 records method and strict exceedance. |
| No-look-ahead rule | Threshold at `t` uses only `M(c,s)` where `s < t` | `Session 14 architecture default` | Acceptance assertion required. |
| Percentile fallback | Compare unassessed, legacy-raw fallback, and no-binary-state modes | `to measure Session 16` | No fallback selected. |
| Instrument-set version handling | Same-set/count-conditioned/pooled candidates | `to measure Session 16` | Pooled history cannot be silent. |
| Regime sensitivity | Measure thresholds/base rates over chronological subperiods | `to measure Session 16` | Do not tune to a regime. |
| Breadth numeric definition | Above-threshold count and ratio over eligible instruments | `Session 14 architecture default` | Threshold-specific. |
| Breadth categorical boundaries | Unset | `to measure Session 16` | Compare driver-only, multi-instrument, all-eligible cases. |
| Market-moving base rate | Measure by channel, rule, eligibility, and set version | `to measure Session 16` | No desired rate. |
| Raw market input persistence | Freeze Session 16 responses/normalized series and hashes; long-term policy unset | `to freeze Session 17` | Revision-adjusted sources limit historical reproduction otherwise. |
| Release-vintage handling | Audit-download-vintage disclosure; historical-vintage solution unset | `to freeze Session 17` | No new source in Session 16. |

## 7. Timing, state, comparison, and migration

| Parameter | Current value/candidate | Status | Evidence/decision note |
|---|---|---|---|
| After-close rule | Signal after relevant close is pending until next eligible market observation | `Session 14 architecture default` | Never classify against prior close. |
| Relevant market-close calendars/times | Unset per instrument/channel, especially FRED availability | `to measure Session 16` | Unknown remains ambiguous. |
| Signal timestamp choice | First seen for new event; last material change for escalation/de-escalation | `Session 14 architecture default` | Timestamp precision retained. |
| Timing labels | signal-before-close; signal-after-close-pending; market-move-preceding-signal; signal-followed-by-market-move; ambiguous-timing | `Session 14 architecture default` | Non-causal. |
| Predictive follow-up horizon | Unset; report lags in distinct eligible closes | `to freeze Session 17` | No date-only horizon. |
| V2 four-state names | signal-leading, co-movement, market-only, calm | `Session 14 architecture default` | Documented mapping; legacy names unchanged. |
| Pending/unassessed handling | Outside four-state denominator | `Session 14 architecture default` | Counts reported separately. |
| Direction diagnostics | expected direction, observed direction, consistency | `Methodology 2.1 candidate` | Descriptive only if later adopted; no causality. |
| Parallel success criterion | Auditability/reproducibility/identity/lifecycle/base rates/case review, not row agreement | `Session 14 architecture default` | Agreement remains descriptive. |
| Parallel comparison-period length | Unset; count distinct eligible closes per channel | `to freeze Session 17` | Calendar days alone insufficient. |
| Allowed failed/unassessed run rate | Unset | `to freeze Session 17` | Must be evidence-backed. |
| Cluster/lifecycle acceptance thresholds | Unset; silent mutation and ID reuse always prohibited | `to freeze Session 17` | Session 15 provides observed rates/cases. |
| Cutover/migration contract | Parallel first; preserve legacy history; cut over or reject only after review | `to freeze Session 17` | Session 20 executes decision. |

## 8. Session 17 freeze checklist

Session 17 must not mark this register frozen until it:

1. resolves every `to measure Session 15` item from the Session 15 evidence or explicitly defers it;
2. resolves every `to measure Session 16` item from the Session 16 evidence or explicitly rejects the candidate;
3. assigns values and tests to every required `to freeze Session 17` item;
4. moves accepted values into `methodology/2.0.0/*.json` with hashes;
5. identifies every legacy numeric value retained by v2 versus merely retained as a comparison diagnostic;
6. confirms no Methodology 2.1 candidate was silently pulled into the 2.0 core;
7. records rationale and acceptance fixture for every consequential numeric or categorical cutoff.
