# Corrected Session 17 freeze candidate report

Status: **correction pass after independent PA-08 failure; fresh PA-08 revalidation required; not Session 17 completion**

Methodology candidate: `2.0.0`

The original freeze candidate received independent PA-08 FAIL. This correction pass repairs the six specification defects without changing the frozen signal or market selections. It does not implement signal-v2 or market-v2, publish v2 outputs, change legacy behavior, authorize cutover, or satisfy the required fresh independent post-correction validation.

The failed manifest identity `809fb5119c3634ab6c30349c8b58ef7659effd4b0b227af69186ed876e63bf33` and its three independent PA-08 artifacts remain immutable audit history. The corrected package receives a new manifest identity.

## Preflight

| Check | Result |
|---|---|
| Branch | `master` |
| Full HEAD | `bfce08feece67444ce7fd98ea6fe2b42d15eea24` |
| Short HEAD | `bfce08f` |
| `origin/master` after fetch | `bfce08feece67444ce7fd98ea6fe2b42d15eea24` |
| Merge base | same commit |
| Ahead / behind | `0 / 0` |
| Initial tracked tree and index | clean |
| Initial untracked boundary | 62 Session 16 files; expected ignored Session 15/private preservation evidence also present |
| Pull | not required |
| Global-ignore warning | Git could not read `C:\Users\heyke\.config\git\ignore`; nonblocking and unrelated to repository state |

The remote was fetched. No fast-forward, reset, restore, staging, commit, or push occurred.

## Evidence integrity

- All 19 fixed Session 15 audit artifacts match their recorded SHA-256 identities.
- All 11 verified Session 15 preservation copies match their source sizes and hashes: 597,000 bytes total.
- The complete Session 15 Step-F event-labeling validator passes. Selector and origin-ledger validators pass.
- The Session 16 frozen-input validator passes all 29 files. The input manifest physical SHA-256 is `7386d1297b30f21e1691b3d41884480feb124b3f3cbb6f36b5fa4089cf93d8d6`; canonical self-identity is `308089d94d9b4f5825adb3204b99d3b421c85cd362c6d9e62e261037ff597d1d`.
- Session 16 frozen `metrics.json` and `market-audit-report.md` match `cff404757dfe2daf8ebd404df23726e2c34817373c8a504b1907babe7785fdf4` and `d1c5053561a6034e22eadac91bac9ac606e35b55768ad37225876a2bdbeb80c8`.
- The Methodology manifest records and the validator rechecks 50 exact Session 14-16 evidence-file identities. Private/raw evidence remains private and untracked.

Corrected Session 15 denominators are intentionally separated: `101/428` observations remained unresolved and were not confirmed non-events; `21/123` active clusters had unknown-origin status; exact independent-source count was assessed for `102/123` clusters. Corroboration remains `97` single-origin, `4` corroborated-independent, `1` conflicting, and `21` unknown-origin.

Existing-validator discrepancies were not repaired or concealed:

- The Session 15 extractor's old source snapshot check sees the expected later legacy automation value at `dashboard/public/market-shock.json`; the exact frozen blob remains recoverable at the recorded Session 15 commit.
- The intermediate Step-E clustering helper expects the Step-E ledger prefix and rejects the valid later Step-F suffix; the complete Step-F labeling validator passes the full ledger hash.
- The Session 15 evaluator/finalizer's project-log identity predates later recorded session closeouts, so a current-tree rerun sees the expected project-log drift.
- A Session 16 in-memory rebuild reaches and passes its frozen input and Session 15 boundary checks, then differs in four derived files that embed later mutable project-log/production identities: table 19, legacy reproduction, metrics, and report. The stored frozen files still match their recorded hashes. They were not rewritten.

These are provenance-sensitive rerun differences already explained by continued legacy history, not failures of fixed/private evidence.

## Frozen contract

