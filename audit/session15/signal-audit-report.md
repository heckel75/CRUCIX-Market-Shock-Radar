# CRUCIX Session 15 signal audit report

Status: completion-gate report. This document summarizes persisted Session 15 signal evidence. It does not select or implement Methodology 2.0 production behavior.

Numeric claims resolve to `audit/session15/metrics.json` or the frozen artifacts identified in Section 22. Percentages below state their numerator, denominator, exclusions, and treatment of unknowns either inline or by direct reference to the matching measurement row in `metrics.json`.

## 1. Executive summary

Session 15 is complete with explicit limitations. The audit reconstructed 1,153 fidelity-B candidate observations from 28 retained payload identities at 27 timestamps and retained 64 fidelity-C selected-output supplements, for 1,217 audit records. Fidelity C remains separate because it is not a complete candidate population and has no supported chronology.

The deterministic 428-observation manual set produced 327 accepted assignments and 123 active event clusters; 101 observations remain unresolved. The fidelity-B census contained 834 exact duplicate excess observations out of 1,153 (72.333044%; no exclusions; all comparison hashes assessed). Within accepted manual assignments, 327 observations compressed to 123 clusters, a reduction of 204/327 (62.385321%); the 101 unresolved observations were excluded rather than forced into clusters.

Armed-conflict actions remain the largest cluster-level event type at 78/123 (63.414634%; 20 unknown-type clusters remain in the denominator). The largest parent contains 43/123 clusters (34.959350%), while the top assessed source origin contributes 28/341 assessed-origin observations (8.211144%; 87 unknown-origin observations excluded) and assessed-origin HHI is 0.018670290. The remaining conflict concentration therefore persists after duplication and event clustering and is not supported as primarily a one-origin duplication effect.

Signal-elevation sensitivity favors Session-17 review of a structural gate with transparent ranking, not a stage-only scalar gate. Candidate B adds no eligibility distinction beyond a matched stage set once Candidate A's lifecycle clause is removed. E1 is sparse; E3 adds only 4–5 Candidate-A rows but 30–32 Candidate-B rows beyond E2, raising an unresolved-provenance tradeoff. The implemented-versus-impact boundary is the largest stage discontinuity; announced-stage inclusion remains a substantive policy decision. No final rule is selected.

The lifecycle architecture is supported: 184/327 accepted observations (56.269113%; 51 lifecycle-unknown observations remain in the denominator) advanced `lastObservedAt` without advancing `lastMaterialChangeAt`. No post-initial material escalation or de-escalation was observed, so no numeric decay rate, stale interval, or de-escalation expiry can be calibrated.

## 2. Scope and evidence fidelity

The audit uses five evidence strata from the frozen manifest:

- Fidelity A, canonical candidate archive: absent; zero files.
- Fidelity B, reconstructable run input: 11 retained source files containing 28 distinct timestamp-and-payload-hash identities. This is a complete census only for the frozen current legacy extractor over those retained payloads.
- Fidelity C, selected-output-only: 16 files yielding 64 audit observations. This is a selection-biased supplement, never a complete-run denominator.
- Fidelity D, metadata-only: 37 files used for inventory/run evidence only.
- Fidelity E, unusable: zero files.

No canonical historical candidate archive existed. The equal timestamp `2026-06-23T15:57:42.421Z` contains two different canonical payload hashes, and both identities remain separate. Fidelity-B extraction reproduces the frozen current legacy script; it does not prove that the same script revision ran historically at every retained timestamp. Publication/event timestamps are absent, and fidelity-C chronology is unknown.

Semantic clustering covers only the deterministic 428-observation manual set: 364 B observations and 64 C observations. Its enrichment toward reproduced top-15 observations and unmatched controls means event-type, mechanism, and corroboration prevalence are not random population estimates. No market evidence, causal relevance test, or predictive test is part of this audit.

## 3. Frozen input inventory

The manifest records 64 original evidence files: 11 B, 16 C, and 37 D. All 64 current source files matched their recorded byte counts and SHA-256 hashes. The preservation area contains 11 verified byte-identical copies totaling 597,000 physical bytes; it was inspected only for size and preservation validation and was not altered.

The frozen repository HEAD is `5ababb0101ae26254962621357b4a1f5380e5560`. The input-manifest physical hash is `95fe87b181f4a714a4571960fc6fca03fa62c96a94b82b4920c0a471a5767f0c`; its canonical self-hash is `3a864319add335d4f2fb3550fa8b865a6282d29f4a37819200e516106cdf3651`. Complete hashes appear in Section 22 and `metrics.json`.

