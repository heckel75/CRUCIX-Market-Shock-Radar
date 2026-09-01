# PA-08 round-two independent validation

Verdict: **PA-08 R2 PASS**

Corrected manifest identity: `c99059b2aa12022d73d3fd5ffb5505d805de5e2e77aa093de975b309cdc8196c`

This report was produced by the fresh round-two validator before the historical or expanded first-pass validators were run. After the independent result was fixed, the expanded first-pass validator was run and the comparison below was appended.

## Repository boundary

- Branch/HEAD/origin: `master` / `bfce08feece67444ce7fd98ea6fe2b42d15eea24` / `bfce08feece67444ce7fd98ea6fe2b42d15eea24`
- Tracked/index clean: true
- Frozen candidate trees preserved: true
- Start/end untracked roots: `audit/session16/`, `audit/session17/`, `methodology/`
- Start/end tree identities: Session 15 `b3d1474b617b6bb9ac6d323f684fb7356f2b0168a285199a9e8cd59da0659e93`; Session 16 `3e3b52ce07c5a25e8b1538f74206663f2f1f6dcf5e725975cb9df03b1b070fe5`; pre-existing Session 17 `1a8568db8489461a791b2afef7f89af7b6104a088f43d386e6a8eb1716d2dc0c`; Methodology `44171a92ff734354617501844529f60140aee1f3cbd77d3b3d6baacbf4e9a1bf`.
- End `git diff --check`: PASS

## Independently reproduced signal evidence

- Fidelity B: 1153 observations; 834 exact-duplicate excess.
- Manual disposition: 327 accepted; 101/428 unresolved; 123 active clusters.
- Origin status: 21/123 unknown; 102/123 assessed; corroboration 97/4/1/21.
- C-E2-S2: 82 contributions, 62 clusters, 36/140 nonzero cells, 10 ties, 9 top ties.

## Independently reproduced market and timing evidence

- 8669 observations across 14 instruments produced 8599 transforms with 0 frozen-transform mismatches.
- Selected channel recomputation mismatches: 0.
- Timing: 36 qualifying, 10 definitive, 26 ambiguous, 0 causal claims.

| Channel | Closes | Raw triggers | Available | Insufficient | Percentile triggers |
|---|---:|---:|---:|---:|---:|
| conflict-escalation | 361 | 158 | 224 | 137 | 56 |
| credit-stress | 362 | 69 | 231 | 131 | 46 |
| energy-disruption | 353 | 108 | 220 | 133 | 58 |
| sanctions-policy | 361 | 117 | 231 | 130 | 69 |
| supply-chain | 361 | 81 | 235 | 126 | 73 |

## Corrected-defect and package results

- PASS — JSON-01: 15/15 required JSON files parsed
- PASS — SCHEMA-REF-01: 171/171 schema references resolved
- PASS — BOUNDARY-01: HEAD, origin, tracked/index state, untracked roots, and frozen tree identities match the initial capture
- PASS — PA08-HISTORY-01: All ten pre-existing Session 17 files, including both earlier validation records, remain byte-identical
- PASS — IDENTITY-METHODOLOGY-01: 11/11 Methodology artifact identities reproduced
- PASS — IDENTITY-EVIDENCE-01: 50/50 evidence identities reproduced
- PASS — IDENTITY-PRODUCTION-01: 12/12 production and legacy baselines reproduced
- PASS — IDENTITY-MANIFEST-01: Corrected manifest self-identity reproduced twice in clean Node processes
- PASS — IDENTITY-HISTORY-01: Failed identity remains failed history and selections are explicitly unchanged
- PASS — PRESERVATION-15-01: 11/11 Session 15 preservation copies and 597000/597000 bytes reproduced
- PASS — PRESERVATION-16-01: Session 16 manifest, 14 instruments, 28 frozen raw/normalized inputs, and canonical identity reproduced
- PASS — SIGNAL-REGRESSION-01: Session 15 counts, origin distribution, lifecycle clocks, chronology exclusion, and C-E2-S2 results reproduced
- PASS — SIGNAL-SELECTION-01: Implemented/impact boundary, direct mechanisms, material transitions, E2 corroboration, one contribution, and no-decay behavior match the frozen package
- PASS — MARKET-TRANSFORM-01: 8599/8599 transforms independently rebuilt from 8669/8669 observations with zero mismatch
- PASS — MARKET-SELECTED-01: Rule 2, age/gap/quorum, own-series z, conditioned prior-only percentile, strict comparison, no fallback, raw diagnostic, breadth, and channel outcomes reproduced
- PASS — TIMING-01: C-E2-S2 timing reproduced without a causal-attribution conclusion
- PASS — DEFECT-A-NORMALIZATION: Exact Session 15 NFKC/line-ending/whitespace behavior, persisted version/hash, byte input, retention, exact paths, and prohibited fuzzy paths verified
- PASS — FIXTURES-01: 46/46 positive and 48/48 negative fixtures produced the intended semantic outcomes
- PASS — DEFECT-B-ADVERSARIAL: All ten adversarial records were recreated and rejected at their intended invariant
- PASS — COMPLETE-RECORDS-01: All 11 production definitions and the connected end-to-end run bundle are schema-valid and semantically connected
- PASS — DEFECT-C-OPERATIONAL: Lifecycle and market audit fields are required; independent missing-field and chronology mutations fail
- PASS — DEFECT-D-TOPOLOGY: Complete topology is recoverable; syndication/quotation/independence/unknown/conflict rules hold; dangling, self, broken, and circular edges fail
- PASS — DEFECT-E-CANONICAL: All 47 schema arrays have policies; complete canonical bytes are 924 LF-terminated bytes with the expected hash in two clean processes; sequence errors reject; numbers/null/unknown/volatile handling is deterministic
- PASS — DEFECT-F-TRACEABILITY: Observation and cluster denominators are separated throughout the corrected package and mutable reports
- PASS — DEFERRALS-01: All six bounded deferrals are byte-identical and carry safe behavior, blocking effect, evidence, and future gate; PA-09 remains the cutover blocker
- PASS — CONSTANTS-01: All selected domain constants resolve to parameters.json; deferred similarity/decay/storage choices remain unselected
- PASS — SCOPE-01: No forbidden path, legacy output, project log, index, or tracked file changed; git diff --check passed; no Session 18/19 implementation or publication exists

## First-pass comparison

`node audit/session17/validate-freeze.mjs` exited 0 and reported **24/24 validation groups passed**.

Its package, schema, fixture, defect, identity, and boundary conclusions agree with the independent result. The round-two validator also directly reconstructs the Session 15 signal evidence, all 8,599 Session 16 transforms, selected-channel prior-only conditioned percentiles, and timing evidence; performs clean-process probes; and checks preservation explicitly.

## Scope statement

No repair, Session 18/19 implementation, publication, project-log entry, staging, commit, or push was performed.