| Domain | Selection | Evidence or conservative judgment |
|---|---|---|
| Version and isolation | `2.0.0`; future public namespaces `dashboard/public/v2/2.0.0/` and `log/v2/2.0.0/` | Session 14 architecture and explicit Session 17 posture |
| Scoring unit | event cluster; maximum one contribution per cluster/channel/run | 327 accepted observations compressed to 123 clusters, 62.385321% |
| Signal evidence | E2: resolved nonconflicting single origin or independently corroborated origins | Session 15 recommended family; unknown provenance remains nonqualifying |
| Stage | `implemented` and `impact-observed`; `announced` visible but non-elevating | Under E2, relaxing S2 to include announced added 9; no evidence established a safer announced elevation boundary |
| Signal form | structural requirements plus action-stage-descending, eventClusterId-ascending ranking; no scalar | Session 15 Candidate C |
| Disposition | separate from five event leaves; typed unknown; atomic decomposition or explicit unresolved multi-incident | Session 14 schema/protocol plus Session 15 adjudication evidence |
| Clustering | exact incident ID or exact normalized hash only for automatic join; ambiguity persisted for human confirmation | 72.333044% exact-duplicate excess but no calibrated fuzzy error surface |
| Lifecycle | `lastMaterialChangeAt`; repeats change `lastObservedAt` only; no automatic decay/expiry | 184 repeated observations and zero post-initial transitions |
| Own-series transform | current versus fifth prior valid observation; actual dates; 252 transforms; sample SD n−1 | 14/14 z values and 5/5 channel drivers reproduced at published precision |
| Channel dating | independently selected latest same-date cohort; mixed dates forbidden | Selected same-date configurations cover 96.16%-96.93% of 391 evaluation dates with zero mixed-date rows |
| Eligibility | age at most 3 UTC weekdays; all of N=2 and N−1 for N=3/4 | Full 0-5 age and k grids measured; approved conservative default retained |
| Binary market rule | max absolute z strictly above nearest-rank point-in-time 80th percentile | Common `alpha=0.20`; equality does not trigger |
| Threshold history | 126-252 prior observations, conditioned on instrument-set version and eligible count; no fallback | Same-set/count changes measured; raw fallback would change otherwise unavailable states |
| Diagnostics | raw z, driver, second driver, eligible/above counts, breadth; breadth weight zero | Session 16 driver and breadth tables; no calibrated second gate |
| Timing | reliable after-close signal pending one eligible close; unreliable/missing time unknown | 10 definitive and 26 ambiguous Candidate-C E2-S2 timing records; FRED intraday availability unavailable |
| Divergence | `signal-leading`, `co-movement`, `market-only`, `calm`; pending/insufficient/unknown separate | descriptive noncausal state contract; legacy mapping read-only |
| Parallel gate | minimum 30 distinct eligible closes; extension/rejection permitted | approved Session 17 posture and Session 14 parallel protocol |
| Independent gate | separate independent validation must pass before Session 18 begins | this first pass explicitly does not satisfy PA-08 |

## Selected market evidence

The selected configurations are Rule 2 latest-same-date cohorts, maximum age 3 weekdays, same-date gap 0, and the frozen quorum. “Raw” below is the retained `M >= 1.5` diagnostic. “Percentile” is a Session 17 replay over distinct selected-series closes using `alpha=.20`, at least 126 and at most 252 prior observations, and matching instrument-set version plus eligible count.

| Channel | Quorum | Session 16 assessed dates | Distinct closes | Raw diagnostic rate | Percentile available / insufficient | Percentile elevated |
|---|---:|---:|---:|---:|---:|---:|
| Conflict escalation | 3/4 | 379/391 (96.931%) | 361 | 158/361 (43.767%) | 224 / 137 | 56/224 (25.000%) |
| Credit stress | 2/3 | 379/391 (96.931%) | 362 | 69/362 (19.061%) | 231 / 131 | 46/231 (19.913%) |
| Energy disruption | 2/3 | 376/391 (96.164%) | 353 | 108/353 (30.595%) | 220 / 133 | 58/220 (26.364%) |
| Sanctions / policy | 2/3 | 379/391 (96.931%) | 361 | 117/361 (32.410%) | 231 / 130 | 69/231 (29.870%) |
| Supply chain | 2/2 | 379/391 (96.931%) | 361 | 81/361 (22.438%) | 235 / 126 | 73/235 (31.064%) |

The common alpha does not force equal trigger rates. The remaining variation is disclosed evidence, not a target to tune away. Insufficient conditioned history stays insufficient; the raw diagnostic never substitutes for the percentile decision.

## Exact numeric parameters