## 4. Candidate duplication

| Stratum | Observations | Unique conservative contents | Exact duplicate excess | Exact duplicate rate |
|---|---:|---:|---:|---:|
| B reconstructable census | 1,153 | 319 | 834 | 834/1,153 = 72.333044% |
| C selected supplement | 64 | 46 | 18 | 18/64 = 28.125000% |
| Manual set | 428 | 163 | 265 | descriptive only; C remains a supplement |

For B and C, conservative exact, lowercase-comparison, and legacy-canonical comparisons produce the same duplicate excess within this sample. No records are excluded because every candidate carries the required hashes; unknown comparison status is zero. These figures measure publication/content identity, not semantic event identity.

Among accepted manual assignments, 143 unique normalized contents map to 123 clusters: 20/143 (13.986014%) unique-content excess after clustering, excluding 20 unresolved normalized contents. The smaller semantic reduction relative to publication duplication shows why exact deduplication and event clustering must remain separate operations.

## 5. Source-origin normalization

The 428 manual observations involve 16 reporting sources, 121 distinct assessed source origins, and 138 assessed independence groups. Specific origin is assessed for 341 observations and unknown for 87. Independence group is assessed for 415 observations; 13 remain unresolved provenance singletons.

Resolution differs materially by fidelity:

- B: 307/364 assessed origins (84.340659%); 57 unknown remain in the denominator.
- C: 34/64 assessed origins (53.125000%); 30 unknown remain in the denominator.

The largest assessed origin accounts for 28/341 observations (8.211144%); 87 unknown-origin observations are excluded rather than represented as artificial distinct origins. Assessed-origin HHI is 0.018670290. The optional independence-group diagnostic uses 415 assessed-group observations, excludes 13 unresolved singletons, and yields HHI 0.018272609.

Derivation and origin diagnostics use all 428 observations as denominator: 11/428 are assessed as `syndicates` (2.570093%), 58/428 as `reposts` (13.551402%), 371/428 belong to 94 reviewed multi-observation syndication families (86.682243%), 165/428 have official-statement origin type (38.551402%), and 87/428 have unknown origin (20.327103%). Unknown derivation/origin remains in each denominator and is not treated as a negative result.

Two observation rows, representing one provenance-conflict case, carry conflict evidence. Correction state is unknown for all 428 observations. The zero confirmed corrected and retracted counts are therefore confirmed-case counts only; they do not establish that corrections or retractions never existed.

## 6. Manual event clustering

The append-only assignment ledger contains 560 records: 428 first-pass records and 132 appended superseding adjudication records. Current view resolution yields 327 accepted and 101 unresolved assignments. There were 132 initial needs-adjudication proposals across 41 normalized contents, organized into 35 grouped adjudication cases. No merge, split, or lexical tie-break occurred.

Accepted assignment methods, denominator 327 accepted assignments and excluding 101 unresolved assignments, are:

- exact normalized content: 184/327 (56.269113%);
- explicit incident/source identifier: 8/327 (2.446483%);
- manual identity tuple: 135/327 (41.284404%);
- tie-break: 0/327 (0%).

The unresolved rate is 101/428 (23.598131%; no exclusions; unresolved is the numerator, not a non-event label). Five unresolved grouped cases explicitly contain multiple incidents. The schema cannot distinguish “no discrete episode,” “multi-incident candidate,” and “discrete episode with unresolved identity”; a true non-event count is therefore not measurable.

The 123 active clusters comprise 90 B-only, 31 C-only, and 2 mixed clusters. Assigned observations compress at 327/123 = 2.658537 observations per cluster. Reproduced legacy-selected observations separately yield 253 assigned observations, 25 unresolved observations, and 83 represented clusters: 253/83 = 3.048193 assigned observations per cluster. No semantic compression is extrapolated across the full 1,153-record B census.

Seven assessed parent series cover 99 clusters; 18 clusters are standalone and 6 have unknown parent relationship. Parent child counts range from 2 to 43, with median 2. The largest parent has 43 children and remains a parent/navigation object, not a scored cluster.

Recurring-content stability is partial because only the manual set has semantic assignments. The B census has 119 normalized contents present in more than one retained run; 76 are covered by manual assignments. Of those 76, 69 have all accepted occurrences in one cluster, zero split across active clusters, and 7 have unresolved/no accepted occurrences. Forty-three recurring B contents remain outside semantic coverage. Sixty-six active clusters span more than one retained B run, but only one spans more than one supported UTC observation date.

