#!/usr/bin/env node

/**
 * CRUCIX Session 15 Step C audit-only deterministic selector.
 *
 * Inputs are frozen by the Session 15 manifest and Step B census. This helper:
 *   1. includes all fidelity-A/B reproduced legacy top-15 observations;
 *   2. evaluates fidelity-C supplements with assessed-time equality only;
 *   3. chooses the lexicographically smallest unmatched control in each
 *      retained-payload/run + nonempty source-priority cell;
 *   4. expands every selected normalized content ID to all frozen occurrences;
 *   5. serializes assessed-time records before unknown-time records using the
 *      authorized audit-file convention.
 *
 * It performs no source-origin normalization, event clustering, semantic
 * labeling, adjudication, prospective collection, or production behavior.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

const PATHS = Object.freeze({
  manifest: "audit/session15/input-manifest.json",
  candidates: "audit/session15/candidate-observations.jsonl",
  protocol: "audit/session14-signal-audit-protocol.md",
  decision: "audit/session15/step-c-missing-time-decision.md",
  helper: "audit/session15/select-manual-audit-set.mjs",
  output: "audit/session15/manual-audit-set.jsonl",
});

const EXPECTED = Object.freeze({
  manifestSelfHash: "3a864319add335d4f2fb3550fa8b865a6282d29f4a37819200e516106cdf3651",
  candidateObservationsSha256: "36604f9ea997335f3d9c368c0c76135b37babd797805180c1e27568a1b8ab69e",
  protocolSha256: "6d29f97737a3b9d589c826846613863699cdbc5e4e90e88aba65d815dfd9d670",
});

const REASON_ORDER = Object.freeze([
  "reproduced-legacy-top15",
  "selected-output-supplement",
  "unmatched-control-high",
  "unmatched-control-medium",
  "unmatched-control-low",
  "recurrence-expansion",
]);
const VALID_REASONS = new Set(REASON_ORDER);
const PRIORITY_BANDS = Object.freeze(["High", "Medium", "Low"]);

const SELECTION_RULES = Object.freeze({
  ruleId: "crucix-session15-step-c-deterministic-selection/v1",
  rule1:
    "Include every fidelity-A/B observation assessed true for reproduced legacy top-15; preserve occurrences and payload identity.",
  rule2:
    "Exclude fidelity C as already represented only when normalized content is equal, both observedAt wrappers are assessed, and their normalized timestamp values are equal; unknown never equals unknown.",
  rule3:
    "For each fidelity-A/B retained-payload/run plus nonempty High/Medium/Low band, select unmatched by conservative normalized SHA-256 ascending then candidate observation ID ascending; never substitute matched candidates.",
  rule4:
    "After initial seeding, include every frozen candidate-census occurrence of each seeded normalized content ID without collapsing candidate observation identity.",
  ordering: {
    assessed:
      "Bucket 0; observedAt ascending, conservative normalized SHA-256 ascending, candidate observation ID ascending.",
    unknown:
      "Bucket 1 after all assessed records; conservative normalized SHA-256 ascending, candidate observation ID ascending; no timestamp synthesized.",
    otherStatus: "Stop.",
  },
  chronologyEligibility:
    "True exactly when the original Step B observedAt status is assessed; false exactly when it is unknown.",
});

function absolute(relativePath) {
  return path.join(ROOT, ...relativePath.split("/"));
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(relativePath) {
  return sha256Bytes(fs.readFileSync(absolute(relativePath)));
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareText)
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([a], [b]) => compareText(a, b)));
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function parseJsonl(relativePath) {
  const text = fs.readFileSync(absolute(relativePath), "utf8");
  invariant(text.endsWith("\n"), `${relativePath} must end with a newline`);
  const lines = text.slice(0, -1).split(/\r?\n/);
  const records = lines.map((line, index) => {
    invariant(line.length > 0, `${relativePath}:${index + 1} is blank`);
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`${relativePath}:${index + 1} is invalid JSON: ${error.message}`);
    }
    return {
      record,
      line,
      lineNumber: index + 1,
      lineSha256: sha256Bytes(Buffer.from(line, "utf8")),
    };
  });
  return { text, records };
}

function isFidelityAB(record) {
  return (
    record.fidelityStratum === "A-canonical-candidate-archive" ||
    record.fidelityStratum === "B-reconstructable-run-input"
  );
}

function isFidelityC(record) {
  return record.fidelityStratum === "C-selected-output-only";
}

function normalizedHash(record) {
  const hash = record.content?.conservativeNormalizedSha256;
  invariant(typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash), `${record.candidateId}: invalid normalized SHA-256`);
  invariant(
    record.normalizedContentId === `norm_sha256_${hash}`,
    `${record.candidateId}: normalized content ID/hash mismatch`,
  );
  return hash;
}

function observationId(record) {
  invariant(typeof record.candidateId === "string" && record.candidateId.length > 0, "candidate record lacks candidateId");
  return record.candidateId;
}

function observedAt(record) {
  const wrapper = record.inputEvidence?.observedAt;
  invariant(wrapper && typeof wrapper === "object", `${observationId(record)}: observedAt wrapper missing`);
  if (wrapper.status === "assessed") {
    invariant(typeof wrapper.value === "string" && wrapper.value.length > 0, `${observationId(record)}: assessed observedAt lacks value`);
  } else if (wrapper.status === "unknown") {
    invariant(wrapper.value === null, `${observationId(record)}: unknown observedAt must remain null`);
  } else {
    throw new Error(`${observationId(record)}: unsupported observedAt status ${JSON.stringify(wrapper.status)}`);
  }
  return wrapper;
}

function assessedBoolean(wrapper, label, record) {
  invariant(wrapper?.status === "assessed", `${observationId(record)}: ${label} is not assessed`);
  invariant(typeof wrapper.value === "boolean", `${observationId(record)}: ${label} is not boolean`);
  return wrapper.value;
}

function retainedPayloadId(record) {
  const wrapper = record.inputEvidence?.retainedPayloadIdentity;
  if (record.fidelityStratum === "B-reconstructable-run-input") {
    invariant(wrapper?.status === "assessed", `${observationId(record)}: B retained payload identity is not assessed`);
    const value = wrapper.value?.retainedPayloadId;
    invariant(typeof value === "string" && value.length > 0, `${observationId(record)}: B retained payload ID missing`);
    return value;
  }
  return null;
}

function sourcePriority(record) {
  const wrapper = record.legacyAssessment?.sourcePriority;
  invariant(wrapper?.status === "assessed", `${observationId(record)}: source priority is not assessed`);
  invariant(PRIORITY_BANDS.includes(wrapper.value), `${observationId(record)}: unsupported source priority ${JSON.stringify(wrapper.value)}`);
  return wrapper.value;
}

function reasonSort(left, right) {
  return REASON_ORDER.indexOf(left) - REASON_ORDER.indexOf(right);
}

function addReason(reasonMap, candidateId, reason) {
  invariant(VALID_REASONS.has(reason), `invalid selection reason ${reason}`);
  if (!reasonMap.has(candidateId)) reasonMap.set(candidateId, new Set());
  reasonMap.get(candidateId).add(reason);
}

function representedPair(record) {
  const time = observedAt(record);
  if (time.status !== "assessed") return null;
  return `${record.normalizedContentId}\u0000${time.value}`;
}

function loadInputs() {
  const manifest = JSON.parse(fs.readFileSync(absolute(PATHS.manifest), "utf8"));
  invariant(manifest.manifestHash?.value === EXPECTED.manifestSelfHash, "input-manifest declared self-hash mismatch");
  const hashCopy = JSON.parse(JSON.stringify(manifest));
  hashCopy.manifestHash.value = null;
  invariant(
    sha256Bytes(Buffer.from(canonicalJson(hashCopy), "utf8")) === EXPECTED.manifestSelfHash,
    "input-manifest canonical self-hash validation failed",
  );

  const candidateHash = sha256File(PATHS.candidates);
  invariant(candidateHash === EXPECTED.candidateObservationsSha256, "candidate-observations SHA-256 mismatch");
  const protocolHash = sha256File(PATHS.protocol);
  invariant(protocolHash === EXPECTED.protocolSha256, "Session 14 protocol SHA-256 mismatch");

  const decisionHash = sha256File(PATHS.decision);
  const helperHash = sha256File(PATHS.helper);
  const rulesHash = sha256Bytes(Buffer.from(canonicalJson(SELECTION_RULES), "utf8"));
  const parsed = parseJsonl(PATHS.candidates);
  const manifestFiles = new Map(manifest.sourceEvidenceFiles.map((entry) => [entry.repositoryRelativePath, entry]));
  const byId = new Map();

  for (const entry of parsed.records) {
    const record = entry.record;
    const id = observationId(record);
    invariant(!byId.has(id), `duplicate candidate ID in Step B census: ${id}`);
    byId.set(id, entry);
    invariant(
      record.inputManifest?.canonicalSelfHashSha256 === EXPECTED.manifestSelfHash,
      `${id}: frozen input-manifest hash mismatch`,
    );
    const manifestEntry = manifestFiles.get(record.inputEvidence?.sourceInputPath);
    invariant(manifestEntry, `${id}: source input is absent from frozen manifest`);
    invariant(manifestEntry.sha256 === record.inputEvidence.sourceInputSha256, `${id}: source input hash mismatch`);
    invariant(manifestEntry.fidelityStratum === record.fidelityStratum, `${id}: source fidelity mismatch`);
    invariant(isFidelityAB(record) || isFidelityC(record), `${id}: fidelity is outside Step C candidate census`);
    normalizedHash(record);
    observedAt(record);
  }

  return {
    manifest,
    candidateEntries: parsed.records,
    byId,
    provenance: {
      inputManifestSelfHash: EXPECTED.manifestSelfHash,
      candidateObservationsSha256: candidateHash,
      protocolSha256: protocolHash,
      missingTimeDecisionSha256: decisionHash,
      selectionHelperSha256: helperHash,
      selectionRulesSha256: rulesHash,
    },
  };
}

function compareControlCandidates(left, right) {
  return compareText(normalizedHash(left), normalizedHash(right)) || compareText(observationId(left), observationId(right));
}

function compareSelectedEntries(left, right) {
  const leftRecord = left.source.record;
  const rightRecord = right.source.record;
  const leftTime = observedAt(leftRecord);
  const rightTime = observedAt(rightRecord);
  const leftBucket = leftTime.status === "assessed" ? 0 : 1;
  const rightBucket = rightTime.status === "assessed" ? 0 : 1;
  if (leftBucket !== rightBucket) return leftBucket - rightBucket;
  if (leftBucket === 0) {
    const timeOrder = compareText(leftTime.value, rightTime.value);
    if (timeOrder !== 0) return timeOrder;
  }
  return (
    compareText(normalizedHash(leftRecord), normalizedHash(rightRecord)) ||
    compareText(observationId(leftRecord), observationId(rightRecord))
  );
}

function makeManualRecord(selected, provenance) {
  const source = selected.source;
  const record = source.record;
  const time = observedAt(record);
  const reportingWrapper = record.sourceRecord?.reportingSourceId;
  invariant(reportingWrapper && typeof reportingWrapper === "object", `${observationId(record)}: reportingSourceId wrapper missing`);
  const priorityWrapper = record.legacyAssessment?.sourcePriority;
  const matchWrapper = record.legacyAssessment?.keywordMatched;
  const top15Wrapper = record.legacyAssessment?.enteredLegacyTop15;
  const denominatorWrapper = record.selectionContext?.completeRunCandidateDenominatorEligible;
  invariant(denominatorWrapper && typeof denominatorWrapper === "object", `${observationId(record)}: denominator wrapper missing`);

  return {
    recordType: "manual-audit-set-observation",
    schemaVersion: "crucix-session15-manual-audit-set/v1",
    auditSession: 15,
    checkpoint: "Step C — deterministic manual-audit-set selection",
    candidateObservationId: observationId(record),
    candidateObservationReference: {
      path: PATHS.candidates,
      lineNumber: source.lineNumber,
      lineSha256: source.lineSha256,
    },
    normalizedContentId: record.normalizedContentId,
    conservativeNormalizedSha256: normalizedHash(record),
    fidelityStratum: record.fidelityStratum,
    sampleRole: record.sampleRole,
    runId: record.runId,
    retainedPayloadIdentity: record.inputEvidence.retainedPayloadIdentity,
    sourceInput: {
      path: record.inputEvidence.sourceInputPath,
      sha256: record.inputEvidence.sourceInputSha256,
      recordLocator: record.inputEvidence.sourceRecordLocator,
    },
    observedAt: record.inputEvidence.observedAt,
    chronologyEligible: time.status === "assessed",
    completeRunCandidateDenominatorEligible: denominatorWrapper,
    reportingSourceId: reportingWrapper.value ?? null,
    reportingSourceIdAssessment: reportingWrapper,
    sourcePriority: priorityWrapper?.value ?? null,
    sourcePriorityAssessment: priorityWrapper,
    reproducedLegacyMatch: matchWrapper,
    reproducedLegacyTop15: top15Wrapper,
    selectionReasons: [...selected.reasons].sort(reasonSort),
    initialSeed: selected.initialSeed,
    recurrenceExpansion: !selected.initialSeed,
    selectionProvenance: {
      inputManifestPath: PATHS.manifest,
      inputManifestSelfHash: provenance.inputManifestSelfHash,
      candidateObservationsPath: PATHS.candidates,
      candidateObservationsSha256: provenance.candidateObservationsSha256,
      protocolPath: PATHS.protocol,
      protocolSha256: provenance.protocolSha256,
      missingTimeDecisionPath: PATHS.decision,
      missingTimeDecisionSha256: provenance.missingTimeDecisionSha256,
      selectionHelperPath: PATHS.helper,
      selectionHelperSha256: provenance.selectionHelperSha256,
      selectionRulesId: SELECTION_RULES.ruleId,
      selectionRulesSha256: provenance.selectionRulesSha256,
      unknownTimeOrderingBoundary:
        "Placement after assessed-time records is a deterministic serialization convention, not a historical chronology claim.",
    },
  };
}

function select(inputs) {
  const reasonMap = new Map();
  const candidateRecords = inputs.candidateEntries.map((entry) => entry.record);
  const fidelityAB = candidateRecords.filter(isFidelityAB);
  const fidelityC = candidateRecords.filter(isFidelityC);

  const rule1 = fidelityAB.filter((record) =>
    assessedBoolean(record.legacyAssessment?.enteredLegacyTop15, "reproduced legacy top-15", record),
  );
  for (const record of rule1) addReason(reasonMap, observationId(record), "reproduced-legacy-top15");

  const representedAssessedPairs = new Set(
    rule1.map(representedPair).filter((pair) => pair !== null),
  );
  const cExcluded = [];
  const cIncluded = [];
  for (const record of fidelityC) {
    invariant(record.sampleRole === "selected-output-supplement", `${observationId(record)}: C sampleRole mismatch`);
    invariant(
      record.selectionContext?.completeRunCandidateDenominatorEligible?.status === "assessed" &&
        record.selectionContext.completeRunCandidateDenominatorEligible.value === false,
      `${observationId(record)}: C record improperly eligible for complete-run denominator`,
    );
    const pair = representedPair(record);
    if (pair !== null && representedAssessedPairs.has(pair)) {
      cExcluded.push(record);
      continue;
    }
    addReason(reasonMap, observationId(record), "selected-output-supplement");
    cIncluded.push(record);
    if (pair !== null) representedAssessedPairs.add(pair);
  }

  const cellMap = new Map();
  for (const record of fidelityAB) {
    const band = sourcePriority(record);
    const payloadId = retainedPayloadId(record);
    const identity = payloadId ?? record.runId;
    invariant(typeof identity === "string" && identity.length > 0, `${observationId(record)}: run/payload identity missing`);
    const key = `${identity}\u0000${band}`;
    if (!cellMap.has(key)) {
      cellMap.set(key, { identity, retainedPayloadId: payloadId, runId: record.runId, band, records: [] });
    }
    cellMap.get(key).records.push(record);
  }

  const controlCells = [];
  for (const cell of cellMap.values()) {
    const unmatched = cell.records
      .filter((record) => !assessedBoolean(record.legacyAssessment?.keywordMatched, "reproduced legacy match", record))
      .sort(compareControlCandidates);
    const selected = unmatched[0] ?? null;
    if (selected) {
      addReason(reasonMap, observationId(selected), `unmatched-control-${cell.band.toLowerCase()}`);
    }
    controlCells.push({
      identity: cell.identity,
      retainedPayloadId: cell.retainedPayloadId,
      runId: cell.runId,
      sourcePriority: cell.band,
      candidateCount: cell.records.length,
      unmatchedCandidateCount: unmatched.length,
      selectedCandidateObservationId: selected ? observationId(selected) : null,
      selectedNormalizedSha256: selected ? normalizedHash(selected) : null,
      status: selected ? "selected" : "no-eligible-unmatched-candidate",
    });
  }
  controlCells.sort(
    (left, right) =>
      compareText(left.identity, right.identity) ||
      PRIORITY_BANDS.indexOf(left.sourcePriority) - PRIORITY_BANDS.indexOf(right.sourcePriority),
  );

  const initialSeedIds = new Set(reasonMap.keys());
  const initialNormalizedIds = new Set(
    [...initialSeedIds].map((candidateId) => inputs.byId.get(candidateId).record.normalizedContentId),
  );
  for (const source of inputs.candidateEntries) {
    const record = source.record;
    if (initialNormalizedIds.has(record.normalizedContentId) && !reasonMap.has(observationId(record))) {
      addReason(reasonMap, observationId(record), "recurrence-expansion");
    }
  }

  const selectedEntries = [...reasonMap.entries()].map(([candidateId, reasons]) => ({
    source: inputs.byId.get(candidateId),
    reasons,
    initialSeed: initialSeedIds.has(candidateId),
  }));
  selectedEntries.sort(compareSelectedEntries);
  const records = selectedEntries.map((entry) => makeManualRecord(entry, inputs.provenance));
  const text = `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;

  return {
    records,
    text,
    rule1,
    fidelityC,
    cExcluded,
    cIncluded,
    controlCells,
    initialSeedIds,
    initialNormalizedIds,
    reasonMap,
  };
}

function buildMetrics(inputs, result) {
  const byFidelity = new Map();
  const byReason = new Map(REASON_ORDER.map((reason) => [reason, 0]));
  const byPayload = new Map();
  const byUtcDate = new Map();
  const cellsByBand = Object.fromEntries(
    PRIORITY_BANDS.map((band) => [band, { eligible: 0, empty: 0, selected: 0 }]),
  );

  for (const cell of result.controlCells) {
    const target = cellsByBand[cell.sourcePriority];
    target.eligible += 1;
    if (cell.status === "selected") target.selected += 1;
    else target.empty += 1;
  }

  for (const record of result.records) {
    increment(byFidelity, record.fidelityStratum);
    for (const reason of record.selectionReasons) increment(byReason, reason);
    const payloadId =
      record.retainedPayloadIdentity.status === "assessed"
        ? record.retainedPayloadIdentity.value.retainedPayloadId
        : "not-applicable-fidelity-c";
    increment(byPayload, payloadId);
    if (record.chronologyEligible) increment(byUtcDate, record.observedAt.value.slice(0, 10));
  }

  const emptyControlCells = result.controlCells
    .filter((cell) => cell.status !== "selected")
    .map(({ identity, retainedPayloadId: payloadId, runId, sourcePriority }) => ({
      identity,
      retainedPayloadId: payloadId,
      runId,
      sourcePriority,
    }));

  const countUnknownPublication = result.records.filter((record) => {
    const source = inputs.byId.get(record.candidateObservationId).record;
    return source.sourceRecord.publicationOrEventTimestamps.status !== "assessed";
  }).length;

  return {
    rule1ReproducedLegacyTop15: result.rule1.length,
    fidelityC: {
      examined: result.fidelityC.length,
      assessedObservationTime: result.fidelityC.filter((record) => observedAt(record).status === "assessed").length,
      unknownObservationTime: result.fidelityC.filter((record) => observedAt(record).status === "unknown").length,
      excludedByProvenContentAndAssessedEqualTime: result.cExcluded.length,
      newlyIncluded: result.cIncluded.length,
      includedChronologyIneligible: result.cIncluded.filter((record) => observedAt(record).status === "unknown").length,
    },
    unmatchedControls: {
      byPriorityBand: cellsByBand,
      eligibleCellsTotal: result.controlCells.length,
      emptyCellsTotal: emptyControlCells.length,
      selectedTotal: result.controlCells.filter((cell) => cell.status === "selected").length,
      emptyCells: emptyControlCells,
    },
    initialSeed: {
      observations: result.initialSeedIds.size,
      uniqueNormalizedContents: result.initialNormalizedIds.size,
    },
    recurrenceExpansion: {
      additionalObservations: result.records.filter((record) => record.recurrenceExpansion).length,
    },
    finalManualAuditSet: {
      observations: result.records.length,
      uniqueNormalizedContents: new Set(result.records.map((record) => record.normalizedContentId)).size,
      byFidelity: sortedObject(byFidelity),
      bySelectionReason: sortedObject(byReason),
      byRetainedPayload: sortedObject(byPayload),
      byUtcDateChronologyEligible: sortedObject(byUtcDate),
      unknownPublicationOrEventTime: countUnknownPublication,
      unknownSupportedAuditObservationTime: result.records.filter((record) => record.observedAt.status === "unknown").length,
      chronologyIneligible: result.records.filter((record) => !record.chronologyEligible).length,
      completeRunDenominatorEligible: result.records.filter(
        (record) =>
          record.completeRunCandidateDenominatorEligible.status === "assessed" &&
          record.completeRunCandidateDenominatorEligible.value === true,
      ).length,
    },
    conflictedPayloads: {
      "retained-payload-0027": result.records.filter(
        (record) => record.retainedPayloadIdentity.value?.retainedPayloadId === "retained-payload-0027",
      ).length,
      "retained-payload-0028": result.records.filter(
        (record) => record.retainedPayloadIdentity.value?.retainedPayloadId === "retained-payload-0028",
      ).length,
    },
    hashes: {
      protocolSha256: inputs.provenance.protocolSha256,
      inputManifestSelfHash: inputs.provenance.inputManifestSelfHash,
      candidateObservationsSha256: inputs.provenance.candidateObservationsSha256,
      missingTimeDecisionSha256: inputs.provenance.missingTimeDecisionSha256,
      selectionHelperSha256: inputs.provenance.selectionHelperSha256,
      selectionRulesSha256: inputs.provenance.selectionRulesSha256,
      manualAuditSetSha256: sha256Bytes(Buffer.from(result.text, "utf8")),
    },
  };
}

function validate(inputs, result) {
  const failures = [];
  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const sourceIds = new Set(inputs.candidateEntries.map((entry) => observationId(entry.record)));
  const finalIds = result.records.map((record) => record.candidateObservationId);
  const finalIdSet = new Set(finalIds);
  check(finalIds.length === finalIdSet.size, "manual set contains duplicate candidateObservationId");
  check(finalIds.every((candidateId) => sourceIds.has(candidateId)), "manual set references unknown candidateObservationId");
  check(
    result.records.every(
      (record) =>
        record.selectionReasons.length > 0 && record.selectionReasons.every((reason) => VALID_REASONS.has(reason)),
    ),
    "manual set contains missing or invalid selection reason",
  );
  check(
    result.rule1.every((record) => finalIdSet.has(observationId(record))),
    "not every reproduced legacy top-15 observation is included",
  );
  check(
    result.cExcluded.every((record) => observedAt(record).status === "assessed"),
    "a C record with unknown time was excluded",
  );
  check(
    result.fidelityC
      .filter((record) => observedAt(record).status === "unknown")
      .every((record) => finalIdSet.has(observationId(record))),
    "a C record with unknown time was not retained",
  );
  check(
    result.records.every((manual) => {
      const source = inputs.byId.get(manual.candidateObservationId).record;
      return canonicalJson(manual.observedAt) === canonicalJson(source.inputEvidence.observedAt);
    }),
    "a manual record changed its Step B observedAt wrapper",
  );
  check(
    result.records.every((manual) => manual.chronologyEligible === (manual.observedAt.status === "assessed")),
    "chronologyEligible does not follow observedAt status",
  );
  check(
    result.records
      .filter((manual) => manual.fidelityStratum === "C-selected-output-only")
      .every(
        (manual) =>
          manual.completeRunCandidateDenominatorEligible.status === "assessed" &&
          manual.completeRunCandidateDenominatorEligible.value === false,
      ),
    "a C record entered the complete-run denominator",
  );

  for (const cell of result.controlCells) {
    if (cell.status === "selected") {
      const selected = inputs.byId.get(cell.selectedCandidateObservationId).record;
      check(
        assessedBoolean(selected.legacyAssessment.keywordMatched, "reproduced legacy match", selected) === false,
        `${cell.identity}/${cell.sourcePriority}: matched record selected as unmatched control`,
      );
      check(
        result.reasonMap
          .get(cell.selectedCandidateObservationId)
          ?.has(`unmatched-control-${cell.sourcePriority.toLowerCase()}`),
        `${cell.identity}/${cell.sourcePriority}: deterministic control reason missing`,
      );
    } else {
      check(cell.unmatchedCandidateCount === 0, `${cell.identity}/${cell.sourcePriority}: empty cell has unmatched candidate`);
    }
  }

  for (const normalizedId of result.initialNormalizedIds) {
    const expected = inputs.candidateEntries
      .filter((entry) => entry.record.normalizedContentId === normalizedId)
      .map((entry) => observationId(entry.record));
    check(
      expected.every((candidateId) => finalIdSet.has(candidateId)),
      `${normalizedId}: recurrence expansion is incomplete`,
    );
  }
  check(
    result.records.every((record) => result.initialNormalizedIds.has(record.normalizedContentId)),
    "manual set includes content outside the initial normalized-content seed",
  );

  const sortedAgain = [...result.records].sort((left, right) => {
    const leftEntry = { source: inputs.byId.get(left.candidateObservationId) };
    const rightEntry = { source: inputs.byId.get(right.candidateObservationId) };
    return compareSelectedEntries(leftEntry, rightEntry);
  });
  check(
    sortedAgain.every((record, index) => record.candidateObservationId === result.records[index].candidateObservationId),
    "manual set ordering violates the authorized bucket rule",
  );

  const conflictRunIds = new Set(
    result.records
      .filter((record) => ["retained-payload-0027", "retained-payload-0028"].includes(record.retainedPayloadIdentity.value?.retainedPayloadId))
      .map((record) => record.runId),
  );
  check(conflictRunIds.size === 2, "conflicting payloads are not represented by distinct run IDs");

  return { pass: failures.length === 0, failures };
}

function generate() {
  const inputs = loadInputs();
  const first = select(inputs);
  const second = select(inputs);
  invariant(first.text === second.text, "two in-memory generations were not byte-identical");
  const validation = validate(inputs, first);
  invariant(validation.pass, `selection validation failed: ${validation.failures.join("; ")}`);
  return { inputs, result: first, validation, metrics: buildMetrics(inputs, first) };
}

function main() {
  const validateExisting = process.argv.slice(2).includes("--validate-existing");
  const generated = generate();
  if (validateExisting) {
    invariant(fs.existsSync(absolute(PATHS.output)), `${PATHS.output} does not exist`);
    const existing = fs.readFileSync(absolute(PATHS.output), "utf8");
    parseJsonl(PATHS.output);
    invariant(existing === generated.result.text, "existing manual-audit-set.jsonl is not byte-identical to regeneration");
  } else {
    fs.writeFileSync(absolute(PATHS.output), generated.result.text, "utf8");
    const written = fs.readFileSync(absolute(PATHS.output), "utf8");
    invariant(written === generated.result.text, "written manual-audit-set.jsonl differs from generated bytes");
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        mode: validateExisting ? "validate-existing" : "generate",
        deterministicByteIdentity: true,
        validation: generated.validation,
        metrics: generated.metrics,
      },
      null,
      2,
    )}\n`,
  );
}

main();
