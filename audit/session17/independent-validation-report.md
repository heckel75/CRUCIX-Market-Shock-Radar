# PA-08 independent validation — FAIL

Independent decision: **FAIL**. The Methodology 2.0.0 freeze candidate is not safe to hand to Session 18 unchanged.

## Boundary and method

Repository: `master` at `bfce08feece67444ce7fd98ea6fe2b42d15eea24`; origin/master `bfce08feece67444ce7fd98ea6fe2b42d15eea24`; ahead/behind 0/0.

This validator was authored from the Session 14 contract, Session 15/16 frozen evidence, and Methodology 2.0.0 artifacts. It did not import or execute the first validator. The first-validator comparison remains pending until these independent results are fixed.

## Independently reproduced results

Signal C-E2-S2 reproduced 82 qualifying cluster/run/channel rows from 62 clusters across 36/140 nonzero run/channel cells (23 one, 13 multiple), with 10 tie cells and 9 top-tie cells.

- conflict-escalation: 361 distinct closes; raw |z| >= 1.5 158; conditioned history 224 available / 137 insufficient; percentile triggers 56.
- credit-stress: 362 distinct closes; raw |z| >= 1.5 69; conditioned history 231 available / 131 insufficient; percentile triggers 46.
- energy-disruption: 353 distinct closes; raw |z| >= 1.5 108; conditioned history 220 available / 133 insufficient; percentile triggers 58.
- sanctions-policy: 361 distinct closes; raw |z| >= 1.5 117; conditioned history 231 available / 130 insufficient; percentile triggers 69.
- supply-chain: 361 distinct closes; raw |z| >= 1.5 81; conditioned history 235 available / 126 insufficient; percentile triggers 73.

Timing reproduced 36 qualifying cells: 10 definitive and 26 ambiguous; no causal attribution claims.

## Material defects

- **PA08-D01 — The exact normalized-content automatic clustering path has no persisted input identity.** The clustering rules permit exact-normalized-content-hash joins, but schema.$defs.rawIdentity and schema.$defs.candidate expose no normalized-content hash and the frozen parameter package defines no candidate-text normalization algorithm. Structural test result: raw identity has normalized hash = false. Add the normalized input field and deterministic normalization contract, add positive/negative record fixtures, regenerate identities, and rerun PA-08.
- **PA08-D02 — The schema admits states that contradict the frozen signal and market rules.** 8/10 adversarial records were schema-admissible, including independent corroboration with zero origins, automatic join without an allowed rule or cluster, continuing marked material, assessed market with no cohort/statistic, and an inconsistent assessed divergence state. Encode cross-field conditions in the schema (or a normative validator bound by hash), add mutation fixtures, regenerate the package, and rerun.
- **PA08-D03 — Required temporal and own-series audit surfaces are absent from the final schema.** eventCluster.firstSeen=false; instrumentReading.windowStart=false; windowEnd=false; historyCount=false. These fields are required to demonstrate lifecycle clocks and the five-valid-observation/no-lookahead calculation. Restore required retained fields and their ordering/consistency constraints, then add complete schema-record fixtures.
- **PA08-D04 — Reporter/origin/syndication independence cannot be reconstructed from the frozen origin schema.** originEvidence stores a flat origin-ID list and count but no reporter-to-asserted-origin or derivation/syndication relationship; structural relationship field present=false. The schema therefore cannot enforce the two-origin rule from recoverable records. Persist relationship evidence and bind independentOriginCount/evidenceClass/conflicting to it with record-level tests.
- **PA08-D05 — Canonicalization and fixture coverage do not prove byte determinism.** The parameters promise schema-defined array order, but ordering is declared for only 9 broad collections while critical arrays such as evidenceRefs, histories, mechanisms, readings, reasonCodes, and hashes lack normative ordering. The 63 fixtures contain 0 complete v2 schema records and test only one object-key/volatile-field canonicalization example. Define every persisted array's canonical ordering and add byte fixtures for arrays, LF, rounding, negative zero, timestamps, and repeated full records.
- **PA08-D06 — Parameter traceability materially overstates unresolved cluster provenance.** parameter-traceability.json entries[0].evidence[0].measurement states "E2 is the Session 15 recommended evidence family; 101/123 clusters had unresolved independent-source status, making E3's lower-bound unknown path less conservative.", while direct ledger recomputation finds 21/123 clusters with unknown exact independent-source count; 101 is the unresolved observation assignment count out of 428. Correct the evidence statement and review the E2/E3 rationale, regenerate hashes/reports, and rerun both validators.

## Other results

Artifact identities: PASS; evidence identities: PASS; fixtures: 63/63 replayed as intended; deferrals: PASS; hidden numeric constants: none detected.

## Original-validator comparison

After the independent result was fixed, `node audit/session17/validate-freeze.mjs` exited 0 and reported **PASS (15/15 groups)**. It agrees on parsing, references, supplied fixture replay, maps/parameters, hashes, frozen evidence, production preservation, deferrals, working-tree scope, and numeric-constant registration.

The decisions diverge materially. The original validator does not reject the adversarial schema-admissible contradictions, missing normalized-content and reporter/origin relationship fields, missing temporal/own-series audit surfaces, incomplete canonical array/byte fixtures, or the 101/123 traceability misstatement. Its PASS therefore does not change the independent PA-08 FAIL.

## Mutation boundary

Frozen surface start/end match: PASS. Only `audit/session17/validate-independent.mjs`, `audit/session17/independent-validation-results.json`, and `audit/session17/independent-validation-report.md` are authorized independent outputs. Nothing was staged, committed, pushed, repaired, implemented, or appended to the project log.