The evidence supports a deterministic high-confidence path for exact/explicit-ID cases plus a persisted assisted or human adjudication path for ambiguity. It does not establish that model assistance is automatically required.

## 7. Taxonomy/action-stage findings

Event-type distribution across 123 active clusters is:

| Event type | Clusters | Share/handling |
|---|---:|---|
| armed-conflict-action | 78 | 78/123 = 63.414634% |
| policy-restriction-action | 5 | 5/123 = 4.065041% |
| energy-system-event | 9 | 9/123 = 7.317073% |
| financial-distress-event | 0 | 0/123 = 0% |
| production-logistics-event | 11 | 11/123 = 8.943089% |
| unknown | 20 | 20/123 = 16.260163%; explicit unknown category |

All 123 clusters remain in these denominators. The zero financial-distress count is a sample result, not proof that the leaf is unnecessary. The 20 unknown clusters and the unresolved candidate-disposition gap make the five-leaf vocabulary insufficient to freeze unchanged. Session 17 should review/amend the minimal vocabulary and add a candidate-disposition concept; this report does not propose a replacement taxonomy. Broader ontology expansion can remain deferred to 2.1 unless additional evidence makes it essential.

Action stages are 8 rhetoric, 5 threatened, 10 announced, 49 implemented, 46 impact-observed, and 5 unknown. Stage is assessed for 118/123 clusters and unknown for 5/123. These are persisted furthest directly evidenced stages, not full historical transition records.

## 8. Mechanism/directness findings

Each cluster has one assessment for each of five mechanisms:

| Mechanism / channel | Direct | Contextual | None |
|---|---:|---:|---:|
| security-risk-repricing / conflict | 88 | 21 | 14 |
| trade-asset-access-restriction / sanctions | 9 | 8 | 106 |
| energy-supply-disruption / energy | 14 | 7 | 102 |
| funding-credit-transmission / credit | 6 | 7 | 110 |
| production-transport-bottleneck / supply chain | 23 | 6 | 94 |

The denominator for every row is 123 active clusters; all values are assessed and no unknowns are excluded. Direct shares are respectively 88/123 (71.544715%), 9/123 (7.317073%), 14/123 (11.382114%), 6/123 (4.878049%), and 23/123 (18.699187%).

Twenty-four clusters have zero direct mechanisms, 70 have exactly one, and 29 have more than one; the maximum is three. Twenty-one of the 24 zero-direct clusters have at least one contextual mechanism. Direct channel opportunities are 88 conflict, 9 sanctions, 14 energy, 6 credit, and 23 supply-chain. These are mechanism/channel opportunities, not elevations.

## 9. Corroboration findings

Exact independent-source count is assessed for 102 clusters and unknown for 21. The assessed exact distribution is 97 with one, 2 with two, 2 with three, and 1 with four independent sources. Conservative lower bounds are assessed separately for all clusters: 10 at zero, 108 at one, 2 at two, 2 at three, and 1 at four.

Corroboration status across 123 clusters is 97 single-origin, 4 corroborated-independent, 1 conflicting, 21 unknown-origin, and 0 retracted-only. B-only composition is 79 single-origin, 4 corroborated-independent, 1 conflicting, and 6 unknown-origin. C-only plus mixed composition contributes 18 single-origin and 15 unknown-origin clusters. Unknown-origin is an explicit assessed corroboration result rather than a dropped record.

Independence metrics are meaningful for assessed origins and conservative lower bounds, but exact counts, correction state, and C provenance must remain wrapped/unknown where unresolved.

## 10. Lifecycle and clock findings

At cluster level, lifecycle is 23 new, 66 continuing, 0 escalating, 0 de-escalating, and 34 unknown. At observation level across 327 accepted assignments, it is 92 new, 184 continuing, 0 escalating, 0 de-escalating, and 51 unknown.

The 184 continuing observations that do not change material state affect 68 clusters. They update `lastObservedAt` but not `lastMaterialChangeAt`. Ninety-two initial observations initialize the material clock; zero later observations advance it. This supports `lastMaterialChangeAt` as the correct decay clock and demonstrates that a last-observed clock would be refreshed by repeated publication.

No post-initial escalating or de-escalating transition was observed. The maximum assessable first-to-last interval is 172,133,333 milliseconds, but recurrence intervals without material transitions cannot calibrate decay. No numeric decay function/rate, stale-event interval, or de-escalation contribution/expiry is recommended.

## 11. Signal-elevation sensitivity