| Parameter | Frozen value | Justification |
|---|---:|---|
| Valid-observation transform lookback | 5 | reproduced Session 16/legacy transform; actual spans were 5-12 calendar days |
| Own-series z history | 252 transforms | reproduced scale and adequate history for all 14 frozen instruments |
| SD degrees-of-freedom adjustment | 1 | sample SD reproduced legacy calculation |
| Same-date gap | 0 weekdays | no mixed-date binary statistic |
| Freshness maximum | 3 weekdays | conservative approved point in measured 0-5 grid; selected coverage remains at least 96.16% |
| Quorum | 2/2, 2/3, 3/4 | all for two-name channels, N−1 otherwise |
| Raw z diagnostic | 1.5 | retained legacy diagnostic only |
| Alpha / quantile | .20 / .80 | approved common point-in-time percentile |
| Conditioned history | minimum 126, maximum 252 prior closes | approved half/full-year starting range; no fallback |
| Breadth binary weight | 0 | diagnostic only |
| Persisted/display precision | 12 / 3 decimals | high-precision persisted diagnostics; legacy-compatible display only |
| Maximum cluster/channel/run contribution | 1 | removes report duplication |
| Minimum independent origins for corroboration | 2 | E2 independent path requires genuinely distinct assessed origins |
| Parallel minimum | 30 distinct eligible closes | minimum, not forced cutover |
| Required separate independent pass | 1 | blocks Session 18 until recorded |

Every domain numeric constant is present in `parameters.json`; clustering similarity, event decay, storage retention, and lock timeouts are deliberately null/deferred rather than hidden in prose or validation code.

## Bounded deferrals and blocking effect

| ID | Deferred choice | Safe implementation behavior | Blocking effect | Future gate |
|---|---|---|---|---|
| DEF-001 | event decay/stale/expiry/de-escalation expiry | no decay or expiry; continuing visible but non-elevating; explicit transitions only | parallel implementation allowed; any auto-decay requires a new version | post-parallel methodology review |
| DEF-002 | fuzzy clustering thresholds/windows | exact-match automatic joins only; persist and adjudicate ambiguity | parallel allowed; broader automation prohibited; unrecorded ambiguity blocks cutover | PA-04 and independent validation |
| DEF-003 | durable backend, retention, tiering, DR/SLA | access-controlled immutable local storage, hashes, no pruning/public copy | parallel allowed; cutover blocked | PA-09 |
| DEF-004 | stale-lock timeout/takeover | existing exclusive lock blocks; human recovery starts a new run | single-writer parallel allowed; automatic takeover prohibited | Session 18 review and PA-02 |
| DEF-005 | complete holiday/early-close and provider availability data | UTC weekday convention; unreliable timing unknown; reliable after-close pending | parallel allowed; material unknown coverage may extend/reject and block cutover | PA-06/07 and independent validation |
| DEF-006 | provider-specific raw retention permission | private raw where permitted; otherwise lossless normalized evidence plus retrieval identity; irreproducible runs ineligible | permitted-source parallel allowed; nonreproducible cutover blocked | PA-05/09 |

`deferred-items.json` records for every row the evidence insufficiency, safe Session 18/19 behavior, implementation/cutover effect, evidence needed, and responsible future gate.

## Files created

Methodology package:

- `methodology/2.0.0/manifest.json`
- `methodology/2.0.0/schema.json`
- `methodology/2.0.0/enums.json`
- `methodology/2.0.0/parameters.json`
- `methodology/2.0.0/leaf-channel-map.json`
- `methodology/2.0.0/source-origin-rules.json`
- `methodology/2.0.0/clustering-lifecycle-rules.json`
- `methodology/2.0.0/storage-migration-contract.json`
- `methodology/2.0.0/parallel-acceptance.json`
- `methodology/2.0.0/README.md`
- `methodology/2.0.0/fixtures/positive.json`
- `methodology/2.0.0/fixtures/negative.json`

Session 17 audit records:

- `audit/session17/freeze-report.md`
- `audit/session17/parameter-traceability.json`
- `audit/session17/decision-register.json`
- `audit/session17/deferred-items.json`
- `audit/session17/validation-report.md`
- `audit/session17/validate-freeze.mjs`

## Boundary and current status

The project log, production scripts, workflows, `dashboard/public/`, `docs/`, `log/`, `runs/`, legacy snapshots, and private Session 15/16 evidence were not edited. No dependency was added. No signal-v2 or market-v2 behavior was implemented. Nothing was staged, committed, pushed, or published.

This is the **Session 17 freeze candidate**, not a completed Session 17. The next permitted action is a separate independent post-freeze validation. Session 18 remains blocked until that pass is recorded successfully.
