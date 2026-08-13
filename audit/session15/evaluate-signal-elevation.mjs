#!/usr/bin/env node

/**
 * CRUCIX Session 15 Step G audit-only signal-elevation sensitivity evaluator.
 *
 * Numeric results are regenerated exclusively from frozen Step A-F artifacts.
 * This file evaluates candidates; it does not select or implement methodology.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

const PATHS = Object.freeze({
  projectLog: "CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md",
  protocol: "audit/session14-signal-audit-protocol.md",
  architecture: "audit/session14-architecture-decision.md",
  schemaDraft: "audit/methodology-2-core-schema-draft.md",
  parameterRegister: "audit/methodology-2-parameter-register.md",
  manifest: "audit/session15/input-manifest.json",
  candidates: "audit/session15/candidate-observations.jsonl",
  manualSet: "audit/session15/manual-audit-set.jsonl",
  sourceOrigins: "audit/session15/source-origin-ledger.jsonl",
  assignments: "audit/session15/assignment-ledger.jsonl",
  clusterLedger: "audit/session15/event-cluster-ledger.jsonl",
  notes: "audit/session15/adjudication-notes.md",
  missingTimeDecision: "audit/session15/step-c-missing-time-decision.md",
  evaluator: "audit/session15/evaluate-signal-elevation.mjs",
  output: "audit/session15/signal-elevation-sensitivity.json",
  workOrder: "C:/Users/heyke/.codex/attachments/e145b094-5d52-4903-aeb8-ae42db60dd6b/pasted-text.txt",
});

const EXPECTED = Object.freeze({
  projectLogSha256: "62a7284c36bbd4bfe59f0a90749ab506de7619b9359c078bebf17ed739c05751",
  protocolSha256: "6d29f97737a3b9d589c826846613863699cdbc5e4e90e88aba65d815dfd9d670",
  architectureSha256: "f1d0bf58f255ed144ea30b445fd9ef7efb05b7ae71ef4797505eff8d135fa321",
  schemaDraftSha256: "d32a00a572c4d01e390839b1cc5375c03d8b692fa6450cc42a6e0fcf21706bb2",
  parameterRegisterSha256: "5d60242eee78462d0e482c81d77821680f9e0b2f89c8b05b78e75eeeba1651f7",
  manifestPhysicalSha256: "95fe87b181f4a714a4571960fc6fca03fa62c96a94b82b4920c0a471a5767f0c",
  manifestSelfHash: "3a864319add335d4f2fb3550fa8b865a6282d29f4a37819200e516106cdf3651",
  candidateObservationsSha256: "36604f9ea997335f3d9c368c0c76135b37babd797805180c1e27568a1b8ab69e",
  manualAuditSetSha256: "5662b5642e5c3dcec1f92c7baefb1312768a58574ad09a350bc8dfe09161dc45",
  sourceOriginLedgerSha256: "05b479b7e1dc244dd10c0594722f88dd649428b46421e5990c729d2eaee8cc42",
  assignmentLedgerSha256: "e7454a9b437cf9cf94e188dde5846ec83b41a67aae02b6e5c837fe7e103f47b5",
  preStepGClusterLedgerSha256: "eabad73ae8b9f4c8ac06a2c5e1d80b8bcd8a4d7c40dc0c03d014b7e855236768",
  preStepGClusterLedgerBytes: 2222512,
  preStepGClusterLedgerLines: 253,
  preStepGNotesSha256: "596f498293e6dfe869778a194971562d28ed4238f1cf0c2c9c91760a36115b88",
  preStepGNotesBytes: 30973,
  missingTimeDecisionSha256: "112d54be9105ed026c50ab78337f9f707df9f16da6d5129dd7d8fd798665ab38",
  workOrderSha256: "8bdba5b6cdb7f6be19ae9e4d9bc8d8f38b795ea76730313d557fa40c87d79f24",
  manualObservationCount: 428,
  acceptedObservationCount: 327,
  unresolvedObservationCount: 101,
  acceptedBObservationCount: 279,
  acceptedCObservationCount: 48,
  activeClusterCount: 123,
  bOnlyClusterCount: 90,
  cOnlyClusterCount: 31,
  mixedClusterCount: 2,
  retainedBRunCount: 28,
  retainedBTimestampCount: 27,
  stepFAssessmentCount: 123,
});

const MECHANISM_CHANNEL = Object.freeze({
  "security-risk-repricing": "conflict-escalation",
  "trade-asset-access-restriction": "sanctions-policy",
  "energy-supply-disruption": "energy-disruption",
  "funding-credit-transmission": "credit-stress",
  "production-transport-bottleneck": "supply-chain",
});
const MECHANISMS = Object.freeze(Object.keys(MECHANISM_CHANNEL));
const CHANNELS = Object.freeze(Object.values(MECHANISM_CHANNEL));
const STAGE_ORDINAL = Object.freeze({ rhetoric: 0, threatened: 1, announced: 2, implemented: 3, "impact-observed": 4 });
const EVIDENCE_VARIANTS = Object.freeze({
  E1: { label: "strict-independent-corroboration", allowedCorroboration: ["corroborated-independent"] },
  E2: { label: "resolved-non-conflicting-evidence", allowedCorroboration: ["single-origin", "corroborated-independent"] },
  E3: { label: "assessed-lower-bound-evidence", rule: "lowerBound>=1 and no retained conflict and not retracted-only" },
});
const STAGE_VARIANTS = Object.freeze({
  S1: { label: "impact-observed-only", allowedStages: ["impact-observed"] },
  S2: { label: "implemented-or-impact-observed", allowedStages: ["implemented", "impact-observed"] },
  S3: { label: "announced-or-later", allowedStages: ["announced", "implemented", "impact-observed"] },
  S4: { label: "threatened-or-later", allowedStages: ["threatened", "announced", "implemented", "impact-observed"] },
  S5: { label: "any-assessed-stage", allowedStages: ["rhetoric", "threatened", "announced", "implemented", "impact-observed"] },
});
const CUTOFFS = Object.freeze([0, 1, 2, 3, 4]);
const STAGE_TO_CUTOFF = Object.freeze({ S1: 4, S2: 3, S3: 2, S4: 1, S5: 0 });
const MATERIAL_PULSES = Object.freeze(["new", "escalating", "de-escalating"]);
const PULSE_ORDER = Object.freeze(["new", "escalating", "de-escalating"]);

const PROCEDURE = Object.freeze({
  procedureId: "crucix-session15-step-g-signal-elevation-sensitivity/v1",
  status: "candidate-sensitivity-only",
  historicalUnit: "One cluster/run row exists only when the cluster has at least one accepted chronology-eligible B observation in that retained payload identity.",
  runIdentityRule: "Evaluate all 28 retained B payload identities separately; equal timestamps do not merge run identities.",
  equalTimestampRule: "Point-in-time evidence uses observedAt <= evaluated run timestamp, so co-temporal evidence is available while payload identities remain distinct frequency units.",
  noLookAheadRule: "Only accepted chronology-eligible B observations at or before the evaluated run timestamp enter accumulated evidence; C and later B observations are excluded.",
  directMechanismRule: "A final Step-F direct mechanism is point-in-time available only after at least one cited accepted B evidence candidate is available.",
  stageRule: "The final assessed Step-F stage is available only after at least one cited accepted B evidence candidate is available; earlier lower stages are never inferred.",
  corroborationRule: "Recompute Step-D independence groups and unresolved provenance from available B evidence; conflict becomes available only after all chronology-eligible evidence cited by the retained conflict assessment is available.",
  lifecycleRule: "Derive each run pulse from frozen Step-F observationLifecycle assessments for accepted B members in that payload; material pulse passes, continuing fails, unknown is indeterminate.",
  candidateARule: "direct channel mechanism AND evidence variant AND stage variant AND material lifecycle pulse",
  noLifecycleDiagnosticRule: "Candidate A with only its lifecycle clause removed; not an additional production candidate.",
  candidateBRule: "direct channel mechanism AND evidence variant AND stage ordinal cutoff; lifecycle omitted and no other points added.",
  candidateCRule: "Candidate-A eligibility unchanged; rank qualifying clusters by stage ordinal descending and eventClusterId ascending.",
  legacyRule: "Reproduced legacy-selected B observations are comparison evidence only and are not treated as exact historical output.",
  prohibited: "No production rule, final cutoff, corroboration exception, decay, market data, divergence state, category quota, publication-volume severity, Step-F relabeling, or production implementation.",
});

function absolute(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileHash(relativePath) {
  return sha256(fs.readFileSync(absolute(relativePath)));
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function parseLines(text, label) {
  const trimmed = text.trimEnd();
  if (!trimmed) return [];
  return trimmed.split(/\r?\n/).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${label}:${index + 1}: ${error.message}`);
    }
  });
}

function parseJsonl(relativePath) {
  const text = fs.readFileSync(absolute(relativePath), "utf8");
  invariant(text.endsWith("\n"), `${relativePath} lacks final newline`);
  return parseLines(text, relativePath);
}

function unique(values) {
  return [...new Set(values)];
}

function sorted(values) {
  return values.slice().sort((a, b) => String(a).localeCompare(String(b)));
}

function uniqueSorted(values) {
  return sorted(unique(values.filter((value) => value !== null && value !== undefined)));
}

function setDifference(left, right) {
  const rhs = right instanceof Set ? right : new Set(right);
  return [...left].filter((value) => !rhs.has(value)).sort();
}

function setIntersection(left, right) {
  const rhs = right instanceof Set ? right : new Set(right);
  return [...left].filter((value) => rhs.has(value)).sort();
}

function round(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function distribution(values) {
  const ordered = values.slice().sort((a, b) => a - b);
  if (!ordered.length) return { minimum: null, median: null, mean: null, maximum: null };
  const middle = Math.floor(ordered.length / 2);
  return {
    minimum: ordered[0],
    median: ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2,
    mean: round(ordered.reduce((sum, value) => sum + value, 0) / ordered.length),
    maximum: ordered.at(-1),
  };
}

function countValues(values, orderedKeys = []) {
  const map = new Map(orderedKeys.map((key) => [String(key), 0]));
  for (const value of values) map.set(String(value), (map.get(String(value)) ?? 0) + 1);
  return Object.fromEntries(map);
}

function valueOf(wrapper) {
  return wrapper?.status === "assessed" ? wrapper.value : null;
}

function resolveCurrent(records, idField, supersedesField) {
  const byId = new Map(records.map((record) => [record[idField], record]));
  invariant(byId.size === records.length, `duplicate ${idField}`);
  const superseded = new Set();
  for (const record of records) {
    const wrapper = record[supersedesField];
    if (wrapper?.status !== "assessed") continue;
    invariant(byId.has(wrapper.value), `missing superseded record ${wrapper.value}`);
    invariant(!superseded.has(wrapper.value), `record superseded twice ${wrapper.value}`);
    superseded.add(wrapper.value);
  }
  return { current: records.filter((record) => !superseded.has(record[idField])), superseded };
}

function extractRunIdentity(candidate) {
  const payload = candidate.inputEvidence.retainedPayloadIdentity;
  invariant(payload?.status === "assessed", `B candidate lacks retained payload identity: ${candidate.candidateId}`);
  const observedAt = candidate.inputEvidence.observedAt;
  invariant(observedAt?.status === "assessed", `B candidate lacks observedAt: ${candidate.candidateId}`);
  return {
    runId: candidate.runId,
    retainedPayloadId: payload.value.retainedPayloadId,
    runTimestampUtc: observedAt.value,
    payloadLocator: payload.value.payloadLocator,
    canonicalPayloadSha256: payload.value.canonicalPayloadSha256,
    payloadRelationship: payload.value.relationship,
    sourceInputPath: candidate.inputEvidence.sourceInputPath,
    sourceInputSha256: candidate.inputEvidence.sourceInputSha256,
  };
}

function loadInputs() {
  const expectedFiles = {
    projectLogSha256: PATHS.projectLog,
    protocolSha256: PATHS.protocol,
    architectureSha256: PATHS.architecture,
    schemaDraftSha256: PATHS.schemaDraft,
    parameterRegisterSha256: PATHS.parameterRegister,
    manifestPhysicalSha256: PATHS.manifest,
    candidateObservationsSha256: PATHS.candidates,
    manualAuditSetSha256: PATHS.manualSet,
    sourceOriginLedgerSha256: PATHS.sourceOrigins,
    assignmentLedgerSha256: PATHS.assignments,
    preStepGClusterLedgerSha256: PATHS.clusterLedger,
    missingTimeDecisionSha256: PATHS.missingTimeDecision,
    workOrderSha256: PATHS.workOrder,
  };
  for (const [key, relativePath] of Object.entries(expectedFiles)) {
    invariant(fileHash(relativePath) === EXPECTED[key], `${key} mismatch`);
  }

  const clusterLedgerBytes = fs.readFileSync(absolute(PATHS.clusterLedger));
  invariant(clusterLedgerBytes.length === EXPECTED.preStepGClusterLedgerBytes, "pre-Step-G semantic ledger length changed");
  invariant(clusterLedgerBytes.toString("utf8").split(/\r?\n/).filter(Boolean).length === EXPECTED.preStepGClusterLedgerLines, "pre-Step-G semantic ledger line count changed");
  const notesBytes = fs.readFileSync(absolute(PATHS.notes));
  invariant(notesBytes.length >= EXPECTED.preStepGNotesBytes, "adjudication notes shorter than frozen pre-Step-G prefix");
  invariant(sha256(notesBytes.subarray(0, EXPECTED.preStepGNotesBytes)) === EXPECTED.preStepGNotesSha256, "pre-Step-G notes prefix changed");

  const manifest = JSON.parse(fs.readFileSync(absolute(PATHS.manifest), "utf8"));
  invariant(manifest.manifestHash?.value === EXPECTED.manifestSelfHash, "manifest stored self-hash mismatch");
  const manifestCopy = structuredClone(manifest);
  manifestCopy.manifestHash.value = null;
  invariant(sha256(Buffer.from(canonicalize(manifestCopy), "utf8")) === EXPECTED.manifestSelfHash, "manifest canonical self-hash mismatch");

  const candidates = parseJsonl(PATHS.candidates);
  const manual = parseJsonl(PATHS.manualSet);
  const origins = parseJsonl(PATHS.sourceOrigins);
  const assignments = parseJsonl(PATHS.assignments);
  const clusterLedger = parseLines(clusterLedgerBytes.toString("utf8"), PATHS.clusterLedger);
  const events = clusterLedger.filter((record) => record.recordType === "event-cluster" && record.auditIdentityState === "active");
  const assessmentRecords = clusterLedger.filter((record) => record.recordType === "event-field-assessment");
  const { current: assessments, superseded: supersededAssessments } = resolveCurrent(assessmentRecords, "assessmentId", "supersedesAssessmentId");
  const { current: currentAssignments } = resolveCurrent(assignments, "assignmentId", "supersedesAssignmentId");
  const acceptedAssignments = currentAssignments.filter((record) => record.assignmentDecision === "accepted");
  const unresolvedAssignments = currentAssignments.filter((record) => record.assignmentDecision === "unresolved-after-adjudication");

  invariant(manual.length === EXPECTED.manualObservationCount, "manual-set count mismatch");
  invariant(currentAssignments.length === EXPECTED.manualObservationCount, "current assignment count mismatch");
  invariant(acceptedAssignments.length === EXPECTED.acceptedObservationCount, "accepted assignment count mismatch");
  invariant(unresolvedAssignments.length === EXPECTED.unresolvedObservationCount, "unresolved assignment count mismatch");
  invariant(events.length === EXPECTED.activeClusterCount, "active cluster count mismatch");
  invariant(assessments.length === EXPECTED.stepFAssessmentCount && supersededAssessments.size === 0, "Step-F assessment state mismatch");
  invariant(events.filter((event) => event.chronologyEligibleMemberCount > 0 && event.chronologyIneligibleMemberCount === 0).length === EXPECTED.bOnlyClusterCount, "B-only cluster count mismatch");
  invariant(events.filter((event) => event.chronologyEligibleMemberCount === 0).length === EXPECTED.cOnlyClusterCount, "C-only cluster count mismatch");
  invariant(events.filter((event) => event.chronologyEligibleMemberCount > 0 && event.chronologyIneligibleMemberCount > 0).length === EXPECTED.mixedClusterCount, "mixed cluster count mismatch");

  const candidateById = new Map(candidates.map((record) => [record.candidateId, record]));
  const manualById = new Map(manual.map((record) => [record.candidateObservationId, record]));
  const originById = new Map(origins.map((record) => [record.candidateObservationId, record]));
  const assignmentByCandidate = new Map(currentAssignments.map((record) => [record.candidateObservationId, record]));
  const eventById = new Map(events.map((record) => [record.eventClusterId, record]));
  const assessmentByEvent = new Map(assessments.map((record) => [record.eventClusterId, record]));
  invariant(candidateById.size === candidates.length && manualById.size === manual.length && originById.size === origins.length, "duplicate evidence IDs");
  invariant(eventById.size === events.length && assessmentByEvent.size === assessments.length, "duplicate event/assessment IDs");

  const acceptedB = [];
  const acceptedC = [];
  for (const assignment of acceptedAssignments) {
    const member = manualById.get(assignment.candidateObservationId);
    invariant(member, `accepted assignment outside manual set: ${assignment.candidateObservationId}`);
    (member.chronologyEligible ? acceptedB : acceptedC).push({ assignment, member });
  }
  invariant(acceptedB.length === EXPECTED.acceptedBObservationCount, "accepted B count mismatch");
  invariant(acceptedC.length === EXPECTED.acceptedCObservationCount, "accepted C count mismatch");

  const runGroups = new Map();
  for (const candidate of candidates.filter((record) => record.fidelityStratum === "B-reconstructable-run-input")) {
    const identity = extractRunIdentity(candidate);
    if (!runGroups.has(identity.runId)) runGroups.set(identity.runId, { identity, candidateIds: [] });
    const group = runGroups.get(identity.runId);
    invariant(canonicalize(group.identity) === canonicalize(identity), `inconsistent B run identity ${identity.runId}`);
    group.candidateIds.push(candidate.candidateId);
  }
  const runs = [...runGroups.values()].map(({ identity, candidateIds }) => ({ ...identity, frozenCandidateCount: candidateIds.length }))
    .sort((a, b) => a.runTimestampUtc.localeCompare(b.runTimestampUtc) || a.retainedPayloadId.localeCompare(b.retainedPayloadId) || a.runId.localeCompare(b.runId));
  invariant(runs.length === EXPECTED.retainedBRunCount, "retained B run count mismatch");
  invariant(new Set(runs.map((run) => run.runTimestampUtc)).size === EXPECTED.retainedBTimestampCount, "retained B timestamp count mismatch");
  invariant(new Set(runs.map((run) => run.runId)).size === runs.length && new Set(runs.map((run) => run.retainedPayloadId)).size === runs.length, "run identity collision");
  const payload27 = runs.find((run) => run.retainedPayloadId === "retained-payload-0027");
  const payload28 = runs.find((run) => run.retainedPayloadId === "retained-payload-0028");
  invariant(payload27 && payload28 && payload27.runId !== payload28.runId && payload27.runTimestampUtc === payload28.runTimestampUtc, "0027/0028 distinct equal-time invariant failed");
  const runById = new Map(runs.map((run) => [run.runId, run]));

  const acceptedIds = new Set(acceptedAssignments.map((record) => record.candidateObservationId));
  const unresolvedIds = new Set(unresolvedAssignments.map((record) => record.candidateObservationId));
  for (const event of events) {
    invariant(assessmentByEvent.has(event.eventClusterId), `missing Step-F assessment ${event.eventClusterId}`);
    for (const id of event.currentAcceptedMemberCandidateIds) invariant(acceptedIds.has(id) && !unresolvedIds.has(id), `invalid event member ${id}`);
  }
  invariant(events.reduce((sum, event) => sum + event.currentAcceptedMemberCandidateIds.length, 0) === EXPECTED.acceptedObservationCount, "event-member total mismatch");

  return {
    notesBytes,
    candidates,
    manual,
    origins,
    assignments,
    events,
    assessments,
    currentAssignments,
    acceptedAssignments,
    unresolvedAssignments,
    acceptedB,
    acceptedC,
    runs,
    runById,
    candidateById,
    manualById,
    originById,
    assignmentByCandidate,
    eventById,
    assessmentByEvent,
  };
}

function lifecyclePulse(assessment, currentCandidateIds) {
  const lifecycleById = new Map(assessment.observationLifecycle.map((record) => [record.candidateObservationId, record]));
  const records = currentCandidateIds.map((id) => lifecycleById.get(id));
  invariant(records.every(Boolean), `missing lifecycle evidence for ${assessment.eventClusterId}`);
  const materialStates = uniqueSorted(records
    .filter((record) => record.lifecycle.status === "assessed" && MATERIAL_PULSES.includes(record.lifecycle.value))
    .map((record) => record.lifecycle.value))
    .sort((a, b) => PULSE_ORDER.indexOf(a) - PULSE_ORDER.indexOf(b));
  const unknownIds = records.filter((record) => record.lifecycle.status === "unknown").map((record) => record.candidateObservationId).sort();
  if (materialStates.length) {
    return {
      status: "assessed",
      values: materialStates,
      primaryValue: materialStates.length === 1 ? materialStates[0] : null,
      structuralNoveltyGate: "pass",
      multipleQualifyingMaterialStates: materialStates.length > 1,
      evidenceCandidateIds: currentCandidateIds.slice(),
      unknownLifecycleCandidateIds: unknownIds,
    };
  }
  const allContinuing = records.every((record) => record.lifecycle.status === "assessed" && record.lifecycle.value === "continuing");
  if (allContinuing) {
    return {
      status: "assessed",
      values: ["continuing"],
      primaryValue: "continuing",
      structuralNoveltyGate: "fail",
      multipleQualifyingMaterialStates: false,
      evidenceCandidateIds: currentCandidateIds.slice(),
      unknownLifecycleCandidateIds: [],
    };
  }
  return {
    status: "unknown",
    values: [],
    primaryValue: null,
    structuralNoveltyGate: "indeterminate",
    multipleQualifyingMaterialStates: false,
    evidenceCandidateIds: currentCandidateIds.slice(),
    unknownLifecycleCandidateIds: unknownIds,
  };
}

function pointInTimeCorroboration(assessment, availableCandidateIds, inputs) {
  const availableOrigins = availableCandidateIds.map((id) => inputs.originById.get(id));
  invariant(availableOrigins.every(Boolean), `missing Step-D evidence ${assessment.eventClusterId}`);
  const assessedGroups = uniqueSorted(availableOrigins.map((origin) => valueOf(origin.independenceGroupId)));
  const unresolvedCandidateIds = availableOrigins
    .filter((origin) => origin.sourceOriginId.status !== "assessed" || origin.independenceGroupId.status !== "assessed")
    .map((origin) => origin.candidateObservationId)
    .sort();
  const unresolvedProvenanceRemains = unresolvedCandidateIds.length > 0;
  const finalConflict = assessment.corroborationStatus.status === "assessed" && assessment.corroborationStatus.value === "conflicting";
  const conflictBIds = finalConflict
    ? assessment.corroborationStatus.evidenceCandidateIds.filter((id) => inputs.manualById.get(id)?.chronologyEligible)
    : [];
  const availableSet = new Set(availableCandidateIds);
  const retainedConflictAvailable = finalConflict && conflictBIds.length > 0 && conflictBIds.every((id) => availableSet.has(id));
  const retractedOnly = assessment.corroborationStatus.status === "assessed" && assessment.corroborationStatus.value === "retracted-only";
  let corroborationStatus;
  if (retractedOnly) corroborationStatus = "retracted-only";
  else if (retainedConflictAvailable) corroborationStatus = "conflicting";
  else if (assessedGroups.length >= 2) corroborationStatus = "corroborated-independent";
  else if (unresolvedProvenanceRemains || assessedGroups.length === 0) corroborationStatus = "unknown-origin";
  else corroborationStatus = "single-origin";
  return {
    assessedIndependenceGroupLowerBound: assessedGroups.length,
    assessedIndependenceGroupIds: assessedGroups,
    exactIndependentSourceCount: unresolvedProvenanceRemains ? { status: "unknown", value: null } : { status: "assessed", value: assessedGroups.length },
    unresolvedProvenanceRemains,
    unresolvedProvenanceCandidateIds: unresolvedCandidateIds,
    retainedConflictAvailable,
    retractedOnly,
    corroborationStatus,
    evidenceCandidateIds: availableCandidateIds.slice(),
  };
}

function finalCorroboration(assessment) {
  const status = valueOf(assessment.corroborationStatus);
  return {
    assessedIndependenceGroupLowerBound: assessment.assessedIndependenceGroupLowerBound.value,
    assessedIndependenceGroupIds: [],
    exactIndependentSourceCount: structuredClone(assessment.independentSourceCount),
    unresolvedProvenanceRemains: assessment.independentSourceCount.status === "unknown",
    unresolvedProvenanceCandidateIds: [],
    retainedConflictAvailable: status === "conflicting",
    retractedOnly: status === "retracted-only",
    corroborationStatus: status,
    evidenceCandidateIds: assessment.corroborationStatus.evidenceCandidateIds.slice(),
  };
}

function buildPointInTime(inputs) {
  const acceptedBByEvent = new Map();
  const currentGroups = new Map();
  for (const { assignment, member } of inputs.acceptedB) {
    const eventClusterId = assignment.eventClusterId.value;
    if (!acceptedBByEvent.has(eventClusterId)) acceptedBByEvent.set(eventClusterId, []);
    acceptedBByEvent.get(eventClusterId).push(member);
    const key = `${eventClusterId}|${member.runId}`;
    if (!currentGroups.has(key)) currentGroups.set(key, { eventClusterId, runId: member.runId, members: [] });
    currentGroups.get(key).members.push(member);
  }

  const rows = [];
  for (const group of currentGroups.values()) {
    const run = inputs.runById.get(group.runId);
    invariant(run, `cluster/run references missing B run ${group.runId}`);
    const event = inputs.eventById.get(group.eventClusterId);
    const assessment = inputs.assessmentByEvent.get(group.eventClusterId);
    const currentMembers = group.members.slice().sort((a, b) => a.candidateObservationId.localeCompare(b.candidateObservationId));
    const currentCandidateIds = currentMembers.map((member) => member.candidateObservationId);
    const availableMembers = acceptedBByEvent.get(group.eventClusterId)
      .filter((member) => member.observedAt.status === "assessed" && member.observedAt.value <= run.runTimestampUtc)
      .sort((a, b) => a.observedAt.value.localeCompare(b.observedAt.value)
        || a.conservativeNormalizedSha256.localeCompare(b.conservativeNormalizedSha256)
        || a.candidateObservationId.localeCompare(b.candidateObservationId));
    invariant(currentMembers.every((member) => availableMembers.some((available) => available.candidateObservationId === member.candidateObservationId)), `current run excluded from accumulated evidence ${group.eventClusterId}`);
    const availableCandidateIds = availableMembers.map((member) => member.candidateObservationId);
    const availableSet = new Set(availableCandidateIds);
    const directMechanisms = [];
    const unavailableFinalDirectMechanisms = [];
    const finalDirectMechanisms = assessment.mechanisms.filter((mechanism) => mechanism.directness === "direct");
    for (const mechanism of finalDirectMechanisms) {
      const supportingEvidenceCandidateIds = mechanism.evidenceCandidateIds.filter((id) => availableSet.has(id) && inputs.manualById.get(id)?.chronologyEligible).sort();
      const diagnostic = {
        mechanismId: mechanism.mechanismId,
        channelId: MECHANISM_CHANNEL[mechanism.mechanismId],
        supportingEvidenceCandidateIds,
        finalEvidenceCandidateIds: mechanism.evidenceCandidateIds.slice(),
      };
      (supportingEvidenceCandidateIds.length ? directMechanisms : unavailableFinalDirectMechanisms).push(diagnostic);
    }
    let pointInTimeActionStage;
    if (assessment.actionStage.status !== "assessed") {
      pointInTimeActionStage = {
        status: "unknown",
        value: null,
        stageOrdinal: null,
        reasonCode: "final-step-f-stage-unknown",
        supportingEvidenceCandidateIds: [],
      };
    } else {
      const supportingEvidenceCandidateIds = assessment.actionStage.evidenceCandidateIds.filter((id) => availableSet.has(id) && inputs.manualById.get(id)?.chronologyEligible).sort();
      pointInTimeActionStage = supportingEvidenceCandidateIds.length
        ? {
          status: "assessed",
          value: assessment.actionStage.value,
          stageOrdinal: STAGE_ORDINAL[assessment.actionStage.value],
          reasonCode: null,
          supportingEvidenceCandidateIds,
        }
        : {
          status: "unknown",
          value: null,
          stageOrdinal: null,
          reasonCode: "final-stage-not-yet-evidenced",
          supportingEvidenceCandidateIds: [],
        };
    }
    rows.push({
      clusterRunId: `${group.eventClusterId}|${run.retainedPayloadId}`,
      eventClusterId: group.eventClusterId,
      runId: run.runId,
      retainedPayloadId: run.retainedPayloadId,
      runTimestampUtc: run.runTimestampUtc,
      currentRunCandidateIds: currentCandidateIds,
      availableCandidateIds,
      accumulatedEvidenceIncludesOtherEqualTimestampPayload: availableMembers.some((member) => member.runId !== run.runId && member.observedAt.value === run.runTimestampUtc),
      clusterComposition: event.chronologyEligibleMemberCount === 0 ? "C-only" : event.chronologyIneligibleMemberCount > 0 ? "mixed" : "B-only",
      completeHistoryTemporallyIncomplete: event.chronologyIneligibleMemberCount > 0,
      chronologyIneligibleMemberCountIgnored: event.chronologyIneligibleMemberCount,
      finalDirectMechanismCount: finalDirectMechanisms.length,
      pointInTimeDirectMechanisms: directMechanisms,
      unavailableFinalDirectMechanisms,
      pointInTimeActionStage,
      pointInTimeCorroboration: pointInTimeCorroboration(assessment, availableCandidateIds, inputs),
      runLifecyclePulse: lifecyclePulse(assessment, currentCandidateIds),
    });
  }
  const runOrder = new Map(inputs.runs.map((run, index) => [run.runId, index]));
  rows.sort((a, b) => runOrder.get(a.runId) - runOrder.get(b.runId) || a.eventClusterId.localeCompare(b.eventClusterId));

  const opportunities = [];
  const naiveOpportunities = [];
  for (const row of rows) {
    const assessment = inputs.assessmentByEvent.get(row.eventClusterId);
    for (const mechanism of row.pointInTimeDirectMechanisms) {
      opportunities.push({
        opportunityId: `${row.clusterRunId}|${mechanism.channelId}`,
        clusterRunId: row.clusterRunId,
        eventClusterId: row.eventClusterId,
        runId: row.runId,
        retainedPayloadId: row.retainedPayloadId,
        runTimestampUtc: row.runTimestampUtc,
        channelId: mechanism.channelId,
        mechanismId: mechanism.mechanismId,
        supportingEvidenceCandidateIds: mechanism.supportingEvidenceCandidateIds,
        actionStage: row.pointInTimeActionStage,
        corroboration: row.pointInTimeCorroboration,
        lifecyclePulse: row.runLifecyclePulse,
      });
    }
    for (const mechanism of assessment.mechanisms.filter((item) => item.directness === "direct")) {
      naiveOpportunities.push({
        opportunityId: `${row.clusterRunId}|${MECHANISM_CHANNEL[mechanism.mechanismId]}`,
        clusterRunId: row.clusterRunId,
        eventClusterId: row.eventClusterId,
        runId: row.runId,
        retainedPayloadId: row.retainedPayloadId,
        runTimestampUtc: row.runTimestampUtc,
        channelId: MECHANISM_CHANNEL[mechanism.mechanismId],
        mechanismId: mechanism.mechanismId,
        supportingEvidenceCandidateIds: mechanism.evidenceCandidateIds.slice(),
        actionStage: assessment.actionStage.status === "assessed"
          ? { status: "assessed", value: assessment.actionStage.value, stageOrdinal: STAGE_ORDINAL[assessment.actionStage.value] }
          : { status: "unknown", value: null, stageOrdinal: null },
        corroboration: finalCorroboration(assessment),
        lifecyclePulse: row.runLifecyclePulse,
      });
    }
  }
  opportunities.sort((a, b) => a.opportunityId.localeCompare(b.opportunityId));
  naiveOpportunities.sort((a, b) => a.opportunityId.localeCompare(b.opportunityId));
  invariant(new Set(opportunities.map((row) => row.opportunityId)).size === opportunities.length, "duplicate point-in-time opportunity");
  invariant(new Set(naiveOpportunities.map((row) => row.opportunityId)).size === naiveOpportunities.length, "duplicate naive opportunity");
  return { rows, opportunities, naiveOpportunities };
}

function evidencePass(opportunity, evidenceVariantId) {
  const evidence = EVIDENCE_VARIANTS[evidenceVariantId];
  if (evidenceVariantId === "E3") {
    return opportunity.corroboration.assessedIndependenceGroupLowerBound >= 1
      && !opportunity.corroboration.retainedConflictAvailable
      && !opportunity.corroboration.retractedOnly;
  }
  return evidence.allowedCorroboration.includes(opportunity.corroboration.corroborationStatus);
}

function stagePass(opportunity, stageVariantId) {
  return opportunity.actionStage.status === "assessed"
    && STAGE_VARIANTS[stageVariantId].allowedStages.includes(opportunity.actionStage.value);
}

function cutoffPass(opportunity, cutoff) {
  return opportunity.actionStage.status === "assessed" && opportunity.actionStage.stageOrdinal >= cutoff;
}

function lifecyclePass(opportunity) {
  return opportunity.lifecyclePulse.structuralNoveltyGate === "pass";
}

function breadthSummary(qualifyingRows, runs) {
  const counts = [];
  for (const run of runs) {
    for (const channelId of CHANNELS) counts.push(qualifyingRows.filter((row) => row.runId === run.runId && row.channelId === channelId).length);
  }
  return {
    denominatorActiveRunChannelCells: runs.length * CHANNELS.length,
    meanQualifyingClusterCountPerActiveRunChannel: distribution(counts).mean,
    medianQualifyingClusterCountPerActiveRunChannel: distribution(counts).median,
    maximumQualifyingClusterCountPerActiveRunChannel: distribution(counts).maximum,
    zeroOneMultipleDistribution: {
      zero: counts.filter((count) => count === 0).length,
      one: counts.filter((count) => count === 1).length,
      multiple: counts.filter((count) => count > 1).length,
    },
    exactCountDistribution: countValues(counts),
  };
}

function qualificationSummary(qualifyingRows, runs) {
  const byChannel = Object.fromEntries(CHANNELS.map((channelId) => {
    const rows = qualifyingRows.filter((row) => row.channelId === channelId);
    return [channelId, {
      qualifyingClusterRunChannelCount: rows.length,
      distinctQualifyingClusterCount: new Set(rows.map((row) => row.eventClusterId)).size,
      retainedRunsWithQualification: new Set(rows.map((row) => row.runId)).size,
    }];
  }));
  const byRun = runs.map((run) => {
    const rows = qualifyingRows.filter((row) => row.runId === run.runId);
    return {
      runId: run.runId,
      retainedPayloadId: run.retainedPayloadId,
      runTimestampUtc: run.runTimestampUtc,
      qualifyingClusterRunChannelCount: rows.length,
      qualifyingChannelCount: new Set(rows.map((row) => row.channelId)).size,
      qualifyingChannels: uniqueSorted(rows.map((row) => row.channelId)),
      distinctQualifyingClusterCount: new Set(rows.map((row) => row.eventClusterId)).size,
    };
  });
  const byClusterRun = new Map();
  for (const row of qualifyingRows) {
    if (!byClusterRun.has(row.clusterRunId)) byClusterRun.set(row.clusterRunId, []);
    byClusterRun.get(row.clusterRunId).push(row);
  }
  const multiChannelCases = [...byClusterRun.entries()]
    .filter(([, rows]) => new Set(rows.map((row) => row.channelId)).size > 1)
    .map(([clusterRunId, rows]) => ({
      clusterRunId,
      eventClusterId: rows[0].eventClusterId,
      retainedPayloadId: rows[0].retainedPayloadId,
      channelIds: uniqueSorted(rows.map((row) => row.channelId)),
    }))
    .sort((a, b) => a.clusterRunId.localeCompare(b.clusterRunId));
  return {
    qualifyingClusterRunChannelCount: qualifyingRows.length,
    qualifyingRowIds: qualifyingRows.map((row) => row.opportunityId).sort(),
    distinctQualifyingClusterCount: new Set(qualifyingRows.map((row) => row.eventClusterId)).size,
    distinctQualifyingClusterIds: uniqueSorted(qualifyingRows.map((row) => row.eventClusterId)),
    qualifyingFrequencyByChannel: byChannel,
    qualifyingFrequencyByRetainedRun: byRun,
    runsWithZeroQualifyingChannels: byRun.filter((run) => run.qualifyingChannelCount === 0).map((run) => run.retainedPayloadId),
    runsWithAtLeastOneQualifyingChannel: byRun.filter((run) => run.qualifyingChannelCount > 0).map((run) => run.retainedPayloadId),
    multiChannelClusterRunCount: multiChannelCases.length,
    distinctClustersContributingToMultipleChannels: uniqueSorted(multiChannelCases.map((row) => row.eventClusterId)),
    multiChannelClusterRunCases: multiChannelCases,
    channelBreadth: breadthSummary(qualifyingRows, runs),
  };
}

function evaluateCandidates(opportunities, runs) {
  const candidateA = [];
  for (const evidenceVariantId of Object.keys(EVIDENCE_VARIANTS)) {
    for (const stageVariantId of Object.keys(STAGE_VARIANTS)) {
      const base = opportunities.filter((row) => evidencePass(row, evidenceVariantId) && stagePass(row, stageVariantId));
      const withLifecycle = base.filter(lifecyclePass);
      const withoutLifecycle = base;
      const lifecycleRemoved = setDifference(new Set(withoutLifecycle.map((row) => row.opportunityId)), new Set(withLifecycle.map((row) => row.opportunityId)));
      candidateA.push({
        candidateId: `A-${evidenceVariantId}-${stageVariantId}`,
        evidenceVariantId,
        stageVariantId,
        criteria: {
          directMechanismRequired: true,
          evidence: EVIDENCE_VARIANTS[evidenceVariantId],
          actionStage: STAGE_VARIANTS[stageVariantId],
          lifecyclePulseRequired: MATERIAL_PULSES.slice(),
        },
        withLifecycle: qualificationSummary(withLifecycle, runs),
        diagnosticNoLifecycle: qualificationSummary(withoutLifecycle, runs),
        lifecycleClauseEffect: {
          qualifyingCountWithLifecycle: withLifecycle.length,
          qualifyingCountWithoutLifecycle: withoutLifecycle.length,
          rowsRemovedByLifecycleClause: lifecycleRemoved.length,
          removedRowIds: lifecycleRemoved,
        },
      });
    }
  }

  const candidateB = [];
  for (const evidenceVariantId of Object.keys(EVIDENCE_VARIANTS)) {
    let previousRows = null;
    for (const cutoff of CUTOFFS) {
      const rows = opportunities.filter((row) => evidencePass(row, evidenceVariantId) && cutoffPass(row, cutoff));
      const currentSet = new Set(rows.map((row) => row.opportunityId));
      const lost = previousRows ? setDifference(previousRows, currentSet) : [];
      candidateB.push({
        candidateId: `B-${evidenceVariantId}-C${cutoff}`,
        evidenceVariantId,
        stageOrdinalCutoff: cutoff,
        criteria: {
          directMechanismRequired: true,
          evidence: EVIDENCE_VARIANTS[evidenceVariantId],
          stageOrdinalCandidate: STAGE_ORDINAL,
          stageOrdinalAtLeast: cutoff,
          unknownStagePasses: false,
          lifecycleRequired: false,
          otherScoreComponents: [],
        },
        result: qualificationSummary(rows, runs),
        cutoffChangeFromPreviousMorePermissive: previousRows
          ? {
            priorCutoff: cutoff - 1,
            lostClusterRunChannelCount: lost.length,
            lostRowIds: lost,
            affectedClusterIds: uniqueSorted(lost.map((id) => opportunities.find((row) => row.opportunityId === id).eventClusterId)),
          }
          : { priorCutoff: null, lostClusterRunChannelCount: 0, lostRowIds: [], affectedClusterIds: [] },
      });
      previousRows = currentSet;
    }
  }
  return { candidateA, candidateB };
}

function buildCandidateC(candidateA, opportunities, runs) {
  const opportunityById = new Map(opportunities.map((row) => [row.opportunityId, row]));
  const variants = candidateA.map((variant) => {
    const qualified = variant.withLifecycle.qualifyingRowIds.map((id) => opportunityById.get(id));
    const rankings = [];
    for (const run of runs) {
      for (const channelId of CHANNELS) {
        const rows = qualified.filter((row) => row.runId === run.runId && row.channelId === channelId)
          .sort((a, b) => b.actionStage.stageOrdinal - a.actionStage.stageOrdinal || a.eventClusterId.localeCompare(b.eventClusterId));
        const ordinalCounts = new Map();
        for (const row of rows) ordinalCounts.set(row.actionStage.stageOrdinal, (ordinalCounts.get(row.actionStage.stageOrdinal) ?? 0) + 1);
        const tieOrdinals = [...ordinalCounts.entries()].filter(([, count]) => count > 1).map(([ordinal, count]) => ({ stageOrdinal: ordinal, tiedClusterCount: count })).sort((a, b) => b.stageOrdinal - a.stageOrdinal);
        rankings.push({
          runId: run.runId,
          retainedPayloadId: run.retainedPayloadId,
          runTimestampUtc: run.runTimestampUtc,
          channelId,
          qualifyingClusterCount: rows.length,
          leadingQualifyingClusterId: rows[0]?.eventClusterId ?? null,
          leadingStageOrdinal: rows[0]?.actionStage.stageOrdinal ?? null,
          deterministicRankingOrder: rows.map((row) => ({ eventClusterId: row.eventClusterId, stageOrdinal: row.actionStage.stageOrdinal })),
          tieOrdinals,
          topRankTie: rows.length > 1 && rows[0].actionStage.stageOrdinal === rows[1].actionStage.stageOrdinal,
        });
      }
    }
    return {
      candidateId: `C-${variant.evidenceVariantId}-${variant.stageVariantId}`,
      structuralVariantId: variant.candidateId,
      eligibilityIdenticalToStructuralVariant: true,
      qualifyingClusterRunChannelCount: variant.withLifecycle.qualifyingClusterRunChannelCount,
      rankingTieCellCount: rankings.filter((row) => row.tieOrdinals.length > 0).length,
      topRankTieCellCount: rankings.filter((row) => row.topRankTie).length,
      channelBreadth: variant.withLifecycle.channelBreadth,
      rankings,
    };
  });

  const changes = [];
  for (const run of runs) {
    for (const channelId of CHANNELS) {
      const sequence = variants.map((variant) => {
        const ranking = variant.rankings.find((row) => row.runId === run.runId && row.channelId === channelId);
        return { candidateId: variant.candidateId, leader: ranking.leadingQualifyingClusterId };
      });
      const nonNullLeaders = uniqueSorted(sequence.map((entry) => entry.leader).filter(Boolean));
      let changesIncludingNull = 0;
      let nonNullToDifferentNonNull = 0;
      for (let index = 1; index < sequence.length; index += 1) {
        if (sequence[index].leader !== sequence[index - 1].leader) changesIncludingNull += 1;
        if (sequence[index].leader && sequence[index - 1].leader && sequence[index].leader !== sequence[index - 1].leader) nonNullToDifferentNonNull += 1;
      }
      changes.push({
        retainedPayloadId: run.retainedPayloadId,
        channelId,
        distinctNonNullLeaderCount: nonNullLeaders.length,
        distinctNonNullLeaderIds: nonNullLeaders,
        adjacentVariantLeaderChangesIncludingNull: changesIncludingNull,
        adjacentVariantNonNullLeaderChanges: nonNullToDifferentNonNull,
        leaderSequence: sequence,
      });
    }
  }
  return {
    variants,
    leaderChangeDiagnostics: {
      runChannelCellsEvaluated: changes.length,
      cellsWithNoLeaderInAnyVariant: changes.filter((row) => row.distinctNonNullLeaderCount === 0).length,
      cellsWithExactlyOneDistinctLeader: changes.filter((row) => row.distinctNonNullLeaderCount === 1).length,
      cellsWithMultipleDistinctLeaders: changes.filter((row) => row.distinctNonNullLeaderCount > 1).length,
      totalAdjacentVariantLeaderChangesIncludingNull: changes.reduce((sum, row) => sum + row.adjacentVariantLeaderChangesIncludingNull, 0),
      totalAdjacentVariantNonNullLeaderChanges: changes.reduce((sum, row) => sum + row.adjacentVariantNonNullLeaderChanges, 0),
      cells: changes,
    },
  };
}

function compareCandidates(candidateA, candidateB, opportunities) {
  const universe = new Set(opportunities.map((row) => row.opportunityId));
  const paired = [];
  for (const a of candidateA) {
    const cutoff = STAGE_TO_CUTOFF[a.stageVariantId];
    const b = candidateB.find((row) => row.evidenceVariantId === a.evidenceVariantId && row.stageOrdinalCutoff === cutoff);
    const aset = new Set(a.withLifecycle.qualifyingRowIds);
    const bset = new Set(b.result.qualifyingRowIds);
    const aNotB = setDifference(aset, bset);
    const bNotA = setDifference(bset, aset);
    const both = setIntersection(aset, bset);
    const neither = [...universe].filter((id) => !aset.has(id) && !bset.has(id)).sort();
    paired.push({
      structuralCandidateId: a.candidateId,
      scalarCandidateId: b.candidateId,
      qualifyingUnderAOnly: { count: aNotB.length, rowIds: aNotB },
      qualifyingUnderBOnly: { count: bNotA.length, rowIds: bNotA },
      qualifyingUnderBoth: { count: both.length, rowIds: both },
      qualifyingUnderNeither: { count: neither.length, rowIds: neither },
      rowsChangedSolelyBecauseCandidateARequiresLifecycle: { count: bNotA.length, rowIds: bNotA },
    });
  }

  const evidenceChanges = [];
  for (const stageVariantId of Object.keys(STAGE_VARIANTS)) {
    for (const [fromEvidence, toEvidence] of [["E1", "E2"], ["E2", "E3"]]) {
      const fromA = candidateA.find((row) => row.evidenceVariantId === fromEvidence && row.stageVariantId === stageVariantId);
      const toA = candidateA.find((row) => row.evidenceVariantId === toEvidence && row.stageVariantId === stageVariantId);
      const fromB = candidateB.find((row) => row.evidenceVariantId === fromEvidence && row.stageOrdinalCutoff === STAGE_TO_CUTOFF[stageVariantId]);
      const toB = candidateB.find((row) => row.evidenceVariantId === toEvidence && row.stageOrdinalCutoff === STAGE_TO_CUTOFF[stageVariantId]);
      for (const [family, fromId, toId, fromRows, toRows] of [
        ["A", fromA.candidateId, toA.candidateId, fromA.withLifecycle.qualifyingRowIds, toA.withLifecycle.qualifyingRowIds],
        ["B", fromB.candidateId, toB.candidateId, fromB.result.qualifyingRowIds, toB.result.qualifyingRowIds],
      ]) {
        const added = setDifference(new Set(toRows), new Set(fromRows));
        const removed = setDifference(new Set(fromRows), new Set(toRows));
        evidenceChanges.push({ family, fromCandidateId: fromId, toCandidateId: toId, addedCount: added.length, removedCount: removed.length, addedRowIds: added, removedRowIds: removed });
      }
    }
  }

  const stageChanges = [];
  const stages = Object.keys(STAGE_VARIANTS);
  for (const evidenceVariantId of Object.keys(EVIDENCE_VARIANTS)) {
    for (let index = 1; index < stages.length; index += 1) {
      const fromStage = stages[index - 1];
      const toStage = stages[index];
      const fromA = candidateA.find((row) => row.evidenceVariantId === evidenceVariantId && row.stageVariantId === fromStage);
      const toA = candidateA.find((row) => row.evidenceVariantId === evidenceVariantId && row.stageVariantId === toStage);
      const fromB = candidateB.find((row) => row.evidenceVariantId === evidenceVariantId && row.stageOrdinalCutoff === STAGE_TO_CUTOFF[fromStage]);
      const toB = candidateB.find((row) => row.evidenceVariantId === evidenceVariantId && row.stageOrdinalCutoff === STAGE_TO_CUTOFF[toStage]);
      for (const [family, fromId, toId, fromRows, toRows] of [
        ["A", fromA.candidateId, toA.candidateId, fromA.withLifecycle.qualifyingRowIds, toA.withLifecycle.qualifyingRowIds],
        ["B", fromB.candidateId, toB.candidateId, fromB.result.qualifyingRowIds, toB.result.qualifyingRowIds],
      ]) {
        const added = setDifference(new Set(toRows), new Set(fromRows));
        stageChanges.push({ family, fromCandidateId: fromId, toCandidateId: toId, addedCount: added.length, addedRowIds: added });
      }
    }
  }
  return { pairedStructuralScalar: paired, evidenceVariantChanges: evidenceChanges, stageBoundaryChanges: stageChanges };
}

function legacyCategories(candidate) {
  const primary = valueOf(candidate.legacyAssessment.category);
  const others = valueOf(candidate.legacyAssessment.otherCategories) ?? [];
  return uniqueSorted([primary, ...others].filter(Boolean));
}

function rowQualifierIds(clusterRunId, variants, family) {
  return variants.filter((variant) => {
    const rowIds = family === "A" ? variant.withLifecycle.qualifyingRowIds : variant.result.qualifyingRowIds;
    return rowIds.some((id) => id.startsWith(`${clusterRunId}|`));
  }).map((variant) => variant.candidateId);
}

function selectionObservationRows(records, inputs, pointInTime, candidateA, candidateB, includeLegacyCategories) {
  const clusterRunByKey = new Map(pointInTime.rows.map((row) => [`${row.eventClusterId}|${row.runId}`, row]));
  return records.slice().sort((a, b) => a.observedAt.value.localeCompare(b.observedAt.value) || a.candidateObservationId.localeCompare(b.candidateObservationId)).map((manual) => {
    const assignment = inputs.assignmentByCandidate.get(manual.candidateObservationId);
    const candidate = inputs.candidateById.get(manual.candidateObservationId);
    invariant(assignment && candidate, `selection comparison evidence missing ${manual.candidateObservationId}`);
    if (assignment.assignmentDecision !== "accepted") {
      return {
        candidateObservationId: manual.candidateObservationId,
        runId: manual.runId,
        retainedPayloadId: manual.retainedPayloadIdentity.value.retainedPayloadId,
        runTimestampUtc: manual.observedAt.value,
        assignmentDecision: assignment.assignmentDecision,
        eventClusterId: null,
        legacyCategories: includeLegacyCategories ? legacyCategories(candidate) : [],
        pointInTimeDirectChannels: [],
        finalDirectMechanismsUnavailablePointInTime: [],
        qualifyingCandidateAIds: [],
        qualifyingCandidateBIds: [],
      };
    }
    const eventClusterId = assignment.eventClusterId.value;
    const row = clusterRunByKey.get(`${eventClusterId}|${manual.runId}`);
    invariant(row, `accepted B observation lacks cluster/run row ${manual.candidateObservationId}`);
    return {
      candidateObservationId: manual.candidateObservationId,
      runId: manual.runId,
      retainedPayloadId: manual.retainedPayloadIdentity.value.retainedPayloadId,
      runTimestampUtc: manual.observedAt.value,
      assignmentDecision: "accepted",
      eventClusterId,
      clusterRunId: row.clusterRunId,
      legacyCategories: includeLegacyCategories ? legacyCategories(candidate) : [],
      pointInTimeDirectChannels: row.pointInTimeDirectMechanisms.map((mechanism) => mechanism.channelId).sort(),
      finalDirectMechanismsUnavailablePointInTime: row.unavailableFinalDirectMechanisms.map((mechanism) => mechanism.mechanismId).sort(),
      pointInTimeActionStage: row.pointInTimeActionStage.status === "assessed" ? row.pointInTimeActionStage.value : null,
      pointInTimeCorroboration: row.pointInTimeCorroboration.corroborationStatus,
      runLifecyclePulse: row.runLifecyclePulse.status === "assessed" ? row.runLifecyclePulse.values : [],
      qualifyingCandidateAIds: rowQualifierIds(row.clusterRunId, candidateA, "A"),
      qualifyingCandidateBIds: rowQualifierIds(row.clusterRunId, candidateB, "B"),
    };
  });
}

function blockerForObservation(observation, variant, family, pointInTime, inputs) {
  if (observation.assignmentDecision !== "accepted") return "unresolved-step-e";
  const row = pointInTime.rows.find((item) => item.clusterRunId === observation.clusterRunId);
  const finalAssessment = inputs.assessmentByEvent.get(row.eventClusterId);
  if (!finalAssessment.mechanisms.some((mechanism) => mechanism.directness === "direct")) return "zero-direct-mechanism";
  if (!row.pointInTimeDirectMechanisms.length) return "point-in-time-direct-unavailable";
  const opportunities = pointInTime.opportunities.filter((item) => item.clusterRunId === row.clusterRunId);
  if (!opportunities.some((item) => evidencePass(item, variant.evidenceVariantId))) return "evidence-sufficiency";
  if (family === "A") {
    if (!opportunities.some((item) => evidencePass(item, variant.evidenceVariantId) && stagePass(item, variant.stageVariantId))) return "action-stage";
    if (!opportunities.some((item) => evidencePass(item, variant.evidenceVariantId) && stagePass(item, variant.stageVariantId) && lifecyclePass(item))) return "lifecycle";
  } else if (!opportunities.some((item) => evidencePass(item, variant.evidenceVariantId) && cutoffPass(item, variant.stageOrdinalCutoff))) return "action-stage";
  return "qualifies";
}

function comparisonAggregate(observationRows, variants, family, pointInTime, inputs) {
  return variants.map((variant) => {
    const qualifyingIds = family === "A" ? new Set(variant.withLifecycle.qualifyingRowIds) : new Set(variant.result.qualifyingRowIds);
    const assigned = observationRows.filter((row) => row.assignmentDecision === "accepted");
    const qualifyingObservations = assigned.filter((row) => (family === "A" ? row.qualifyingCandidateAIds : row.qualifyingCandidateBIds).includes(variant.candidateId));
    const qualifyingOpportunityOccurrences = [];
    for (const observation of assigned) {
      for (const id of qualifyingIds) if (id.startsWith(`${observation.clusterRunId}|`)) qualifyingOpportunityOccurrences.push(id);
    }
    const uniqueCases = uniqueSorted(qualifyingOpportunityOccurrences);
    const blockers = assigned.map((row) => blockerForObservation(row, variant, family, pointInTime, inputs));
    return {
      candidateId: variant.candidateId,
      assignedObservationDenominator: assigned.length,
      qualifyingObservationCount: qualifyingObservations.length,
      distinctQualifyingClusterCount: new Set(qualifyingObservations.map((row) => row.eventClusterId)).size,
      qualifyingClusterRunChannelCaseCount: uniqueCases.length,
      qualifyingObservationChannelOccurrences: qualifyingOpportunityOccurrences.length,
      repeatedObservationChannelOccurrencesCollapsed: qualifyingOpportunityOccurrences.length - uniqueCases.length,
      blockerCounts: countValues(blockers, ["qualifies", "zero-direct-mechanism", "point-in-time-direct-unavailable", "evidence-sufficiency", "action-stage", "lifecycle"]),
    };
  });
}

function buildLegacyComparison(inputs, pointInTime, candidateA, candidateB) {
  const selected = inputs.manual.filter((record) => record.selectionReasons.includes("reproduced-legacy-top15"));
  const observations = selectionObservationRows(selected, inputs, pointInTime, candidateA, candidateB, true);
  const assigned = observations.filter((row) => row.assignmentDecision === "accepted");
  const unresolved = observations.filter((row) => row.assignmentDecision !== "accepted");
  const baselineOccurrences = [];
  const baselineOccurrenceGroups = new Map();
  for (const observation of assigned) {
    const row = pointInTime.rows.find((item) => item.clusterRunId === observation.clusterRunId);
    for (const mechanism of row.pointInTimeDirectMechanisms) {
      const key = `${row.clusterRunId}|${mechanism.channelId}`;
      baselineOccurrences.push(key);
      if (!baselineOccurrenceGroups.has(key)) baselineOccurrenceGroups.set(key, []);
      baselineOccurrenceGroups.get(key).push(observation.candidateObservationId);
    }
  }
  const baselineUnique = uniqueSorted(baselineOccurrences);
  const repeatedObservationIds = uniqueSorted([...baselineOccurrenceGroups.values()].flatMap((ids) => ids.slice().sort().slice(1)));
  const zeroDirect = assigned.filter((observation) => !inputs.assessmentByEvent.get(observation.eventClusterId).mechanisms.some((mechanism) => mechanism.directness === "direct"));
  const timingUnavailable = assigned.filter((observation) => observation.pointInTimeDirectChannels.length === 0 && inputs.assessmentByEvent.get(observation.eventClusterId).mechanisms.some((mechanism) => mechanism.directness === "direct"));
  return {
    status: "reproduced-audit-comparison-not-exact-historical-output",
    inputObservationCount: selected.length,
    assignedObservationCount: assigned.length,
    unresolvedFromStepECount: unresolved.length,
    unresolvedCandidateObservationIds: unresolved.map((row) => row.candidateObservationId).sort(),
    legacyCategoryDistribution: countValues(observations.flatMap((row) => row.legacyCategories)),
    pointInTimeDirectObservationChannelOccurrences: baselineOccurrences.length,
    uniquePointInTimeClusterRunChannelCases: baselineUnique.length,
    repeatedSelectedObservationOccurrencesCollapsedWithinClusterRunChannel: baselineOccurrences.length - baselineUnique.length,
    distinctSelectedObservationIdsCollapsedAtLeastOnceWithinClusterRunChannel: repeatedObservationIds.length,
    selectedObservationIdsCollapsedAtLeastOnceWithinClusterRunChannel: repeatedObservationIds,
    observationsBlockedForZeroDirectMechanism: zeroDirect.length,
    zeroDirectCandidateObservationIds: zeroDirect.map((row) => row.candidateObservationId).sort(),
    observationsWhoseFinalDirectMechanismWasNotYetEvidenced: timingUnavailable.length,
    finalDirectNotYetEvidencedCandidateObservationIds: timingUnavailable.map((row) => row.candidateObservationId).sort(),
    candidateAResults: comparisonAggregate(observations, candidateA, "A", pointInTime, inputs),
    candidateBResults: comparisonAggregate(observations, candidateB, "B", pointInTime, inputs),
    observations,
  };
}

function buildControlComparison(inputs, pointInTime, candidateA, candidateB) {
  const controls = inputs.manual.filter((record) => record.selectionReasons.some((reason) => reason.startsWith("unmatched-control-")));
  const observations = selectionObservationRows(controls, inputs, pointInTime, candidateA, candidateB, false);
  const assigned = observations.filter((row) => row.assignmentDecision === "accepted");
  const direct = assigned.filter((row) => row.pointInTimeDirectChannels.length > 0);
  const strongStage = direct.filter((row) => ["implemented", "impact-observed"].includes(row.pointInTimeActionStage));
  const resolvedEvidence = direct.filter((row) => ["single-origin", "corroborated-independent"].includes(row.pointInTimeCorroboration));
  const strictS1 = assigned.filter((row) => row.qualifyingCandidateAIds.includes("A-E1-S1"));
  const strictS2 = assigned.filter((row) => row.qualifyingCandidateAIds.includes("A-E1-S2"));
  return {
    inputObservationCount: controls.length,
    assignedObservationCount: assigned.length,
    unresolvedFromStepECount: controls.length - assigned.length,
    assignedWithPointInTimeDirectMechanism: direct.length,
    assignedWithImplementedOrImpactStageAndDirectMechanism: strongStage.length,
    assignedWithResolvedEvidenceAndDirectMechanism: resolvedEvidence.length,
    observationsQualifyingStrictestAE1S1: strictS1.length,
    distinctClustersQualifyingStrictestAE1S1: new Set(strictS1.map((row) => row.eventClusterId)).size,
    observationsQualifyingAE1S2: strictS2.length,
    distinctClustersQualifyingAE1S2: new Set(strictS2.map((row) => row.eventClusterId)).size,
    candidateAResults: comparisonAggregate(observations, candidateA, "A", pointInTime, inputs),
    candidateBResults: comparisonAggregate(observations, candidateB, "B", pointInTime, inputs),
    observations,
  };
}

function finalEvidencePass(assessment, evidenceVariantId) {
  const diagnostic = {
    corroboration: {
      corroborationStatus: valueOf(assessment.corroborationStatus),
      assessedIndependenceGroupLowerBound: assessment.assessedIndependenceGroupLowerBound.value,
      retainedConflictAvailable: valueOf(assessment.corroborationStatus) === "conflicting",
      retractedOnly: valueOf(assessment.corroborationStatus) === "retracted-only",
    },
  };
  return evidencePass(diagnostic, evidenceVariantId);
}

function buildFidelityC(inputs, pointInTime) {
  const cOnly = inputs.events.filter((event) => event.chronologyEligibleMemberCount === 0).map((event) => {
    const assessment = inputs.assessmentByEvent.get(event.eventClusterId);
    return {
      eventClusterId: event.eventClusterId,
      acceptedChronologyIneligibleMemberCount: event.chronologyIneligibleMemberCount,
      historicalRunExcluded: true,
      directMechanismChannels: assessment.mechanisms.filter((mechanism) => mechanism.directness === "direct").map((mechanism) => ({ mechanismId: mechanism.mechanismId, channelId: MECHANISM_CHANNEL[mechanism.mechanismId] })),
      finalCorroborationStatus: valueOf(assessment.corroborationStatus),
      finalAssessedIndependenceGroupLowerBound: assessment.assessedIndependenceGroupLowerBound.value,
      finalEvidenceVariantsPassed: Object.keys(EVIDENCE_VARIANTS).filter((id) => finalEvidencePass(assessment, id)),
      finalActionStage: valueOf(assessment.actionStage),
      finalStageVariantsPassed: assessment.actionStage.status === "assessed" ? Object.keys(STAGE_VARIANTS).filter((id) => STAGE_VARIANTS[id].allowedStages.includes(assessment.actionStage.value)) : [],
      chronologyReason: "No run synthesized; Fidelity-C observation time is unknown.",
    };
  });
  const mixed = inputs.events.filter((event) => event.chronologyEligibleMemberCount > 0 && event.chronologyIneligibleMemberCount > 0).map((event) => ({
    eventClusterId: event.eventClusterId,
    acceptedBMemberCount: event.chronologyEligibleMemberCount,
    ignoredCMemberCount: event.chronologyIneligibleMemberCount,
    evaluatedBOnlyClusterRunIds: pointInTime.rows.filter((row) => row.eventClusterId === event.eventClusterId).map((row) => row.clusterRunId),
    completeHistoryTemporallyIncomplete: true,
    rule: "Only accepted chronology-eligible B evidence enters historical mechanism, stage, corroboration, and lifecycle eligibility.",
  }));
  return {
    cOnlyClusterCountExcludedFromHistoricalRuns: cOnly.length,
    cOnlyAcceptedObservationCountExcluded: cOnly.reduce((sum, row) => sum + row.acceptedChronologyIneligibleMemberCount, 0),
    cOnlyStaticDiagnostics: cOnly,
    mixedClusterCount: mixed.length,
    mixedAcceptedCObservationCountIgnored: mixed.reduce((sum, row) => sum + row.ignoredCMemberCount, 0),
    mixedBOnlyPointInTimeClusterRunCaseCount: mixed.reduce((sum, row) => sum + row.evaluatedBOnlyClusterRunIds.length, 0),
    mixedDiagnostics: mixed,
  };
}

function buildTimingDiagnostics(inputs, pointInTime, actualCandidates, naiveCandidates, legacyComparison) {
  const directUnavailable = pointInTime.rows.flatMap((row) => row.unavailableFinalDirectMechanisms.map((mechanism) => ({
    clusterRunId: row.clusterRunId,
    eventClusterId: row.eventClusterId,
    retainedPayloadId: row.retainedPayloadId,
    mechanismId: mechanism.mechanismId,
    channelId: mechanism.channelId,
  })));
  const stageUnavailable = pointInTime.rows.filter((row) => inputs.assessmentByEvent.get(row.eventClusterId).actionStage.status === "assessed" && row.pointInTimeActionStage.status !== "assessed");
  const candidateDifferences = [];
  for (const actual of actualCandidates.candidateA) {
    const naive = naiveCandidates.candidateA.find((row) => row.candidateId === actual.candidateId);
    const actualSet = new Set(actual.withLifecycle.qualifyingRowIds);
    const naiveSet = new Set(naive.withLifecycle.qualifyingRowIds);
    const onlyActual = setDifference(actualSet, naiveSet);
    const onlyNaive = setDifference(naiveSet, actualSet);
    candidateDifferences.push({ candidateId: actual.candidateId, family: "A", pointInTimeOnlyCount: onlyActual.length, naiveBackProjectionOnlyCount: onlyNaive.length, pointInTimeOnlyRowIds: onlyActual, naiveBackProjectionOnlyRowIds: onlyNaive });
  }
  for (const actual of actualCandidates.candidateB) {
    const naive = naiveCandidates.candidateB.find((row) => row.candidateId === actual.candidateId);
    const actualSet = new Set(actual.result.qualifyingRowIds);
    const naiveSet = new Set(naive.result.qualifyingRowIds);
    const onlyActual = setDifference(actualSet, naiveSet);
    const onlyNaive = setDifference(naiveSet, actualSet);
    candidateDifferences.push({ candidateId: actual.candidateId, family: "B", pointInTimeOnlyCount: onlyActual.length, naiveBackProjectionOnlyCount: onlyNaive.length, pointInTimeOnlyRowIds: onlyActual, naiveBackProjectionOnlyRowIds: onlyNaive });
  }
  return {
    finalDirectMechanismClusterRunRowsUnavailableBecauseCitedEvidenceAppearedLater: directUnavailable.length,
    directMechanismTimingCensoringCases: directUnavailable,
    finalActionStageClusterRunRowsUnavailablePointInTime: stageUnavailable.length,
    stageTimingCensoringClusterRunIds: stageUnavailable.map((row) => row.clusterRunId),
    legacySelectedObservationsAffectedByDirectOrStageLaterEvidenceCensoring: legacyComparison.observations.filter((row) => row.assignmentDecision === "accepted" && (
      row.finalDirectMechanismsUnavailablePointInTime.length > 0
      || (inputs.assessmentByEvent.get(row.eventClusterId).actionStage.status === "assessed" && row.pointInTimeActionStage === null)
    )).length,
    candidateResultsDifferingFromNaiveFinalStateBackProjection: candidateDifferences.filter((row) => row.pointInTimeOnlyCount + row.naiveBackProjectionOnlyCount > 0).length,
    totalVariantRowMembershipDifferencesFromNaiveBackProjection: candidateDifferences.reduce((sum, row) => sum + row.pointInTimeOnlyCount + row.naiveBackProjectionOnlyCount, 0),
    distinctRowsAffectedByNaiveBackProjection: uniqueSorted(candidateDifferences.flatMap((row) => [...row.pointInTimeOnlyRowIds, ...row.naiveBackProjectionOnlyRowIds])).length,
    byCandidate: candidateDifferences,
    interpretation: "Differences include point-in-time corroboration; zero direct/stage censoring may reflect broad Step-F evidenceCandidateIds and is not proof that earlier lower stages were absent.",
  };
}

function buildSensitivitySummary(candidateA, candidateB, cross, timing, legacy, controls) {
  const evidenceAdds = cross.evidenceVariantChanges.filter((row) => row.addedCount > 0);
  const maxEvidence = evidenceAdds.slice().sort((a, b) => b.addedCount - a.addedCount || a.fromCandidateId.localeCompare(b.fromCandidateId))[0] ?? null;
  const stageAdds = cross.stageBoundaryChanges.filter((row) => row.addedCount > 0);
  const maxStage = stageAdds.slice().sort((a, b) => b.addedCount - a.addedCount || a.fromCandidateId.localeCompare(b.fromCandidateId))[0] ?? null;
  const lifecycleEffects = candidateA.map((row) => ({ candidateId: row.candidateId, removed: row.lifecycleClauseEffect.rowsRemovedByLifecycleClause }));
  const maxLifecycle = lifecycleEffects.slice().sort((a, b) => b.removed - a.removed || a.candidateId.localeCompare(b.candidateId))[0];
  const scalarEquivalence = candidateA.every((a) => {
    const b = candidateB.find((row) => row.evidenceVariantId === a.evidenceVariantId && row.stageOrdinalCutoff === STAGE_TO_CUTOFF[a.stageVariantId]);
    return canonicalize(a.diagnosticNoLifecycle.qualifyingRowIds) === canonicalize(b.result.qualifyingRowIds);
  });
  const permissiveControl = controls.candidateAResults.find((row) => row.candidateId === "A-E3-S5");
  return {
    status: "evidence-for-Session-17-not-final-methodology",
    largestObservedEvidenceClauseChange: maxEvidence,
    largestObservedActionStageBoundaryChange: maxStage,
    maximumLifecycleClauseReduction: maxLifecycle,
    aggregateLifecycleRowsRemovedAcross15AVariants: lifecycleEffects.reduce((sum, row) => sum + row.removed, 0),
    noLookAheadCensoring: {
      directMechanismCases: timing.finalDirectMechanismClusterRunRowsUnavailableBecauseCitedEvidenceAppearedLater,
      actionStageCases: timing.finalActionStageClusterRunRowsUnavailablePointInTime,
      variantRowMembershipDifferencesFromNaiveFinalState: timing.totalVariantRowMembershipDifferencesFromNaiveBackProjection,
    },
    stageOnlyScalarAddsNoEligibilityDistinctionBeyondMatchedNoLifecycleStructuralStageVariants: scalarEquivalence,
    structuralPlusRankingObservation: "Candidate C preserves Candidate-A eligibility exactly and supplies deterministic leaders/breadth without adding an opaque aggregate score.",
    legacySelectedRepeatObservationChannelOccurrencesCollapsed: legacy.repeatedSelectedObservationOccurrencesCollapsedWithinClusterRunChannel,
    unmatchedControlsQualifyingStrictestAE1S1: controls.observationsQualifyingStrictestAE1S1,
    unmatchedControlsQualifyingAE1S2: controls.observationsQualifyingAE1S2,
    unmatchedControlsQualifyingPermissiveAE3S5: permissiveControl.qualifyingObservationCount,
  };
}

function buildArtifact(inputs) {
  const pointInTime = buildPointInTime(inputs);
  const actualCandidates = evaluateCandidates(pointInTime.opportunities, inputs.runs);
  const naiveCandidates = evaluateCandidates(pointInTime.naiveOpportunities, inputs.runs);
  const candidateC = buildCandidateC(actualCandidates.candidateA, pointInTime.opportunities, inputs.runs);
  const crossCandidate = compareCandidates(actualCandidates.candidateA, actualCandidates.candidateB, pointInTime.opportunities);
  const legacyComparison = buildLegacyComparison(inputs, pointInTime, actualCandidates.candidateA, actualCandidates.candidateB);
  const unmatchedControlComparison = buildControlComparison(inputs, pointInTime, actualCandidates.candidateA, actualCandidates.candidateB);
  const fidelityC = buildFidelityC(inputs, pointInTime);
  const timingCensoring = buildTimingDiagnostics(inputs, pointInTime, actualCandidates, naiveCandidates, legacyComparison);
  const procedureHash = sha256(Buffer.from(canonicalize(PROCEDURE), "utf8"));
  const evaluatorHash = fileHash(PATHS.evaluator);
  const clusterRunWithDirect = pointInTime.rows.filter((row) => row.pointInTimeDirectMechanisms.length > 0);
  const artifact = {
    recordType: "signal-elevation-sensitivity",
    schemaVersion: "crucix-session15-signal-elevation-sensitivity/v1",
    auditSession: 15,
    checkpoint: "Step G — signal-elevation candidate evaluation",
    auditStatus: "candidate-sensitivity-only",
    methodologySelectionStatus: "not-selected",
    deterministicEvaluation: true,
    governingHashes: {
      projectLogSha256: EXPECTED.projectLogSha256,
      protocolSha256: EXPECTED.protocolSha256,
      architectureSha256: EXPECTED.architectureSha256,
      coreSchemaDraftSha256: EXPECTED.schemaDraftSha256,
      parameterRegisterSha256: EXPECTED.parameterRegisterSha256,
      inputManifestPhysicalSha256: EXPECTED.manifestPhysicalSha256,
      inputManifestSelfHash: EXPECTED.manifestSelfHash,
      candidateObservationsSha256: EXPECTED.candidateObservationsSha256,
      manualAuditSetSha256: EXPECTED.manualAuditSetSha256,
      sourceOriginLedgerSha256: EXPECTED.sourceOriginLedgerSha256,
      assignmentLedgerSha256: EXPECTED.assignmentLedgerSha256,
      completePreStepGEventClusterLedgerSha256: EXPECTED.preStepGClusterLedgerSha256,
      preStepGAdjudicationNotesPrefixSha256: EXPECTED.preStepGNotesSha256,
      missingTimeDecisionSha256: EXPECTED.missingTimeDecisionSha256,
      governingStepGWorkOrderSha256: EXPECTED.workOrderSha256,
      stepGProcedureSha256: procedureHash,
      evaluatorSha256: evaluatorHash,
    },
    evaluationBoundary: {
      includedHistoricalEvidence: "Accepted chronology-eligible Fidelity-B observations from the frozen Step-E clusters.",
      excludedHistoricalEvidence: ["101 unresolved Step-E observations", "48 chronology-ineligible accepted C observations", "later B evidence at earlier run timestamps", "contextual/none mechanisms"],
      clusterRunUnit: PROCEDURE.historicalUnit,
      equalTimestampHandling: PROCEDURE.equalTimestampRule,
      noLookAhead: PROCEDURE.noLookAheadRule,
      noMarketDataUsed: true,
      noWebOrLaterEvidenceUsed: true,
    },
    denominatorsAndExclusions: {
      manualObservations: EXPECTED.manualObservationCount,
      acceptedObservations: EXPECTED.acceptedObservationCount,
      unresolvedObservationsExcluded: EXPECTED.unresolvedObservationCount,
      acceptedBObservationsEligibleForHistoricalEvaluation: EXPECTED.acceptedBObservationCount,
      acceptedCObservationsExcludedFromHistoricalEvaluation: EXPECTED.acceptedCObservationCount,
      activeClusters: EXPECTED.activeClusterCount,
      retainedBPayloadIdentityRuns: EXPECTED.retainedBRunCount,
      distinctRetainedBTimestamps: EXPECTED.retainedBTimestampCount,
      activeRunChannelCellsPerVariant: EXPECTED.retainedBRunCount * CHANNELS.length,
      unknownStatusTreatment: "Unknown stage fails all stage variants; unknown-origin fails E1/E2 and may pass E3 only with assessed lower bound >=1 and no conflict/retraction; unknown lifecycle fails Candidate A and is absent from Candidate B by design.",
    },
    evaluatedRetainedRunIdentities: inputs.runs,
    mechanismChannelMap: Object.entries(MECHANISM_CHANNEL).map(([mechanismId, channelId]) => ({ mechanismId, channelId })),
    candidateDefinitions: {
      noLookAheadRules: PROCEDURE,
      evidenceVariants: EVIDENCE_VARIANTS,
      actionStageVariants: STAGE_VARIANTS,
      lifecycleRule: {
        qualifyingStates: MATERIAL_PULSES,
        continuing: "fail",
        unknown: "indeterminate-and-does-not-qualify",
        multipleMaterialStates: "preserve-set-and-flag",
      },
      scalarStageOrdinalCandidate: STAGE_ORDINAL,
      scalarCutoffsEvaluated: CUTOFFS,
      candidateCDeterministicRank: ["stageOrdinal descending", "eventClusterId ascending"],
    },
    evaluationCoverage: {
      retainedBPayloadIdentitiesEvaluated: inputs.runs.length,
      distinctRunTimestamps: new Set(inputs.runs.map((run) => run.runTimestampUtc)).size,
      uniqueClusterRunCases: pointInTime.rows.length,
      uniqueClusterRunChannelDirectMechanismOpportunities: pointInTime.opportunities.length,
      uniqueClustersRepresentedInHistoricalEvaluation: new Set(pointInTime.rows.map((row) => row.eventClusterId)).size,
      clusterRunCasesWithPointInTimeDirectMechanism: clusterRunWithDirect.length,
      clusterRunCasesWithZeroPointInTimeDirectMechanisms: pointInTime.rows.length - clusterRunWithDirect.length,
      acceptedBObservationsCollapsedWithinClusterRunBeforeChannelEvaluation: EXPECTED.acceptedBObservationCount - pointInTime.rows.length,
      cOnlyClusterExclusions: fidelityC.cOnlyClusterCountExcludedFromHistoricalRuns,
      mixedClusterBOnlyPointInTimeCases: fidelityC.mixedBOnlyPointInTimeClusterRunCaseCount,
      equalTimestampPayloadsRemainDistinct: {
        timestamp: inputs.runs.find((run) => run.retainedPayloadId === "retained-payload-0027").runTimestampUtc,
        retainedPayloadIds: ["retained-payload-0027", "retained-payload-0028"],
        distinctRunIds: [inputs.runs.find((run) => run.retainedPayloadId === "retained-payload-0027").runId, inputs.runs.find((run) => run.retainedPayloadId === "retained-payload-0028").runId],
      },
    },
    pointInTimeClusterRunRows: pointInTime.rows,
    pointInTimeDirectMechanismOpportunities: pointInTime.opportunities.map((row) => ({
      opportunityId: row.opportunityId,
      clusterRunId: row.clusterRunId,
      eventClusterId: row.eventClusterId,
      runId: row.runId,
      retainedPayloadId: row.retainedPayloadId,
      runTimestampUtc: row.runTimestampUtc,
      channelId: row.channelId,
      mechanismId: row.mechanismId,
      supportingEvidenceCandidateIds: row.supportingEvidenceCandidateIds,
    })),
    candidateA: {
      status: "structural-candidate-sensitivity-only",
      variantCount: actualCandidates.candidateA.length,
      variants: actualCandidates.candidateA,
    },
    candidateB: {
      status: "minimal-stage-ordinal-sensitivity-only",
      variantCount: actualCandidates.candidateB.length,
      variants: actualCandidates.candidateB,
    },
    candidateC: {
      status: "structural-eligibility-plus-transparent-ranking-only",
      variantCount: candidateC.variants.length,
      eligibilityChangedByRanking: false,
      ...candidateC,
    },
    crossCandidateDifferences: crossCandidate,
    legacySelectedComparison: legacyComparison,
    unmatchedControlComparison,
    fidelityCStaticDiagnostics: fidelityC,
    timingCensoringDiagnostics: timingCensoring,
    sensitivitySummary: buildSensitivitySummary(actualCandidates.candidateA, actualCandidates.candidateB, crossCandidate, timingCensoring, legacyComparison, unmatchedControlComparison),
    limitations: [
      "The historical B material is reconstructed from retained legacy payloads, not a canonical complete v2 candidate archive.",
      "Cluster/run evaluation is limited to accepted manual-set B observations; unresolved observations never receive inferred assignments or labels.",
      "Step F persisted the furthest final action stage, not full stage history; earlier lower stages cannot be reconstructed and remain unknown before cited evidence appears.",
      "Step-F mechanism and stage evidence references commonly cite the full accepted cluster evidence set, which can make direct/stage timing censoring appear as zero and limits temporal specificity.",
      "Point-in-time conflict becomes available conservatively only after all chronology-eligible candidates cited by the retained conflict assessment are available.",
      "No post-initial material transitions were retained; Candidate-A lifecycle behavior is therefore dominated by initial new pulses in this short sample.",
      "C-only evidence has no supported historical observation time; mixed clusters use only B evidence and retain incomplete complete-history chronology.",
      "The two equal-time payload identities remain separate run-frequency units; literal observedAt <= run time permits co-temporal evidence in point-in-time state and should be frozen explicitly for production replay.",
      "No sensitivity result establishes historical representativeness, a production exception, or a final methodology rule.",
    ],
  };
  const text = `${JSON.stringify(artifact, null, 2)}\n`;
  return { artifact, text, procedureHash, evaluatorHash };
}

function validate(inputs, build, includeNotes) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const artifact = build.artifact;
  check(fileHash(PATHS.clusterLedger) === EXPECTED.preStepGClusterLedgerSha256, "pre-Step-G semantic ledger changed");
  const notes = fs.readFileSync(absolute(PATHS.notes));
  check(notes.length >= EXPECTED.preStepGNotesBytes && sha256(notes.subarray(0, EXPECTED.preStepGNotesBytes)) === EXPECTED.preStepGNotesSha256, "pre-Step-G notes prefix changed");
  check(artifact.evaluatedRetainedRunIdentities.length === 28, "not 28 retained runs");
  check(new Set(artifact.evaluatedRetainedRunIdentities.map((run) => run.runTimestampUtc)).size === 27, "not 27 distinct timestamps");
  const equalPair = artifact.evaluationCoverage.equalTimestampPayloadsRemainDistinct;
  check(equalPair.retainedPayloadIds.length === 2 && new Set(equalPair.distinctRunIds).size === 2, "0027/0028 merged");
  const clusterRunIds = new Set(artifact.pointInTimeClusterRunRows.map((row) => row.clusterRunId));
  check(clusterRunIds.size === artifact.pointInTimeClusterRunRows.length, "duplicate cluster/run row");
  for (const row of artifact.pointInTimeClusterRunRows) {
    check(row.clusterComposition !== "C-only", `C-only historical row ${row.clusterRunId}`);
    const run = inputs.runById.get(row.runId);
    check(row.availableCandidateIds.every((id) => inputs.manualById.get(id)?.chronologyEligible && inputs.manualById.get(id).observedAt.value <= run.runTimestampUtc), `later/C evidence in ${row.clusterRunId}`);
    check(row.currentRunCandidateIds.every((id) => inputs.manualById.get(id)?.runId === row.runId), `current-run mismatch ${row.clusterRunId}`);
    if (row.clusterComposition === "mixed") check(row.availableCandidateIds.every((id) => inputs.manualById.get(id).chronologyEligible), `C evidence entered mixed row ${row.clusterRunId}`);
    for (const mechanism of row.pointInTimeDirectMechanisms) {
      check(MECHANISM_CHANNEL[mechanism.mechanismId] === mechanism.channelId, `invalid mechanism/channel pair ${row.clusterRunId}`);
      check(mechanism.supportingEvidenceCandidateIds.length > 0, `direct mechanism lacks point-in-time evidence ${row.clusterRunId}`);
      check(mechanism.supportingEvidenceCandidateIds.every((id) => row.availableCandidateIds.includes(id)), `future evidence supports mechanism ${row.clusterRunId}`);
    }
    if (row.pointInTimeActionStage.status === "assessed") check(row.pointInTimeActionStage.supportingEvidenceCandidateIds.length > 0 && row.pointInTimeActionStage.supportingEvidenceCandidateIds.every((id) => row.availableCandidateIds.includes(id)), `stage lacks point-in-time evidence ${row.clusterRunId}`);
    const expectedPulseEvidence = new Set(row.currentRunCandidateIds);
    check(row.runLifecyclePulse.evidenceCandidateIds.every((id) => expectedPulseEvidence.has(id)), `lifecycle pulse used noncurrent evidence ${row.clusterRunId}`);
    check(!Object.hasOwn(row.pointInTimeCorroboration, "reportingSourceCount"), `reporting source substituted ${row.clusterRunId}`);
  }
  const opportunityIds = artifact.pointInTimeDirectMechanismOpportunities.map((row) => row.opportunityId);
  check(new Set(opportunityIds).size === opportunityIds.length, "cluster contributed more than once per channel/run");
  for (const opportunity of artifact.pointInTimeDirectMechanismOpportunities) {
    const assessment = inputs.assessmentByEvent.get(opportunity.eventClusterId);
    const mechanism = assessment.mechanisms.find((item) => item.mechanismId === opportunity.mechanismId);
    check(mechanism?.directness === "direct", `contextual/none opportunity ${opportunity.opportunityId}`);
    check(MECHANISM_CHANNEL[opportunity.mechanismId] === opportunity.channelId, `channel lacks own mechanism ${opportunity.opportunityId}`);
  }
  check(artifact.candidateA.variantCount === 15 && artifact.candidateA.variants.length === 15, "Candidate A grid incomplete");
  check(artifact.candidateA.variants.every((variant) => variant.diagnosticNoLifecycle), "no-lifecycle diagnostics incomplete");
  check(artifact.candidateB.variantCount === 15 && artifact.candidateB.variants.length === 15, "Candidate B grid incomplete");
  check(artifact.candidateC.variantCount === 15 && artifact.candidateC.variants.length === 15, "Candidate C grid incomplete");
  check(artifact.candidateC.eligibilityChangedByRanking === false, "Candidate C ranking changed eligibility");
  for (const variant of artifact.candidateC.variants) {
    const structural = artifact.candidateA.variants.find((row) => row.candidateId === variant.structuralVariantId);
    check(variant.qualifyingClusterRunChannelCount === structural.withLifecycle.qualifyingClusterRunChannelCount, `Candidate C eligibility drift ${variant.candidateId}`);
    check(variant.rankings.length === 28 * 5, `Candidate C ranking cell count mismatch ${variant.candidateId}`);
  }
  for (const a of artifact.candidateA.variants) {
    const b = artifact.candidateB.variants.find((row) => row.evidenceVariantId === a.evidenceVariantId && row.stageOrdinalCutoff === STAGE_TO_CUTOFF[a.stageVariantId]);
    check(canonicalize(a.diagnosticNoLifecycle.qualifyingRowIds) === canonicalize(b.result.qualifyingRowIds), `matched A-no-lifecycle/B mismatch ${a.candidateId}`);
  }
  const prohibitedKeys = new Set(["selectedRule", "productionRule", "recommendedThreshold", "marketData", "divergenceState", "categoryQuota", "publicationVolumeScore", "severityScore"]);
  function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      check(!prohibitedKeys.has(key), `prohibited key ${key}`);
      walk(child);
    }
  }
  walk(artifact);
  check(!build.text.includes("60%") && artifact.candidateB.variants.every((variant) => CUTOFFS.includes(variant.stageOrdinalCutoff)), "legacy 60% or an undeclared scalar cutoff appeared");
  check(!build.text.includes("production-selected") && !build.text.includes("final-methodology-selected"), "production selection text present");
  check(build.text.endsWith("\n") && !/[ \t]+\r?$/m.test(build.text), "artifact whitespace/newline invalid");
  check(!fs.existsSync(absolute("audit/session15/metrics.json")), "metrics.json created prematurely");
  check(!fs.existsSync(absolute("audit/session15/signal-audit-report.md")), "signal-audit-report.md created prematurely");
  if (includeNotes) {
    const text = notes.toString("utf8");
    for (const heading of [
      "# Session 15 Step G methodological observations",
      "## Point-in-time construction and timing censoring",
      "## Candidate sensitivity observations",
      "## Legacy-selected and unmatched-control observations",
      "## Evidence for Session 17",
      "## Step-G schema and parameter questions for Session 17",
    ]) check(text.includes(heading), `missing Step-G notes heading ${heading}`);
  }
  return { pass: failures.length === 0, failures };
}

function consoleSummary(build, inputs) {
  const artifact = build.artifact;
  const aCounts = Object.fromEntries(artifact.candidateA.variants.map((row) => [row.candidateId, row.withLifecycle.qualifyingClusterRunChannelCount]));
  const aNoLife = Object.fromEntries(artifact.candidateA.variants.map((row) => [row.candidateId, row.diagnosticNoLifecycle.qualifyingClusterRunChannelCount]));
  const bCounts = Object.fromEntries(artifact.candidateB.variants.map((row) => [row.candidateId, row.result.qualifyingClusterRunChannelCount]));
  return {
    coverage: artifact.evaluationCoverage,
    candidateAQualifyingCounts: aCounts,
    candidateANoLifecycleCounts: aNoLife,
    candidateBQualifyingCounts: bCounts,
    candidateCLeaderChanges: {
      cellsWithMultipleDistinctLeaders: artifact.candidateC.leaderChangeDiagnostics.cellsWithMultipleDistinctLeaders,
      totalAdjacentNonNullLeaderChanges: artifact.candidateC.leaderChangeDiagnostics.totalAdjacentVariantNonNullLeaderChanges,
    },
    timingCensoring: {
      direct: artifact.timingCensoringDiagnostics.finalDirectMechanismClusterRunRowsUnavailableBecauseCitedEvidenceAppearedLater,
      stage: artifact.timingCensoringDiagnostics.finalActionStageClusterRunRowsUnavailablePointInTime,
      legacy: artifact.timingCensoringDiagnostics.legacySelectedObservationsAffectedByDirectOrStageLaterEvidenceCensoring,
      variantsDifferingFromNaiveBackProjection: artifact.timingCensoringDiagnostics.candidateResultsDifferingFromNaiveFinalStateBackProjection,
      variantRowMembershipDifferences: artifact.timingCensoringDiagnostics.totalVariantRowMembershipDifferencesFromNaiveBackProjection,
    },
    legacy: {
      input: artifact.legacySelectedComparison.inputObservationCount,
      assigned: artifact.legacySelectedComparison.assignedObservationCount,
      unresolved: artifact.legacySelectedComparison.unresolvedFromStepECount,
      repeatedObservationChannelOccurrencesCollapsed: artifact.legacySelectedComparison.repeatedSelectedObservationOccurrencesCollapsedWithinClusterRunChannel,
      distinctObservationIdsCollapsedAtLeastOnce: artifact.legacySelectedComparison.distinctSelectedObservationIdsCollapsedAtLeastOnceWithinClusterRunChannel,
      zeroDirect: artifact.legacySelectedComparison.observationsBlockedForZeroDirectMechanism,
    },
    controls: {
      input: artifact.unmatchedControlComparison.inputObservationCount,
      assigned: artifact.unmatchedControlComparison.assignedObservationCount,
      direct: artifact.unmatchedControlComparison.assignedWithPointInTimeDirectMechanism,
      strictAE1S1: artifact.unmatchedControlComparison.observationsQualifyingStrictestAE1S1,
      AE1S2: artifact.unmatchedControlComparison.observationsQualifyingAE1S2,
    },
    sensitivitySummary: artifact.sensitivitySummary,
    hashes: {
      stepGProcedureSha256: build.procedureHash,
      evaluatorSha256: build.evaluatorHash,
      predictedSensitivityJsonSha256: sha256(Buffer.from(build.text, "utf8")),
      completePreStepGEventClusterLedgerSha256: fileHash(PATHS.clusterLedger),
      preStepGNotesPrefixSha256: sha256(inputs.notesBytes.subarray(0, EXPECTED.preStepGNotesBytes)),
      completeCurrentNotesSha256: fileHash(PATHS.notes),
    },
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const write = args.has("--write");
  const preview = args.has("--preview");
  invariant(!(write && preview), "choose --write or --preview, not both");
  const inputs = loadInputs();
  const first = buildArtifact(inputs);
  const second = buildArtifact(inputs);
  invariant(first.text === second.text, "two deterministic Step-G builds differ");
  const preValidation = validate(inputs, first, false);
  invariant(preValidation.pass, `Step-G pre-validation failed: ${preValidation.failures.join("; ")}`);
  const outputPath = absolute(PATHS.output);
  if (write) {
    invariant(!fs.existsSync(outputPath), "refusing to overwrite existing Step-G sensitivity artifact");
    fs.writeFileSync(outputPath, first.text, "utf8");
  } else if (!preview) {
    invariant(fs.existsSync(outputPath), "Step-G sensitivity artifact does not exist");
    invariant(fs.readFileSync(outputPath, "utf8") === first.text, "existing sensitivity artifact is not byte-identical to deterministic build");
  }
  const validation = validate(inputs, first, !preview && !write);
  invariant(validation.pass, `Step-G validation failed: ${validation.failures.join("; ")}`);
  process.stdout.write(`${JSON.stringify({
    mode: write ? "write" : preview ? "preview" : "validate-existing",
    deterministicByteIdentity: true,
    validation,
    summary: consoleSummary(first, inputs),
  }, null, 2)}\n`);
}

main();