Step G evaluates 28 retained B payload identities at 27 timestamps. Accepted B observations collapse to 265 unique cluster/run cases and 295 point-in-time direct cluster/run/channel opportunities, representing 92 clusters. Fourteen within-cluster/run repeat observations are collapsed before channel evaluation. Fidelity-C chronology is excluded: 31 C-only clusters and 46 C-only accepted observations do not enter historical runs; two C observations in two mixed clusters are ignored for chronology.

Candidate-A structural counts and matched no-lifecycle/Candidate-B counts are:

| Variant | A with lifecycle | A without lifecycle | Matched B | A distinct clusters |
|---|---:|---:|---:|---:|
| E1-S1 | 2 | 4 | 4 | 1 |
| E1-S2 | 4 | 7 | 7 | 3 |
| E1-S3 | 4 | 7 | 7 | 3 |
| E1-S4 | 4 | 7 | 7 | 3 |
| E1-S5 | 4 | 8 | 8 | 3 |
| E2-S1 | 40 | 125 | 125 | 30 |
| E2-S2 | 82 | 231 | 231 | 62 |
| E2-S3 | 91 | 247 | 247 | 68 |
| E2-S4 | 92 | 255 | 255 | 69 |
| E2-S5 | 93 | 258 | 258 | 70 |
| E3-S1 | 44 | 155 | 155 | 32 |
| E3-S2 | 86 | 261 | 261 | 64 |
| E3-S3 | 95 | 277 | 277 | 70 |
| E3-S4 | 97 | 287 | 287 | 72 |
| E3-S5 | 98 | 290 | 290 | 73 |

Candidate B is a stage-only scalar representation of the same stage boundaries. In every matched comparison, A-only eligibility is zero; B-only rows equal those removed solely by Candidate A's lifecycle clause. The largest lifecycle reduction is 192 rows for A-E3-S5, or 192/290 = 66.206897% relative to its no-lifecycle result. With no post-initial material transitions, this clause acts primarily as first-observation gating in the retained sample.

Evidence sensitivity is discontinuous. E1→E2 adds 38–89 A rows and 121–250 B rows across stage variants. E2→E3 adds only 4–5 A rows but 30–32 B rows. E1 is too sparse to be operationally informative in this sample. Session 17 should prioritize E2-family review and decide whether E3's added unresolved-provenance complexity is justified.

The largest stage change is S1→S2: 42 A rows and 106 B rows under E2 and E3. S2→S3 adds 9 A and 16 B rows, so announced-stage inclusion remains substantive. Later boundaries add only 1–2 A and 3–10 B rows depending on evidence variant.

Candidate C has identical eligibility to A and adds deterministic stage-based ranking. Across 140 run/channel cells and 15 variants, 99 cells have no leader in any variant, 39 have exactly one distinct leader, and 2 have multiple leaders. There is one adjacent non-null leader change. Ranking ties remain visible; ranking never adds eligibility or lets repeated publication add severity. Structural eligibility plus transparent ranking is therefore the leading family for Session-17 review, but it is not selected as production behavior here.

No-look-ahead direct-mechanism and stage timing-censor counts are zero because Step-F evidence references are broad final cluster evidence. That does not mean earlier lower stages are reconstructable. Point-in-time corroboration does matter: naive final-state back-projection changes 113 variant-row memberships across 26 variants and 10 distinct rows. Session 17 should require prospective point-in-time stage, conflict, and corroboration history.

## 12. Legacy-selected comparison

The comparison reproduces the frozen current legacy script over retained inputs; it is not exact historical legacy output. Of 278 reproduced selected observations, 253 are assigned and 25 unresolved, representing 83 clusters.

The assigned selected observations create 294 point-in-time direct observation/channel occurrences but only 274 unique cluster/run/channel cases: 20 occurrences collapse, involving 13 distinct observation IDs. Thirty-nine assigned selected observations have zero direct mechanism. At cluster level, 14 of 83 represented clusters are zero-direct, 13 are contextual-only, and 1 is all-none. No selected observation is censored because final direct evidence appears only later under the retained evidence-reference scheme.

Under Candidate A, qualifying selected-observation counts range from 3 to 74 across the 15 variants; under Candidate B they range from 6 to 209. Full per-variant observation, cluster, channel-occurrence, collapse, and blocker counts are in measurement 22 of `metrics.json`.

## 13. Unmatched-control findings

The deterministic control set contains 81 observations. Twenty-four are assigned, 57 unresolved, and the assigned observations represent 10 clusters. Twenty assigned controls carry point-in-time direct mechanisms across 7 clusters; all 20 have implemented/impact stage and resolved evidence.

