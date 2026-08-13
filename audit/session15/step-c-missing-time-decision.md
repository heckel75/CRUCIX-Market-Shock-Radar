# Session 15 Step C missing-time decision

## Status and provenance

- Decision status: authorized audit-selection procedure for the Session 15 Step C resume
- Decision timestamp (UTC): `2026-08-13T11:56:37.5319231Z`
- Reviewer/authority: user-provided Session 15 Checkpoint 3 resume work order
- Automation/executor: OpenAI Codex primary agent
- Scope: deterministic manual-audit-set selection and serialization only
- Input-manifest self-hash: `3a864319add335d4f2fb3550fa8b865a6282d29f4a37819200e516106cdf3651`
- Candidate-observations SHA-256: `36604f9ea997335f3d9c368c0c76135b37babd797805180c1e27568a1b8ab69e`
- Session 14 protocol SHA-256: `6d29f97737a3b9d589c826846613863699cdbc5e4e90e88aba65d815dfd9d670`

## Blocker encountered

The first Step C attempt stopped before selection because all 64 fidelity-C records in `candidate-observations.jsonl` have `inputEvidence.observedAt.status = "unknown"` and `value = null`. The Session 14 protocol required both a content-plus-observation-time duplicate comparison and ordering by `observedAt`, but did not define equality or serialization order for missing audit-observation time. Step B deliberately retained snapshot `generatedAt` and close-date values only in their existing metadata roles and did not promote them to `observedAt`.

## Authorized equality rule for Rule 2

Two observations establish the same normalized-content-plus-observation-time pair only when all of the following are true:

1. Their conservative normalized content IDs/hashes are equal.
2. Both have `observedAt.status = "assessed"`.
3. Their assessed observation-time values are equal under the existing normalized timestamp representation.

If either observation has `observedAt.status = "unknown"`, same-observation-time equality is not established. Unknown is not equal to another unknown for deduplication. A fidelity-C occurrence is not excluded merely because its normalized content appears in fidelity B, and two fidelity-C occurrences are not excluded merely because both have unknown observation time. Each otherwise eligible selected-output occurrence remains a distinct audit observation.

## Historical timestamps remain unknown

Fidelity-C `observedAt` wrappers remain unchanged as `status = "unknown"`, `value = null`. The selector must not promote artifact `generatedAt`, market close date, snapshot filename date, filesystem modification time, Git commit time, later reporting, or current web evidence to `observedAt`. This decision reconstructs no historical event, publication, or observation timestamp.

## Deterministic serialization order

Manual-set records use two ordering buckets:

1. Bucket 0 contains records with `observedAt.status = "assessed"`. Sort by assessed `observedAt` ascending, conservative normalized SHA-256 ascending, then candidate observation ID ascending.
2. Bucket 1 contains records with `observedAt.status = "unknown"` and follows all Bucket 0 records. Sort by conservative normalized SHA-256 ascending, then candidate observation ID ascending.

Any other observation-time assessment status is an error that stops selection. Placement of unknown-time records after assessed-time records is only a deterministic file-serialization convention, not a historical chronology claim. No timestamp is synthesized for Bucket 1.

## Chronology eligibility

`chronologyEligible` is `true` only when the original Step B `observedAt.status` is `assessed`; it is `false` when that status is `unknown`. The field is an audit convenience and does not alter the source wrapper.

Records with `chronologyEligible: false` must not establish `firstSeen`, `lastObservedAt`, `lastMaterialChangeAt`, lifecycle state, recurrence interval, decay interval, or before/after ordering. They may support non-temporal evidence that a selected report was retained, subject to fidelity-C limitations.

## Methodological boundary

These rules resolve deterministic Step C selection and JSONL serialization only. They are not Methodology 2.0 production parameters, do not alter the Session 14 protocol retroactively, do not freeze lifecycle methodology, do not infer missing time, and authorize no source-origin normalization, event clustering, semantic labeling, adjudication, signal-elevation evaluation, or production implementation.
