# Corrected Session 17 freeze-candidate validation report

Status: **expanded first-pass validation passed; fresh independent PA-08 revalidation still required**

Validator: `node audit/session17/validate-freeze.mjs`

The helper is read-only, uses Node built-ins, does not import the independent validator, changes no production dependency, and treats any failed group as a nonzero exit.

## Result

All 24 validation groups pass:

1. All Methodology and mutable Session 17 JSON parses.
2. All 171 local JSON Schema references resolve.
3. Both fixture suites conform to the fixture schema.
4. All 46 positive and 48 negative fixtures produce their exact intended result/reason.
5. `crucix-session15-conservative-normalization/v1` reproduces NFKC, line-ending, whitespace, case/punctuation/URL preservation, exact UTF-8 input, and SHA-256 identity.
6. All ten immutable PA-08 adversarial cases fail the corrected schema for their mapped invariant.
7. Thirty-seven required lifecycle/market operational fields are enforced and four complete-record missing/malformed/chronology mutations fail.
8. Candidate→reporter→assertion→origin→independence-group topology is recoverable; syndicated/official/independent/unknown/conflicting cases pass and dangling/circular/self edges fail.
9. One connected, schema-valid bundle covers 11 production definitions, including complete candidate, origin, assignment, registry/cluster, signal, instrument/market, divergence, and run-manifest records.
10. All 47 array-bearing schema properties have a machine-readable set/sequence policy; exact LF-terminated canonical bytes reproduce twice with SHA-256 `e871a28d2d2b6634246939c4b078b0116c8f4b65fb04ff37e7082218f0f7c7c7`; invalid ordered history is rejected.
11. Direct Session 15 ledger recomputation confirms `101/428` unresolved observations, `21/123` unknown-origin clusters, `102/123` exact independent-source counts, and corroboration `97/4/1/21`.
12. All three failed independent PA-08 artifacts preserve their exact hashes, and the failed manifest identity remains recorded as superseded failure history.
13. Enums, schema values, the five-channel/fourteen-instrument map, transforms, and parameters agree.
14. All five selected Session 16 configuration/statistic-series mappings remain the frozen Rule 2, age-3, gap-0 contracts.
15. Candidate C/E2, stage/lifecycle, quorum, percentile, no-fallback/no-decay, breadth, and parallel selections are unchanged; the six deferrals are byte-identical.
16. All 30 consequential decisions remain frozen or bounded-deferred.
17. All 25 checked domain numeric values remain explicit and internally consistent.
18. Base canonical key order, negative zero, and 12-place output rounding reproduce.
19. All four divergence-state descriptions remain noncausal.
20. All 11 corrected Methodology artifact identities and the new manifest self-identity reproduce.
21. All 50 Session 14–16 evidence identities, the Session 16 canonical manifest, and 11 Session 15 preservation copies/597,000 bytes reproduce.
22. All 12 production/project-log/workflow/public/legacy baselines reproduce; no forbidden tracked or staged changes exist.
23. Every visible worktree entry remains inside the authorized untracked Session 16/17/Methodology boundary.
24. `git diff --check` passes.

## Manifest correction

- Failed identity retained as failed history: `809fb5119c3634ab6c30349c8b58ef7659effd4b0b227af69186ed876e63bf33`.
- Corrected identity: `c99059b2aa12022d73d3fd5ffb5505d805de5e2e77aa093de975b309cdc8196c`.
- Two separate clean Node processes derived the corrected identity independently.

## Preservation

- Independent validation helper: `cb82199c3160e22dc16f18a45b843a07e4ae043aa4b3af66241cb3df08eebc0c`.
- Independent results: `34f1daf6ddd07f675c2c107a66e84bf25711503d15f08b24a5b58cbbaff8260e`.
- Independent report: `59f2d82692c8a052b3758e92ceed8fb3a3382dbfcaa6178d7d0bf86b934e1f9b`.
- Project log: `4c67b4220f7ec3e30e0b878c22c24ed9656d86be595df659255bd47325f8939d`.
- No evidence, production, workflow, public, legacy, history, or private path was edited.
- Nothing was staged, committed, pushed, published, or implemented for Session 18/19.

## Gate status

This is the **corrected Session 17 freeze candidate**. The expanded first-pass validator is not independent PA-08. Session 17 is not declared complete, and a fresh independent revalidation must pass before Session 18.