The strictest A-E1-S1 rule qualifies 1 control observation in 1 cluster; A-E1-S2 also qualifies 1 in 1 cluster. Under E2, Candidate A qualifies 4 observations/4 clusters at S1 and 7/7 at S2–S5; Candidate B qualifies 7–20 observations across 4–7 clusters depending on cutoff. The same A/B counts apply under E3 for these controls.

Controls were selected by deterministic enrichment, not random sampling. These values are not a population false-negative estimate.

## 14. Geopolitical/concentration analysis

Conflict-related material still dominates at the event-cluster level: 78/123 active clusters are `armed-conflict-action` (63.414634%). This leaf is narrower than the old broad `Geopolitical Escalation` category and must not be treated as identical to it. Among 83 legacy-represented clusters, 58 are armed-conflict actions, while 13 have unknown event type.

Concentration also appears in parent structure: the largest parent contains 43/123 active clusters (34.959350%). Yet assessed-origin concentration is comparatively diffuse: the top origin is 28/341 assessed-origin observations (8.211144%) and HHI is 0.018670290. Publication duplication is high in the B census at 834/1,153 (72.333044%), and manual assigned observations compress 327→123, but conflict remains 78 clusters after this compression.

The evidence therefore supports two simultaneous findings: publication duplication is material, and armed-conflict concentration remains material after it is removed. The evidence does not support attributing the remaining cluster-level concentration primarily to source duplication.

## 15. Storage-growth and retention evidence

Observed fidelity-B payload and audit-record distributions across 28 payload identities are:

| Measure | Minimum | Median | Mean | P90 | P95 | Maximum |
|---|---:|---:|---:|---:|---:|---:|
| canonical serialized payload bytes/run | 5,120 | 6,080.5 | 10,760.785714 | 8,591 | 8,691 | 120,355 |
| audit candidate JSONL bytes/run | 194,743 | 236,951 | 336,875 | 395,597 | 403,336 | 1,736,697 |
| candidates/run | 24 | 29 | 41.178571 | 49 | 49 | 203 |

Percentiles use nearest rank. The maximum reflects the retained full-source payload identity; a same-timestamp reduced payload remains a separate identity. Physical sizes of major audit artifacts are: candidate observations 9,992,126 bytes; source-origin ledger 3,929,432; assignment ledger 3,393,084; event-cluster ledger 2,222,512; sensitivity artifact 5,759,277; manual set 1,488,128; inventory plus manifest 581,762; adjudication notes 46,006; helper scripts 433,360; preservation copies 597,000.

Using audit candidate-record bytes only, one persisted transaction/day projects to:

- 30-run month: 7,108,530 bytes at the observed median or 10,106,250 at the mean;
- 365-run year: 86,487,115 bytes at the median or 122,959,375 at the mean.

No duplicate bytes are deducted because immutable observations are required for reproducibility. These values exclude final production schema changes, assignment records, indexes, compression, backups, and tiering and are not a capacity guarantee.

The median within-day retained interval is 900,008.5 milliseconds across 18 intervals, implying the formula `86,400,000 / 900,008.5` runs per 24 hours. It is not annualized because historical capture is sparse across dates and bursty within dates. The generic projection remains `observedMeanOrMedianBytesPerRun × persistedRunsPerDay × periodDays`.

At the measured scale, immutable candidate and assignment retention appears operationally plausible. Session 17 must still freeze cadence, final schema, access-controlled backend/tiering, backups, and source-term handling. Raw source payloads, full URLs, reviewer identifiers, and record-level private evidence should remain private/access-controlled.

## 16. Reproducibility assessment

The finalizer recalculates `metrics.json` from persisted artifacts, verifies 64 frozen source files, verifies 11 preservation copies, checks manifest self-hash, checks all fixed artifact hashes, validates the Step-E prefix and Step-F suffix independently, and builds twice in memory. A second process invocation reproduces byte-identical output.

The manual selector, candidate extractor, source-origin validator, Step-F complete-ledger validator, and Step-G evaluator reproduce their applicable frozen outputs. The Step-E clustering helper is intentionally a pre-Step-F validator: a direct complete-file comparison fails after the valid Step-F suffix is appended. Reproducibility of the completed ledger is instead established by the frozen Step-E prefix hash plus the Step-F validator's deterministic suffix/full-ledger checks. This scope distinction is expected, not evidence corruption.

The audit supports the architecture equation “normalized candidates + persisted origin assignments + persisted cluster assignments + frozen configuration = reproducible canonical output.” Production canonicalization, array ordering, self-hash envelopes, and same-timestamp identity rules remain Session-17 decisions.

## 17. Limitations and representativeness

- No canonical historical candidate archive existed.
- Only 28 B payload identities across 27 timestamps were reconstructable; one timestamp has two payload hashes.
- B extraction reproduces the frozen current script, not necessarily each historical revision.
- Fidelity C is selected-output-only and chronology-ineligible.
- Publication and real-world event timestamps are missing.
- Semantic clustering covers 428 selected observations, not the full 1,153 B census.
- The deterministic manual set is enriched toward reproduced top-15 rows and controls; prevalence is not a random population estimate.
- One hundred one observations remain unresolved and are not confirmed non-events.
- Step-F stage is final/furthest-stage evidence, not a complete transition history.
- No post-initial material transitions were observed.
- Zero direct/stage timing-censor cases reflect broad final evidence references, not complete historical stage evidence.
- No market evidence, causal market relevance, population false-negative rate, or predictive performance is measured.

## 18. Session-17 recommendations

No recommendation is production-frozen. The full structured versions are in `metrics.json`.

| Parameter/question | Session-15 evidence | Status | Session-17 action | Confidence/limitation | Delivery |
|---|---|---|---|---|---|
| Candidate disposition | 101/428 unresolved; three unresolved meanings conflated | recommend-for-session17-review | Add explicit disposition/non-event representation | Gap is clear; exact disposition counts unavailable | required for 2.0 |
| Five-leaf vocabulary | 20/123 unknown; zero financial-distress clusters | recommend-for-session17-review | Review/amend before freeze; preserve unknown | Enriched sample; do not infer population prevalence | required for 2.0 |
| Clustering path | 184 exact, 8 explicit-ID, 135 manual accepted; 101 unresolved | architecture-supported | Deterministic high-confidence plus persisted assisted/human path | Production error rate unmeasured | required for 2.0 |
| Origin/independence schema | 341/428 origins assessed; 121 origins vs 138 groups | architecture-supported | Keep separate wrapped fields | C is materially less resolved | required for 2.0 |
| Correction state | 428/428 unknown | insufficient-evidence | Keep wrapper; collect prospective evidence | No prevalence calibration | required for 2.0 |
| Independent-source lower bound | 102 exact counts; 123 lower bounds | architecture-supported | Persist exact and lower-bound values separately | 21 exact counts unknown | required for 2.0 |
| Directness gate | 24/123 zero-direct; 21 contextual | architecture-supported | Retain per-mechanism directness; decide qualifying rule | Fully assessed in sample | required for 2.0 |
| Evidence sufficiency | E1 sparse; E3 adds 4–5 A and 30–32 B beyond E2 | recommend-for-session17-review | Prioritize E2-family review; assess E3 complexity | Retained B chronology only | required for 2.0 |
| Stage boundary | S1→S2 +42 A/+106 B; S2→S3 +9/+16 | recommend-for-session17-review | Decide announced inclusion explicitly | Full transition histories absent | required for 2.0 |
| Structural vs scalar | Matched B equals A without lifecycle | architecture-supported | Prefer structural-family review; do not port stage-only score | Richer scalar components untested | required for 2.0 |
| Candidate-C ranking | Same eligibility as A; one non-null leader change | architecture-supported | Review transparent ranking and tie display | Ranking is stage-only | required for 2.0 |
| Lifecycle semantics | 184 repeats without material change; zero later transitions | architecture-supported | Keep clocks and lifecycle vocabulary | Transition calibration absent | required for 2.0 |
| Decay rate | Zero post-initial material transitions | insufficient-evidence | Leave numeric rate unset | Not empirically calibratable | required for 2.0 |
| Stale-event rule | Recurrence but no material-expiry behavior | insufficient-evidence | Leave threshold unset pending prospective evidence | Silence is not staleness | required for 2.0 |
| De-escalation expiry | Zero post-initial de-escalations | insufficient-evidence | Preserve representation; no numeric expiry | No observed cases | required for 2.0 |
| Point-in-time stage history | Zero censor count caused by broad final references | recommend-for-session17-review | Persist transitions prospectively | Earlier stages unreconstructable | required for 2.0 |
| Point-in-time conflict/corroboration | 113 membership differences, 10 rows, 26 variants | recommend-for-session17-review | Persist point-in-time evidence/conflict state | B chronology only | required for 2.0 |
| Mixed/C-only chronology | 31 C-only clusters excluded; 2 mixed C observations ignored | recommend-for-session17-review | Keep excluded; collect timestamps prospectively | Historical order unavailable | required for 2.0 |
| Parent shape | 7 parents; largest 43/123; 18 standalone; 6 unknown | architecture-supported | Keep one optional parent | General hierarchy shape unproven | deferable to 2.1 |
| Multi-incident candidates | Five unresolved grouped cases | recommend-for-session17-review | Choose atomic decomposition or multiple edges | Lower-bound case count | required for 2.0 |
| Storage/tiering | Audit-record year at one/day: 86.49–122.96 MB | recommend-for-session17-review | Choose access-controlled backend after review | Schema/cadence/backups unset | required for 2.0 |
| Raw retention | 72.333044% B duplicate excess, but immutable evidence needed | architecture-supported | Retain observations/hashes; do not discard duplicates | Redistribution rights unestablished | required for 2.0 |
| Public/private boundary | Raw evidence vs aggregate metrics/report | architecture-supported | Track aggregates only after review; raw stays controlled | Source terms not inferred | required for 2.0 |
| Canonical ordering/hashing | 28 hashes at 27 timestamps; one timestamp conflict | recommend-for-session17-review | Freeze canonical JSON, ordering, identity, and self-hash rules | Audit rule is not production standard | required for 2.0 |

## 19. Items explicitly NOT decided

Session 15 does not decide or implement:

- a final signal-elevation rule or candidate variant;
- a scalar event score, components, weights, caps, or cutoff;
- an evidence threshold, stage threshold, or single-origin exception;
- a numeric decay function/rate, stale-event interval, or de-escalation expiry;
- a production cluster similarity rule, window, or threshold;
- a production event vocabulary amendment;
- a persistent registry, v2 assignment format, or production output namespace;
- a storage backend, tiering policy, or ingestion cadence;
- market-data methodology, market state logic, timing cutoff, or threshold;
- any Methodology 2.0 production schema/configuration artifact.

## 20. Completion checklist

| Check | Result |
|---|---|
| Frozen manifest/source hashes unchanged | PASS: 64/64 source files verified |
| Preservation copies unchanged | PASS: 11/11; 597,000 bytes |
| Selection logic reproduces manual set | PASS |
| Fidelity strata separate | PASS |
| Raw candidates fabricated | PASS: none fabricated |
| Exact duplication separate from event clustering | PASS |
| Reporting source separate from source origin | PASS |
| Active clusters assessed | PASS: 123/123 |
| Unresolved observations explicit | PASS: 101 |
| Assignment/correction history append-only | PASS: 560 records, 132 superseding records |
| Event cluster separate from parent series | PASS |
| Lifecycle clocks use retained eligible evidence | PASS |
| Required measurements | PASS: 26/26 present; 20 measured, 6 partial |
| Partial/unmeasurable submetrics explained | PASS: true non-event and production assignment/capacity projection unavailable |
| Storage evidence avoids production-schema claims | PASS |
| Recommendations evidence-backed and not frozen | PASS |
| Privacy/source-term classification explicit | PASS |
| Metrics/report contain no raw candidate text or full private URLs | PASS |
| Production/historical/workflow/market files changed | PASS: none |
| Stage/commit/push | PASS: none performed |

Completion-gate status: **PASS with explicit partial measurements and limitations.**

## 21. Artifact/privacy classification

Redistribution rights for retained source text were not affirmatively established, and no web/source-terms research was used. Reproducibility can be preserved by tracking hashes, aggregate metrics, and sanitized narrative while keeping underlying raw evidence private.

| Classification | Artifacts |
|---|---|
| private/raw evidence — do not stage | `candidate-observations.jsonl`; preservation directory |
| needs explicit source-term/privacy review before tracking | `inventory.json`; `manual-audit-set.jsonl`; `source-origin-ledger.jsonl`; `assignment-ledger.jsonl`; `event-cluster-ledger.jsonl`; `adjudication-notes.md`; source-origin, event-clustering, and event-labeling validators with curated decisions |
| sanitized/aggregate candidate for tracking | `input-manifest.json`; `signal-elevation-sensitivity.json`; `step-c-missing-time-decision.md`; `metrics.json`; this report |
| code/helper candidate for tracking | candidate extractor; manual selector; elevation evaluator; final aggregator |

This classification is pre-commit guidance only. It does not authorize staging or publication, and no file was staged.

## 22. Provenance and hashes

Governing documents:

| Artifact | SHA-256 |
|---|---|
| `CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md` | `62a7284c36bbd4bfe59f0a90749ab506de7619b9359c078bebf17ed739c05751` |
| `audit/session14-signal-audit-protocol.md` | `6d29f97737a3b9d589c826846613863699cdbc5e4e90e88aba65d815dfd9d670` |
| `audit/session14-architecture-decision.md` | `f1d0bf58f255ed144ea30b445fd9ef7efb05b7ae71ef4797505eff8d135fa321` |
| `audit/methodology-2-core-schema-draft.md` | `d32a00a572c4d01e390839b1cc5375c03d8b692fa6450cc42a6e0fcf21706bb2` |
| `audit/methodology-2-parameter-register.md` | `5d60242eee78462d0e482c81d77821680f9e0b2f89c8b05b78e75eeeba1651f7` |

Session-15 input artifacts:

| Artifact | SHA-256 |
|---|---|
| `inventory.json` | `26388dace6653546f6f6442e7405ceb9f344d01ee33ff01d1625f5efe81b884e` |
| `input-manifest.json` physical | `95fe87b181f4a714a4571960fc6fca03fa62c96a94b82b4920c0a471a5767f0c` |
| input-manifest canonical self-hash | `3a864319add335d4f2fb3550fa8b865a6282d29f4a37819200e516106cdf3651` |
| `candidate-observations.jsonl` | `36604f9ea997335f3d9c368c0c76135b37babd797805180c1e27568a1b8ab69e` |
| `manual-audit-set.jsonl` | `5662b5642e5c3dcec1f92c7baefb1312768a58574ad09a350bc8dfe09161dc45` |
| `source-origin-ledger.jsonl` | `05b479b7e1dc244dd10c0594722f88dd649428b46421e5990c729d2eaee8cc42` |
| `assignment-ledger.jsonl` | `e7454a9b437cf9cf94e188dde5846ec83b41a67aae02b6e5c837fe7e103f47b5` |
| `event-cluster-ledger.jsonl` | `eabad73ae8b9f4c8ac06a2c5e1d80b8bcd8a4d7c40dc0c03d014b7e855236768` |
| `signal-elevation-sensitivity.json` | `ed935b9644e4038ef0735c3a6ff79aa675fb16e42dce97abb079482b3ef624a9` |
| `adjudication-notes.md` | `80e8fc09de55b47e4aea1f0873dd9e029a76374c71680192f9f085e145b5e5a3` |
| `step-c-missing-time-decision.md` | `112d54be9105ed026c50ab78337f9f707df9f16da6d5129dd7d8fd798665ab38` |

Helpers and final metrics:

| Artifact | SHA-256 |
|---|---|
| `extract-candidate-observations.mjs` | `0bdfb46e61d572c450da6e257dca3d769d53e9b8b07c506564753fad6aabc984` |
| `select-manual-audit-set.mjs` | `c5565be9f54024dad5eddfc4e6c44dc505ec6628205075e74744c1311fcc8d53` |
| `validate-source-origin-ledger.mjs` | `3468edf48b46a911763ce259bb87ea04bc14e23e846df420111ae5843217bc2b` |
| `validate-event-clustering.mjs` | `fb3158ebb03ee9fae66c6a6cc832b929df2a270161b8224fb4e9e96370a92b83` |
| `validate-event-labeling.mjs` | `680650e21ecf443763bbb768a1c53864a783610981a251195d3f2df2937399ca` |
| `evaluate-signal-elevation.mjs` | `aa3968d9e3c83f9627cfb9b5839392ea9c45895faea8c12e4bc58c57bbf391bf` |
| `finalize-signal-audit.mjs` | `08bb094a7023122355111dfd764cc418d81d517fce93080b5ded544612c9461b` |
| `metrics.json` | `162cab85f0ca68682e9a216a2b9f65b6f28ecfb6af4c35170ba7824123f26ba3` |

Recorded internal boundaries also pass: Step-E cluster-ledger prefix SHA-256 `7235cf44388568e550cb2767c68e8b685be0db71191f6f7e7ca564a96d5acdc9`; Step-F assessment suffix `d7425c9822e28f9d652d0dd0e4c9fbbae89599d29851307e96e82b1ecb31b701`; pre-Step-G notes prefix `596f498293e6dfe869778a194971562d28ed4238f1cf0c2c9c91760a36115b88`.

The report's own SHA-256 cannot be embedded without changing the file. It is calculated after closure and recorded in the completion-gate return report alongside the helper and metrics hashes.
