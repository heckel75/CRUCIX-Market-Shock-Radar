/**
 * Deterministically aggregate the frozen Session 15 signal-audit evidence.
 *
 * This helper is audit-only. It does not select Methodology 2.0 parameters,
 * implement production behavior, or modify any frozen input artifact.
 *
 * Usage:
 *   node audit/session15/finalize-signal-audit.mjs --write
 *   node audit/session15/finalize-signal-audit.mjs
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

const PATHS = Object.freeze({
  projectLog: "CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md",
  protocol: "audit/session14-signal-audit-protocol.md",
  architecture: "audit/session14-architecture-decision.md",
  coreSchema: "audit/methodology-2-core-schema-draft.md",
  parameterRegister: "audit/methodology-2-parameter-register.md",
  inventory: "audit/session15/inventory.json",
  manifest: "audit/session15/input-manifest.json",
  candidates: "audit/session15/candidate-observations.jsonl",
  manual: "audit/session15/manual-audit-set.jsonl",
  origins: "audit/session15/source-origin-ledger.jsonl",
  assignments: "audit/session15/assignment-ledger.jsonl",
  clusters: "audit/session15/event-cluster-ledger.jsonl",
  sensitivity: "audit/session15/signal-elevation-sensitivity.json",
  notes: "audit/session15/adjudication-notes.md",
  missingTimeDecision: "audit/session15/step-c-missing-time-decision.md",
  extractor: "audit/session15/extract-candidate-observations.mjs",
  selector: "audit/session15/select-manual-audit-set.mjs",
  originValidator: "audit/session15/validate-source-origin-ledger.mjs",
  clusterValidator: "audit/session15/validate-event-clustering.mjs",
  labelValidator: "audit/session15/validate-event-labeling.mjs",
  evaluator: "audit/session15/evaluate-signal-elevation.mjs",
  helper: "audit/session15/finalize-signal-audit.mjs",
  output: "audit/session15/metrics.json",
});

const EXPECTED = Object.freeze({
  finalWorkOrderSha256: "b54810c3468420548423d057b15c6cb72bacdb684a69158e789ba07d59c239c5",
  projectLogSha256: "62a7284c36bbd4bfe59f0a90749ab506de7619b9359c078bebf17ed739c05751",
  protocolSha256: "6d29f97737a3b9d589c826846613863699cdbc5e4e90e88aba65d815dfd9d670",
  architectureSha256: "f1d0bf58f255ed144ea30b445fd9ef7efb05b7ae71ef4797505eff8d135fa321",
  coreSchemaSha256: "d32a00a572c4d01e390839b1cc5375c03d8b692fa6450cc42a6e0fcf21706bb2",
  parameterRegisterSha256: "5d60242eee78462d0e482c81d77821680f9e0b2f89c8b05b78e75eeeba1651f7",
  inventorySha256: "26388dace6653546f6f6442e7405ceb9f344d01ee33ff01d1625f5efe81b884e",
  manifestPhysicalSha256: "95fe87b181f4a714a4571960fc6fca03fa62c96a94b82b4920c0a471a5767f0c",
  manifestSelfHash: "3a864319add335d4f2fb3550fa8b865a6282d29f4a37819200e516106cdf3651",
  candidatesSha256: "36604f9ea997335f3d9c368c0c76135b37babd797805180c1e27568a1b8ab69e",
  manualSha256: "5662b5642e5c3dcec1f92c7baefb1312768a58574ad09a350bc8dfe09161dc45",
  originsSha256: "05b479b7e1dc244dd10c0594722f88dd649428b46421e5990c729d2eaee8cc42",
  assignmentsSha256: "e7454a9b437cf9cf94e188dde5846ec83b41a67aae02b6e5c837fe7e103f47b5",
  clustersSha256: "eabad73ae8b9f4c8ac06a2c5e1d80b8bcd8a4d7c40dc0c03d014b7e855236768",
  sensitivitySha256: "ed935b9644e4038ef0735c3a6ff79aa675fb16e42dce97abb079482b3ef624a9",
  notesSha256: "80e8fc09de55b47e4aea1f0873dd9e029a76374c71680192f9f085e145b5e5a3",
  missingTimeDecisionSha256: "112d54be9105ed026c50ab78337f9f707df9f16da6d5129dd7d8fd798665ab38",
  extractorSha256: "0bdfb46e61d572c450da6e257dca3d769d53e9b8b07c506564753fad6aabc984",
  selectorSha256: "c5565be9f54024dad5eddfc4e6c44dc505ec6628205075e74744c1311fcc8d53",
  originValidatorSha256: "3468edf48b46a911763ce259bb87ea04bc14e23e846df420111ae5843217bc2b",
  clusterValidatorSha256: "fb3158ebb03ee9fae66c6a6cc832b929df2a270161b8224fb4e9e96370a92b83",
  labelValidatorSha256: "680650e21ecf443763bbb768a1c53864a783610981a251195d3f2df2937399ca",
  evaluatorSha256: "aa3968d9e3c83f9627cfb9b5839392ea9c45895faea8c12e4bc58c57bbf391bf",
  stepEClusterPrefixBytes: 394391,
  stepEClusterPrefixSha256: "7235cf44388568e550cb2767c68e8b685be0db71191f6f7e7ca564a96d5acdc9",
  stepFClusterSuffixSha256: "d7425c9822e28f9d652d0dd0e4c9fbbae89599d29851307e96e82b1ecb31b701",
  preStepGNotesBytes: 30973,
  preStepGNotesSha256: "596f498293e6dfe869778a194971562d28ed4238f1cf0c2c9c91760a36115b88",
  gitHeadAtFreeze: "5ababb0101ae26254962621357b4a1f5380e5560",
});

const FIDELITY_B = "B-reconstructable-run-input";
const FIDELITY_C = "C-selected-output-only";
const CHANNELS = Object.freeze([
  "conflict-escalation",
  "sanctions-policy",
  "energy-disruption",
  "credit-stress",
  "supply-chain",
]);
const MECHANISM_CHANNEL = Object.freeze({
  "security-risk-repricing": "conflict-escalation",
  "trade-asset-access-restriction": "sanctions-policy",
  "energy-supply-disruption": "energy-disruption",
  "funding-credit-transmission": "credit-stress",
  "production-transport-bottleneck": "supply-chain",
});

function absolute(relativePath) {
  return path.resolve(ROOT, relativePath);
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

function fileInfo(relativePath) {
  const bytes = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function parseJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function parseJsonl(relativePath) {
  const text = fs.readFileSync(absolute(relativePath), "utf8");
  invariant(text.endsWith("\n"), `${relativePath} must end with a newline`);
  return text.trimEnd().split(/\r?\n/).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${relativePath}:${index + 1}: ${error.message}`);
    }
  });
}

function round(value, digits = 6) {
  if (value === null || !Number.isFinite(value)) return value;
  return Number(value.toFixed(digits));
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => String(left).localeCompare(String(right)));
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function counts(values, orderedKeys = []) {
  const map = new Map(orderedKeys.map((key) => [key, 0]));
  for (const value of values) increment(map, value);
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function median(sortedValues) {
  if (!sortedValues.length) return null;
  const middle = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2
    ? sortedValues[middle]
    : (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

function nearestRank(sortedValues, probability) {
  if (!sortedValues.length) return null;
  return sortedValues[Math.max(0, Math.ceil(probability * sortedValues.length) - 1)];
}

function distribution(values) {
  const ordered = values.slice().sort((left, right) => left - right);
  return {
    sampleCount: ordered.length,
    minimum: ordered.length ? ordered[0] : null,
    median: median(ordered),
    mean: ordered.length ? round(ordered.reduce((sum, value) => sum + value, 0) / ordered.length) : null,
    p90NearestRank: nearestRank(ordered, 0.9),
    p95NearestRank: nearestRank(ordered, 0.95),
    maximum: ordered.length ? ordered.at(-1) : null,
    percentileMethod: "nearest-rank; rank=ceil(p*n); median is midpoint for even n",
  };
}

function proportion(numerator, denominator, {
  exclusions = [],
  unknownTreatment = "No unknown values in the denominator.",
  fidelityStratum = "manual-audit-set",
} = {}) {
  return {
    numerator,
    denominator,
    proportion: denominator ? round(numerator / denominator, 9) : null,
    percent: denominator ? round((numerator / denominator) * 100, 6) : null,
    exclusions,
    unknownTreatment,
    fidelityStratum,
  };
}

function wrapperValue(wrapper) {
  return wrapper?.status === "assessed" ? wrapper.value : null;
}

function resolveCurrent(records, idField) {
  const map = new Map();
  for (const record of records) map.set(record[idField], record);
  return [...map.values()];
}

function composition(cluster) {
  if (cluster.chronologyEligibleMemberCount > 0 && cluster.chronologyIneligibleMemberCount > 0) return "mixed";
  if (cluster.chronologyEligibleMemberCount > 0) return "B-only";
  return "C-only";
}

function compactQualification(result) {
  return {
    qualifyingClusterRunChannelCount: result.qualifyingClusterRunChannelCount,
    distinctQualifyingClusterCount: result.distinctQualifyingClusterCount,
    retainedRunsWithAtLeastOneQualifyingChannel: result.runsWithAtLeastOneQualifyingChannel.length,
    frequencyByChannel: Object.fromEntries(CHANNELS.map((channel) => [
      channel,
      {
        qualifyingClusterRunChannelCount: result.qualifyingFrequencyByChannel[channel].qualifyingClusterRunChannelCount,
        distinctQualifyingClusterCount: result.qualifyingFrequencyByChannel[channel].distinctQualifyingClusterCount,
        retainedRunsWithQualification: result.qualifyingFrequencyByChannel[channel].retainedRunsWithQualification,
      },
    ])),
    multiChannelClusterRunCount: result.multiChannelClusterRunCount,
    channelBreadth: result.channelBreadth,
  };
}

function compactObservationCandidateResult(result) {
  return {
    candidateId: result.candidateId,
    assignedObservationDenominator: result.assignedObservationDenominator,
    qualifyingObservationCount: result.qualifyingObservationCount,
    distinctQualifyingClusterCount: result.distinctQualifyingClusterCount,
    qualifyingClusterRunChannelCaseCount: result.qualifyingClusterRunChannelCaseCount,
    qualifyingObservationChannelOccurrences: result.qualifyingObservationChannelOccurrences,
    repeatedObservationChannelOccurrencesCollapsed: result.repeatedObservationChannelOccurrencesCollapsed,
    blockerCounts: result.blockerCounts,
  };
}

function loadInputs() {
  const physical = {
    projectLogSha256: fileHash(PATHS.projectLog),
    protocolSha256: fileHash(PATHS.protocol),
    architectureSha256: fileHash(PATHS.architecture),
    coreSchemaSha256: fileHash(PATHS.coreSchema),
    parameterRegisterSha256: fileHash(PATHS.parameterRegister),
    inventorySha256: fileHash(PATHS.inventory),
    manifestPhysicalSha256: fileHash(PATHS.manifest),
    candidatesSha256: fileHash(PATHS.candidates),
    manualSha256: fileHash(PATHS.manual),
    originsSha256: fileHash(PATHS.origins),
    assignmentsSha256: fileHash(PATHS.assignments),
    clustersSha256: fileHash(PATHS.clusters),
    sensitivitySha256: fileHash(PATHS.sensitivity),
    notesSha256: fileHash(PATHS.notes),
    missingTimeDecisionSha256: fileHash(PATHS.missingTimeDecision),
    extractorSha256: fileHash(PATHS.extractor),
    selectorSha256: fileHash(PATHS.selector),
    originValidatorSha256: fileHash(PATHS.originValidator),
    clusterValidatorSha256: fileHash(PATHS.clusterValidator),
    labelValidatorSha256: fileHash(PATHS.labelValidator),
    evaluatorSha256: fileHash(PATHS.evaluator),
    helperSha256: fileHash(PATHS.helper),
  };
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (key in physical) invariant(physical[key] === expected, `${key} changed: ${physical[key]} != ${expected}`);
  }

  const inventory = parseJson(PATHS.inventory);
  const manifest = parseJson(PATHS.manifest);
  const manifestForHash = structuredClone(manifest);
  manifestForHash.manifestHash.value = null;
  const manifestSelfHash = sha256(Buffer.from(canonicalJson(manifestForHash), "utf8"));
  invariant(manifestSelfHash === EXPECTED.manifestSelfHash, "input-manifest canonical self-hash changed");
  invariant(manifest.manifestHash.value === EXPECTED.manifestSelfHash, "input-manifest recorded self-hash changed");
  invariant(manifest.repositoryAtFreeze.gitHead === EXPECTED.gitHeadAtFreeze, "input-manifest freeze HEAD changed");

  const sourceFailures = [];
  for (const entry of manifest.sourceEvidenceFiles) {
    const sourcePath = absolute(entry.repositoryRelativePath);
    if (!fs.existsSync(sourcePath)) {
      sourceFailures.push(`${entry.repositoryRelativePath}:missing`);
      continue;
    }
    const bytes = fs.readFileSync(sourcePath);
    if (bytes.length !== entry.byteCount) sourceFailures.push(`${entry.repositoryRelativePath}:byte-count`);
    if (sha256(bytes) !== entry.sha256) sourceFailures.push(`${entry.repositoryRelativePath}:sha256`);
  }
  invariant(sourceFailures.length === 0, `frozen source validation failed: ${sourceFailures.join(", ")}`);

  const preservationFailures = [];
  let preservationBytes = 0;
  let preservationFiles = 0;
  for (const entry of inventory.files.filter((file) => file.preservation.required)) {
    const copyPath = absolute(entry.preservation.copyPath);
    if (!fs.existsSync(copyPath)) {
      preservationFailures.push(`${entry.repositoryRelativePath}:copy-missing`);
      continue;
    }
    const bytes = fs.readFileSync(copyPath);
    preservationBytes += bytes.length;
    preservationFiles += 1;
    if (bytes.length !== entry.preservation.copyBytes) preservationFailures.push(`${entry.repositoryRelativePath}:copy-byte-count`);
    if (sha256(bytes) !== entry.preservation.copySha256) preservationFailures.push(`${entry.repositoryRelativePath}:copy-sha256`);
    if (entry.preservation.copySha256 !== entry.sha256) preservationFailures.push(`${entry.repositoryRelativePath}:original-copy-hash-record`);
  }
  invariant(preservationFailures.length === 0, `preservation validation failed: ${preservationFailures.join(", ")}`);

  const clusterBytes = fs.readFileSync(absolute(PATHS.clusters));
  invariant(clusterBytes.length > EXPECTED.stepEClusterPrefixBytes, "event-cluster ledger lacks Step-F suffix");
  invariant(
    sha256(clusterBytes.subarray(0, EXPECTED.stepEClusterPrefixBytes)) === EXPECTED.stepEClusterPrefixSha256,
    "Step-E event-cluster prefix changed",
  );
  invariant(
    sha256(clusterBytes.subarray(EXPECTED.stepEClusterPrefixBytes)) === EXPECTED.stepFClusterSuffixSha256,
    "Step-F event-assessment suffix changed",
  );
  const notesBytes = fs.readFileSync(absolute(PATHS.notes));
  invariant(
    sha256(notesBytes.subarray(0, EXPECTED.preStepGNotesBytes)) === EXPECTED.preStepGNotesSha256,
    "pre-Step-G adjudication-note prefix changed",
  );

  return {
    physical,
    inventory,
    manifest,
    manifestSelfHash,
    candidates: parseJsonl(PATHS.candidates),
    manual: parseJsonl(PATHS.manual),
    origins: parseJsonl(PATHS.origins),
    assignments: parseJsonl(PATHS.assignments),
    ledger: parseJsonl(PATHS.clusters),
    sensitivity: parseJson(PATHS.sensitivity),
    frozenSourceValidation: {
      recordedSourceFiles: manifest.sourceEvidenceFiles.length,
      verifiedSourceFiles: manifest.sourceEvidenceFiles.length,
      failures: sourceFailures,
    },
    preservationValidation: {
      preservationRoot: inventory.preservation.preservationRoot,
      verifiedFiles: preservationFiles,
      physicalBytes: preservationBytes,
      failures: preservationFailures,
    },
  };
}

function buildMetrics(inputs) {
  const bCandidates = inputs.candidates.filter((record) => record.fidelityStratum === FIDELITY_B);
  const cCandidates = inputs.candidates.filter((record) => record.fidelityStratum === FIDELITY_C);
  const currentAssignments = resolveCurrent(inputs.assignments, "candidateObservationId");
  const acceptedAssignments = currentAssignments.filter((record) => record.assignmentDecision === "accepted");
  const unresolvedAssignments = currentAssignments.filter((record) => record.assignmentDecision === "unresolved-after-adjudication");
  const assignmentByCandidate = new Map(currentAssignments.map((record) => [record.candidateObservationId, record]));
  const manualByCandidate = new Map(inputs.manual.map((record) => [record.candidateObservationId, record]));
  const activeClusters = inputs.ledger.filter((record) => record.recordType === "event-cluster" && record.auditIdentityState === "active");
  const parentSeries = inputs.ledger.filter((record) => record.recordType === "parent-series");
  const assessments = inputs.ledger.filter((record) => record.recordType === "event-field-assessment");
  const assessmentByCluster = new Map(assessments.map((record) => [record.eventClusterId, record]));
  const clusterById = new Map(activeClusters.map((record) => [record.eventClusterId, record]));

  invariant(inputs.candidates.length === 1217, "candidate observation count changed");
  invariant(inputs.manual.length === 428, "manual audit set count changed");
  invariant(currentAssignments.length === 428, "current assignment count changed");
  invariant(acceptedAssignments.length === 327, "accepted assignment count changed");
  invariant(unresolvedAssignments.length === 101, "unresolved assignment count changed");
  invariant(activeClusters.length === 123, "active cluster count changed");
  invariant(assessments.length === 123, "Step-F assessment count changed");

  const duplicateStats = (records, selector) => {
    const unique = new Set(records.map(selector)).size;
    return {
      observations: records.length,
      unique,
      duplicateExcess: records.length - unique,
      duplicateRate: proportion(records.length - unique, records.length, {
        exclusions: [],
        unknownTreatment: "All records carry the required comparison hash.",
        fidelityStratum: records === bCandidates ? FIDELITY_B : FIDELITY_C,
      }),
    };
  };

  const assignedNormalizedToClusters = new Map();
  for (const assignment of acceptedAssignments) {
    if (!assignedNormalizedToClusters.has(assignment.normalizedContentId)) {
      assignedNormalizedToClusters.set(assignment.normalizedContentId, new Set());
    }
    assignedNormalizedToClusters.get(assignment.normalizedContentId).add(assignment.eventClusterId.value);
  }

  const roleCompression = (predicate) => {
    const observations = inputs.manual.filter(predicate);
    const assigned = observations.map((record) => assignmentByCandidate.get(record.candidateObservationId))
      .filter((record) => record.assignmentDecision === "accepted");
    const clusters = new Set(assigned.map((record) => record.eventClusterId.value));
    return {
      inputObservations: observations.length,
      assignedObservations: assigned.length,
      unresolvedObservations: observations.length - assigned.length,
      representedActiveClusters: clusters.size,
      assignedObservationsPerCluster: clusters.size ? round(assigned.length / clusters.size) : null,
    };
  };

  const originCounts = new Map();
  const independenceCounts = new Map();
  for (const record of inputs.origins) {
    if (record.sourceOriginId.status === "assessed") increment(originCounts, record.sourceOriginId.value);
    if (record.independenceGroupId.status === "assessed") increment(independenceCounts, record.independenceGroupId.value);
  }
  const assessedOriginObservations = [...originCounts.values()].reduce((sum, value) => sum + value, 0);
  const assessedIndependenceObservations = [...independenceCounts.values()].reduce((sum, value) => sum + value, 0);
  const topOrigin = [...originCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  const topIndependence = [...independenceCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  const originHhi = [...originCounts.values()].reduce((sum, value) => sum + (value / assessedOriginObservations) ** 2, 0);
  const independenceHhi = [...independenceCounts.values()].reduce((sum, value) => sum + (value / assessedIndependenceObservations) ** 2, 0);
  const syndicationFamilyCounts = new Map();
  for (const record of inputs.origins.filter((row) => row.syndicationFamilyId.status === "assessed")) {
    increment(syndicationFamilyCounts, record.syndicationFamilyId.value);
  }
  const multiObservationSyndicationFamilies = new Set(
    [...syndicationFamilyCounts].filter(([, count]) => count > 1).map(([id]) => id),
  );
  const observationsInMultiSyndicationFamilies = inputs.origins.filter(
    (record) => record.syndicationFamilyId.status === "assessed"
      && multiObservationSyndicationFamilies.has(record.syndicationFamilyId.value),
  ).length;
  const conflictObservationRows = inputs.origins.filter(
    (record) => record.provenanceConflictEvidence.status === "assessed" && record.provenanceConflictEvidence.value,
  );

  const parentTypeDistribution = parentSeries.map((parent) => ({
    parentSeriesId: parent.parentSeriesId,
    childClusterCount: parent.childEventClusterIds.length,
    eventTypeDistribution: counts(parent.childEventClusterIds.map((id) => {
      const assessment = assessmentByCluster.get(id);
      return assessment.eventType.status === "assessed" ? assessment.eventType.value : "unknown";
    }), [
      "armed-conflict-action",
      "policy-restriction-action",
      "energy-system-event",
      "financial-distress-event",
      "production-logistics-event",
      "unknown",
    ]),
  }));
  const largestParent = parentTypeDistribution.slice().sort(
    (left, right) => right.childClusterCount - left.childClusterCount || left.parentSeriesId.localeCompare(right.parentSeriesId),
  )[0];

  const eventTypeValues = assessments.map((record) => record.eventType.status === "assessed" ? record.eventType.value : "unknown");
  const eventTypesOverall = counts(eventTypeValues, [
    "armed-conflict-action",
    "policy-restriction-action",
    "energy-system-event",
    "financial-distress-event",
    "production-logistics-event",
    "unknown",
  ]);
  const eventTypesByComposition = Object.fromEntries(["B-only", "C-only", "mixed"].map((group) => [
    group,
    counts(activeClusters.filter((cluster) => composition(cluster) === group).map((cluster) => {
      const assessment = assessmentByCluster.get(cluster.eventClusterId);
      return assessment.eventType.status === "assessed" ? assessment.eventType.value : "unknown";
    }), [
      "armed-conflict-action",
      "policy-restriction-action",
      "energy-system-event",
      "financial-distress-event",
      "production-logistics-event",
      "unknown",
    ]),
  ]));

  const legacyCompression = roleCompression((record) => record.selectionReasons.includes("reproduced-legacy-top15"));
  const controlCompression = roleCompression((record) => record.selectionReasons.some((reason) => reason.startsWith("unmatched-control-")));
  const cCompression = roleCompression((record) => record.fidelityStratum === FIDELITY_C);
  const legacyClusterIds = new Set(
    inputs.manual.filter((record) => record.selectionReasons.includes("reproduced-legacy-top15"))
      .map((record) => assignmentByCandidate.get(record.candidateObservationId))
      .filter((assignment) => assignment.assignmentDecision === "accepted")
      .map((assignment) => assignment.eventClusterId.value),
  );

  const actionStageOverall = counts(assessments.map((record) => (
    record.actionStage.status === "assessed" ? record.actionStage.value : "unknown"
  )), ["rhetoric", "threatened", "announced", "implemented", "impact-observed", "unknown"]);
  const actionStageByComposition = Object.fromEntries(["B-only", "C-only", "mixed"].map((group) => [
    group,
    counts(activeClusters.filter((cluster) => composition(cluster) === group).map((cluster) => {
      const assessment = assessmentByCluster.get(cluster.eventClusterId);
      return assessment.actionStage.status === "assessed" ? assessment.actionStage.value : "unknown";
    }), ["rhetoric", "threatened", "announced", "implemented", "impact-observed", "unknown"]),
  ]));

  const mechanismDistribution = {};
  for (const mechanismId of Object.keys(MECHANISM_CHANNEL)) {
    const values = assessments.map((assessment) => assessment.mechanisms.find((item) => item.mechanismId === mechanismId).directness);
    const directnessCounts = counts(values, ["direct", "contextual", "none"]);
    mechanismDistribution[mechanismId] = {
      channelId: MECHANISM_CHANNEL[mechanismId],
      counts: directnessCounts,
      shares: Object.fromEntries(Object.entries(directnessCounts).map(([directness, count]) => [
        directness,
        proportion(count, activeClusters.length, {
          exclusions: [],
          unknownTreatment: "All 123 active clusters have one persisted assessment for this mechanism.",
          fidelityStratum: "manual-assigned-active-clusters",
        }),
      ])),
    };
  }
  const directCounts = assessments.map((assessment) => assessment.mechanisms.filter((item) => item.directness === "direct").length);
  const directChannelDistribution = Object.fromEntries(Object.entries(MECHANISM_CHANNEL).map(([mechanism, channel]) => [
    channel,
    assessments.filter((assessment) => assessment.mechanisms.find((item) => item.mechanismId === mechanism).directness === "direct").length,
  ]));

  const exactIndependentDistribution = counts(
    assessments.filter((record) => record.independentSourceCount.status === "assessed").map((record) => String(record.independentSourceCount.value)),
  );
  const lowerBoundDistribution = counts(assessments.map((record) => String(record.assessedIndependenceGroupLowerBound.value)));
  const corroborationOverall = counts(assessments.map((record) => (
    record.corroborationStatus.status === "assessed" ? record.corroborationStatus.value : "unknown"
  )), ["single-origin", "corroborated-independent", "conflicting", "unknown-origin", "retracted-only", "unknown"]);
  const corroborationByComposition = Object.fromEntries(["B-only", "C-only", "mixed"].map((group) => [
    group,
    counts(activeClusters.filter((cluster) => composition(cluster) === group).map((cluster) => {
      const wrapper = assessmentByCluster.get(cluster.eventClusterId).corroborationStatus;
      return wrapper.status === "assessed" ? wrapper.value : "unknown";
    }), ["single-origin", "corroborated-independent", "conflicting", "unknown-origin", "retracted-only", "unknown"]),
  ]));

  const clusterLifecycle = counts(assessments.map((record) => (
    record.lifecycleState.status === "assessed" ? record.lifecycleState.value : "unknown"
  )), ["new", "escalating", "continuing", "de-escalating", "unknown"]);
  const observationLifecycleRows = assessments.flatMap((assessment) => assessment.observationLifecycle.map((row) => ({
    ...row,
    eventClusterId: assessment.eventClusterId,
  })));
  const observationLifecycle = counts(observationLifecycleRows.map((row) => (
    row.lifecycle.status === "assessed" ? row.lifecycle.value : "unknown"
  )), ["new", "escalating", "continuing", "de-escalating", "unknown"]);
  const repeatedWithoutMaterialChange = observationLifecycleRows.filter((row) => (
    row.lifecycle.status === "assessed"
      && row.lifecycle.value === "continuing"
      && row.materialChange.status === "assessed"
      && row.materialChange.value === false
  ));

  const candidateA = inputs.sensitivity.candidateA.variants.map((variant) => ({
    candidateId: variant.candidateId,
    evidenceVariantId: variant.evidenceVariantId,
    stageVariantId: variant.stageVariantId,
    withLifecycle: compactQualification(variant.withLifecycle),
    diagnosticNoLifecycle: compactQualification(variant.diagnosticNoLifecycle),
    lifecycleClauseEffect: {
      qualifyingCountWithLifecycle: variant.lifecycleClauseEffect.qualifyingCountWithLifecycle,
      qualifyingCountWithoutLifecycle: variant.lifecycleClauseEffect.qualifyingCountWithoutLifecycle,
      rowsRemovedByLifecycleClause: variant.lifecycleClauseEffect.rowsRemovedByLifecycleClause,
    },
  }));
  const candidateB = inputs.sensitivity.candidateB.variants.map((variant) => ({
    candidateId: variant.candidateId,
    evidenceVariantId: variant.evidenceVariantId,
    stageOrdinalCutoff: variant.stageOrdinalCutoff,
    result: compactQualification(variant.result),
  }));
  const candidateC = inputs.sensitivity.candidateC.variants.map((variant) => ({
    candidateId: variant.candidateId,
    structuralVariantId: variant.structuralVariantId,
    eligibilityIdenticalToStructuralVariant: variant.eligibilityIdenticalToStructuralVariant,
    qualifyingClusterRunChannelCount: variant.qualifyingClusterRunChannelCount,
    rankingTieCellCount: variant.rankingTieCellCount,
    topRankTieCellCount: variant.topRankTieCellCount,
    channelBreadth: variant.channelBreadth,
  }));
  const crossCandidate = inputs.sensitivity.crossCandidateDifferences;

  const initialNeeds = inputs.assignments.filter((record) => record.assignmentPass === 1 && record.assignmentDecision === "needs-adjudication");
  const acceptedMethodCounts = counts(acceptedAssignments.map((record) => record.clusteringMethod), [
    "exact-normalized-content",
    "explicit-incident-or-source-identifier",
    "manual-identity-tuple",
  ]);

  const fullBRunSetsByNormalized = new Map();
  for (const record of bCandidates) {
    if (!fullBRunSetsByNormalized.has(record.normalizedContentId)) fullBRunSetsByNormalized.set(record.normalizedContentId, new Set());
    fullBRunSetsByNormalized.get(record.normalizedContentId).add(record.runId);
  }
  const recurringFullBNormalized = new Set(
    [...fullBRunSetsByNormalized].filter(([, runIds]) => runIds.size > 1).map(([id]) => id),
  );
  const manualBByNormalized = new Map();
  for (const record of inputs.manual.filter((row) => row.fidelityStratum === FIDELITY_B)) {
    if (!manualBByNormalized.has(record.normalizedContentId)) manualBByNormalized.set(record.normalizedContentId, []);
    manualBByNormalized.get(record.normalizedContentId).push(record);
  }
  const recurringManualB = [...manualBByNormalized].filter(([, rows]) => new Set(rows.map((row) => row.runId)).size > 1);
  let recurringStable = 0;
  let recurringSplit = 0;
  let recurringWithUnresolved = 0;
  let recurringWithNoAccepted = 0;
  for (const [, rows] of recurringManualB) {
    const assignments = rows.map((row) => assignmentByCandidate.get(row.candidateObservationId));
    const acceptedClusterIds = new Set(assignments.filter((row) => row.assignmentDecision === "accepted").map((row) => row.eventClusterId.value));
    const hasUnresolved = assignments.some((row) => row.assignmentDecision === "unresolved-after-adjudication");
    if (acceptedClusterIds.size === 1) recurringStable += 1;
    if (acceptedClusterIds.size > 1) recurringSplit += 1;
    if (hasUnresolved) recurringWithUnresolved += 1;
    if (acceptedClusterIds.size === 0) recurringWithNoAccepted += 1;
  }

  const payloadCandidateRows = new Map();
  const candidateLineBytes = fs.readFileSync(absolute(PATHS.candidates), "utf8").trimEnd().split(/\r?\n/)
    .map((line) => ({ record: JSON.parse(line), bytes: Buffer.byteLength(`${line}\n`, "utf8") }));
  for (const item of candidateLineBytes.filter((item) => item.record.fidelityStratum === FIDELITY_B)) {
    const payloadId = item.record.inputEvidence.retainedPayloadIdentity.value.retainedPayloadId;
    if (!payloadCandidateRows.has(payloadId)) payloadCandidateRows.set(payloadId, []);
    payloadCandidateRows.get(payloadId).push(item);
  }
  const perRetainedBPayload = inputs.inventory.retainedRunIdentityAudit.payloads.map((payload) => {
    const rows = payloadCandidateRows.get(payload.retainedPayloadId) ?? [];
    const auditRecordBytes = rows.reduce((sum, item) => sum + item.bytes, 0);
    const observationCount = rows.length;
    const uniqueNormalizedContentCount = new Set(rows.map((item) => item.record.normalizedContentId)).size;
    return {
      retainedPayloadId: payload.retainedPayloadId,
      internalRunTimestamp: payload.internalRunTimestamp,
      canonicalPayloadBytesUtf8: payload.canonicalPayloadBytesUtf8,
      candidateCount: observationCount,
      uniqueNormalizedContentCount,
      exactDuplicateExcess: observationCount - uniqueNormalizedContentCount,
      exactDuplicateRate: proportion(observationCount - uniqueNormalizedContentCount, observationCount, {
        exclusions: [],
        unknownTreatment: "All fidelity-B records carry normalizedContentId.",
        fidelityStratum: FIDELITY_B,
      }),
      auditCandidateJsonlBytes: auditRecordBytes,
      meanAuditJsonlBytesPerCandidate: observationCount ? round(auditRecordBytes / observationCount) : null,
    };
  });

  const timestamps = sortedUnique(inputs.inventory.retainedRunIdentityAudit.payloads.map((payload) => payload.internalRunTimestamp));
  const withinDayIntervals = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    if (timestamps[index].slice(0, 10) === timestamps[index - 1].slice(0, 10)) {
      withinDayIntervals.push(Date.parse(timestamps[index]) - Date.parse(timestamps[index - 1]));
    }
  }
  const withinDayIntervalDistribution = distribution(withinDayIntervals);

  const helperFiles = [
    PATHS.extractor,
    PATHS.selector,
    PATHS.originValidator,
    PATHS.clusterValidator,
    PATHS.labelValidator,
    PATHS.evaluator,
    PATHS.helper,
  ].map(fileInfo);
  const artifactStorage = {
    inventoryAndManifest: [fileInfo(PATHS.inventory), fileInfo(PATHS.manifest)],
    candidateObservations: fileInfo(PATHS.candidates),
    manualAuditSet: fileInfo(PATHS.manual),
    sourceOriginLedger: fileInfo(PATHS.origins),
    assignmentLedger: fileInfo(PATHS.assignments),
    eventClusterLedger: fileInfo(PATHS.clusters),
    elevationSensitivity: fileInfo(PATHS.sensitivity),
    adjudicationNotes: fileInfo(PATHS.notes),
    helperScripts: {
      files: helperFiles,
      totalBytes: helperFiles.reduce((sum, item) => sum + item.bytes, 0),
    },
    preservationDirectory: {
      path: inputs.preservationValidation.preservationRoot,
      fileCount: inputs.preservationValidation.verifiedFiles,
      physicalBytes: inputs.preservationValidation.physicalBytes,
      classification: "private/raw evidence — do not stage",
    },
    boundary: "Physical audit-artifact sizes are evidence only. The audit JSONL schemas are not the final production-v2 schemas.",
  };

  const candidateByteDistribution = distribution(perRetainedBPayload.map((row) => row.auditCandidateJsonlBytes));
  const candidatesPerRunDistribution = distribution(perRetainedBPayload.map((row) => row.candidateCount));
  const canonicalPayloadByteDistribution = distribution(perRetainedBPayload.map((row) => row.canonicalPayloadBytesUtf8));
  const scenario = (bytesPerRun, runs) => Math.round(bytesPerRun * runs);
  const scenarioOne = {
    label: "one persisted v2 transaction/day; audit-record-size evidence only",
    thirtyRunMonth: {
      usingObservedMeanAuditCandidateJsonlBytesPerRun: scenario(candidateByteDistribution.mean, 30),
      usingObservedMedianAuditCandidateJsonlBytesPerRun: scenario(candidateByteDistribution.median, 30),
    },
    threeHundredSixtyFiveRunYear: {
      usingObservedMeanAuditCandidateJsonlBytesPerRun: scenario(candidateByteDistribution.mean, 365),
      usingObservedMedianAuditCandidateJsonlBytesPerRun: scenario(candidateByteDistribution.median, 365),
    },
    immutableDuplicateTreatment: "No exact/canonical duplicate bytes are deducted; immutable candidate observations remain required for reproducibility.",
    limitation: "Not a production-v2 capacity prediction; final schema, compression, assignment records, indexes, backups, and retention tiers are unset.",
  };
  const scenarioTwo = {
    label: "empirically observed median within-day retained-run interval",
    intervalSample: withinDayIntervalDistribution,
    medianIntervalMilliseconds: withinDayIntervalDistribution.median,
    impliedRunsPer24HoursFormula: `86400000 / ${withinDayIntervalDistribution.median}`,
    impliedRunsPer24HoursAtObservedMedian: round(86400000 / withinDayIntervalDistribution.median),
    annualizationStatus: "not-annualized",
    reason: "Retained capture is sparse across dates and bursty within dates; extrapolating the within-day median to continuous ingestion would be misleading.",
  };

  const m = [];
  m.push({
    measurementNumber: 1,
    id: "extracted-candidate-observations",
    title: "Extracted candidate observations",
    status: "measured",
    results: {
      fidelityBCompleteReconstructableCensus: 1153,
      fidelityCSelectedOutputSupplement: 64,
      totalAuditObservationRecords: 1217,
    },
    denominator: "Separate B census and C selected-output supplement; their sum is an artifact-record total, not a complete historical population.",
    exclusions: ["Fidelity D metadata-only files do not produce candidate records."],
  });
  m.push({
    measurementNumber: 2,
    id: "unique-conservative-normalized-contents",
    title: "Unique conservative normalized contents",
    status: "measured",
    results: {
      fidelityBCensus: new Set(bCandidates.map((record) => record.normalizedContentId)).size,
      fidelityCSelectedSupplement: new Set(cCandidates.map((record) => record.normalizedContentId)).size,
      manualAuditSetAllStrata: new Set(inputs.manual.map((record) => record.normalizedContentId)).size,
      manualAuditSetFidelityB: new Set(inputs.manual.filter((record) => record.fidelityStratum === FIDELITY_B).map((record) => record.normalizedContentId)).size,
      manualAuditSetFidelityC: new Set(inputs.manual.filter((record) => record.fidelityStratum === FIDELITY_C).map((record) => record.normalizedContentId)).size,
    },
    denominator: "Unique values are reported within each named stratum; B and C are not added because content overlaps.",
    exclusions: [],
  });
  m.push({
    measurementNumber: 3,
    id: "exact-and-legacy-canonical-duplicates",
    title: "Exact / lowercase-comparison / legacy-canonical duplicates",
    status: "measured",
    results: {
      fidelityB: {
        conservativeExact: duplicateStats(bCandidates, (record) => record.content.conservativeNormalizedSha256),
        lowercaseComparison: duplicateStats(bCandidates, (record) => record.content.lowercaseComparisonSha256),
        legacyCanonical: duplicateStats(bCandidates, (record) => record.content.legacyCanonicalTextSha256),
      },
      fidelityCSelectedSupplement: {
        conservativeExact: duplicateStats(cCandidates, (record) => record.content.conservativeNormalizedSha256),
        lowercaseComparison: duplicateStats(cCandidates, (record) => record.content.lowercaseComparisonSha256),
        legacyCanonical: duplicateStats(cCandidates, (record) => record.content.legacyCanonicalTextSha256),
      },
    },
    boundary: "These are publication/content-identity comparisons, not semantic event clustering.",
  });
  m.push({
    measurementNumber: 4,
    id: "event-eligible-and-control-records",
    title: "Event-eligible and non-event/control records",
    status: "partially-measured",
    results: {
      manualObservationsAssignedToActiveEventClusters: acceptedAssignments.length,
      unresolvedAfterAdjudicationObservations: unresolvedAssignments.length,
      unmatchedControlObservations: controlCompression.inputObservations,
      controlsAssignedToEventClusters: controlCompression.assignedObservations,
      unresolvedControls: controlCompression.unresolvedObservations,
      trueNonEventCount: {
        status: "not-measurable-from-retained-evidence",
        value: null,
        reason: "The audit schema does not distinguish no discrete event, multi-incident record, and event identity unresolved.",
      },
    },
    rates: {
      assignedShareOfManualSet: proportion(acceptedAssignments.length, inputs.manual.length, {
        exclusions: [],
        unknownTreatment: "The 101 unresolved records remain in the denominator and are not relabeled non-events.",
      }),
      unresolvedShareOfManualSet: proportion(unresolvedAssignments.length, inputs.manual.length, {
        exclusions: [],
        unknownTreatment: "Unresolved is the measured outcome; it is not treated as non-event.",
      }),
    },
  });
  m.push({
    measurementNumber: 5,
    id: "unique-event-clusters",
    title: "Unique event clusters",
    status: "measured",
    results: {
      activeClusters: activeClusters.length,
      BOnly: activeClusters.filter((cluster) => composition(cluster) === "B-only").length,
      COnly: activeClusters.filter((cluster) => composition(cluster) === "C-only").length,
      mixed: activeClusters.filter((cluster) => composition(cluster) === "mixed").length,
      unresolvedObservations: unresolvedAssignments.length,
    },
    denominator: "123 active clusters produced only from 327 accepted manual-set assignments.",
  });
  m.push({
    measurementNumber: 6,
    id: "candidate-observation-to-event-cluster-compression",
    title: "Candidate-observation to event-cluster compression",
    status: "measured",
    results: {
      assignedManualObservations: acceptedAssignments.length,
      representedActiveClusters: activeClusters.length,
      assignedObservationsPerCluster: round(acceptedAssignments.length / activeClusters.length),
      compressedObservationExcess: acceptedAssignments.length - activeClusters.length,
      compressionReductionShare: proportion(acceptedAssignments.length - activeClusters.length, acceptedAssignments.length, {
        exclusions: ["101 unresolved manual observations"],
        unknownTreatment: "Unresolved observations are excluded, not forced into clusters.",
      }),
      reproducedLegacySelected: legacyCompression,
    },
    boundary: "No semantic compression is extrapolated to the unassigned remainder of the 1,153-record B census.",
  });
  m.push({
    measurementNumber: 7,
    id: "unique-content-to-event-cluster-compression",
    title: "Unique-content to event-cluster compression",
    status: "measured",
    results: {
      assignedUniqueNormalizedContents: assignedNormalizedToClusters.size,
      representedActiveClusters: activeClusters.length,
      uniqueContentsPerCluster: round(assignedNormalizedToClusters.size / activeClusters.length),
      compressedUniqueContentExcess: assignedNormalizedToClusters.size - activeClusters.length,
      compressionReductionShare: proportion(assignedNormalizedToClusters.size - activeClusters.length, assignedNormalizedToClusters.size, {
        exclusions: ["20 unresolved normalized contents"],
        unknownTreatment: "Unresolved contents are excluded rather than assigned.",
      }),
    },
  });
  m.push({
    measurementNumber: 8,
    id: "reporting-source-versus-source-origin",
    title: "Reporting-source count versus source-origin count",
    status: "measured",
    results: {
      reportingSources: new Set(inputs.origins.map((record) => record.reportingSourceId.value)).size,
      distinctAssessedSpecificOrigins: originCounts.size,
      assessedOriginObservations,
      unknownOriginObservations: inputs.origins.length - assessedOriginObservations,
      distinctAssessedIndependenceGroups: independenceCounts.size,
      unresolvedProvenanceSingletonObservations: inputs.origins.length - assessedIndependenceObservations,
    },
    boundary: "Source origin and independence group remain distinct entities.",
  });
  m.push({
    measurementNumber: 9,
    id: "origin-concentration",
    title: "Top-origin share and reporting-origin concentration",
    status: "measured",
    results: {
      largestAssessedOrigin: { sourceOriginId: topOrigin[0], observationCount: topOrigin[1] },
      topOriginShare: proportion(topOrigin[1], assessedOriginObservations, {
        exclusions: [`${inputs.origins.length - assessedOriginObservations} unknown-origin observations`],
        unknownTreatment: "Unknown origins are excluded, not converted into fake distinct origins.",
      }),
      assessedOriginHhi: round(originHhi, 9),
      optionalIndependenceGroupDiagnostic: {
        largestGroupId: topIndependence[0],
        largestGroupObservationCount: topIndependence[1],
        assessedGroupObservationDenominator: assessedIndependenceObservations,
        hhi: round(independenceHhi, 9),
        unknownSingletonExclusions: inputs.origins.length - assessedIndependenceObservations,
      },
    },
  });
  m.push({
    measurementNumber: 10,
    id: "source-derivation-correction-conflict-shares",
    title: "Syndicated / official / unknown / corrected / retracted / conflicting shares",
    status: "partially-measured",
    results: {
      derivationSyndicates: proportion(inputs.origins.filter((record) => wrapperValue(record.derivation) === "syndicates").length, inputs.origins.length, {
        unknownTreatment: "The 87 unknown derivations remain in the denominator and are not treated as non-syndicated.",
      }),
      derivationReposts: proportion(inputs.origins.filter((record) => wrapperValue(record.derivation) === "reposts").length, inputs.origins.length, {
        unknownTreatment: "The 87 unknown derivations remain in the denominator and are not treated as non-reposts.",
      }),
      multiObservationSyndicationFamilyMembership: proportion(observationsInMultiSyndicationFamilies, inputs.origins.length, {
        unknownTreatment: "The 57 observations outside assessed multi-observation families remain in the denominator.",
      }),
      multiObservationSyndicationFamilies: multiObservationSyndicationFamilies.size,
      officialStatementOriginType: proportion(inputs.origins.filter((record) => wrapperValue(record.originType) === "official-statement").length, inputs.origins.length, {
        unknownTreatment: "The 87 unknown-origin observations remain in the denominator.",
      }),
      unknownOrigin: proportion(inputs.origins.filter((record) => record.sourceOriginId.status === "unknown").length, inputs.origins.length, {
        unknownTreatment: "Unknown origin is the measured numerator.",
      }),
      confirmedCorrected: proportion(0, inputs.origins.length, {
        unknownTreatment: "Correction state is unknown for all 428 observations; zero is confirmed-case count, not evidence corrections never existed.",
      }),
      confirmedRetracted: proportion(0, inputs.origins.length, {
        unknownTreatment: "Correction state is unknown for all 428 observations; zero is confirmed-case count, not evidence retractions never existed.",
      }),
      provenanceConflict: {
        observationRows: proportion(conflictObservationRows.length, inputs.origins.length, {
          unknownTreatment: "Conflict evidence was reviewed; two rows form one retained conflict case.",
        }),
        distinctCases: new Set(conflictObservationRows.map((record) => record.normalizedContentId)).size,
      },
      correctionStateAssessment: { assessed: 0, unknown: inputs.origins.length },
    },
  });
  m.push({
    measurementNumber: 11,
    id: "parent-series-distribution",
    title: "Parent-series cluster/event distribution",
    status: "measured",
    results: {
      assessedParentSeries: parentSeries.length,
      clustersWithAssessedParent: activeClusters.filter((cluster) => cluster.parentSeriesId.status === "assessed").length,
      standaloneClusters: activeClusters.filter((cluster) => cluster.parentSeriesId.status === "not-applicable").length,
      unknownParentRelationships: activeClusters.filter((cluster) => cluster.parentSeriesId.status === "unknown").length,
      childrenPerParent: distribution(parentSeries.map((record) => record.childEventClusterIds.length)),
      largestParent,
      largestParentShareOfActiveClusters: proportion(largestParent.childClusterCount, activeClusters.length, {
        unknownTreatment: "All active clusters remain in the denominator, including unknown/standalone parent relationships.",
        fidelityStratum: "manual-assigned-active-clusters",
      }),
      eventTypeDistributionWithinParents: parentTypeDistribution,
    },
    boundary: "Parent series are navigation/organization structures and do not count or score as event clusters.",
  });
  m.push({
    measurementNumber: 12,
    id: "event-type-distribution",
    title: "Event-type distribution and unknown rate",
    status: "measured",
    results: {
      overall: eventTypesOverall,
      unknownRate: proportion(eventTypesOverall.unknown, activeClusters.length, {
        unknownTreatment: "Unknown event type is included as an explicit numerator category.",
        fidelityStratum: "manual-assigned-active-clusters",
      }),
      byComposition: eventTypesByComposition,
      reproducedLegacyRepresentedClusters: {
        representedClusters: legacyClusterIds.size,
        distribution: counts([...legacyClusterIds].map((id) => {
          const wrapper = assessmentByCluster.get(id).eventType;
          return wrapper.status === "assessed" ? wrapper.value : "unknown";
        }), [
          "armed-conflict-action",
          "policy-restriction-action",
          "energy-system-event",
          "financial-distress-event",
          "production-logistics-event",
          "unknown",
        ]),
      },
    },
  });
  m.push({
    measurementNumber: 13,
    id: "action-stage-distribution",
    title: "Action-stage distribution and assessment-status distribution",
    status: "measured",
    results: {
      overall: actionStageOverall,
      byComposition: actionStageByComposition,
      assessmentStatus: {
        assessed: assessments.filter((record) => record.actionStage.status === "assessed").length,
        unknown: assessments.filter((record) => record.actionStage.status === "unknown").length,
      },
    },
    boundary: "Step-F action stage is the final/furthest directly evidenced stage, not a complete stage-transition history.",
  });
  m.push({
    measurementNumber: 14,
    id: "mechanism-directness-distribution",
    title: "Mechanism distribution and direct/contextual/none share",
    status: "measured",
    results: {
      byMechanism: mechanismDistribution,
      directMechanismCountPerCluster: counts(directCounts.map(String), ["0", "1", "2", "3"]),
    },
    boundary: "Direct mechanisms are evidence assessments, not signal elevations.",
  });
  m.push({
    measurementNumber: 15,
    id: "direct-channel-opportunity-counts",
    title: "Zero-, one-, and multi-channel mechanism counts",
    status: "measured",
    results: {
      zeroDirect: directCounts.filter((value) => value === 0).length,
      exactlyOneDirect: directCounts.filter((value) => value === 1).length,
      moreThanOneDirect: directCounts.filter((value) => value > 1).length,
      maximumDirectMechanisms: Math.max(...directCounts),
      directChannelDistribution,
      zeroDirectWithContextual: assessments.filter((assessment) => (
        assessment.mechanisms.every((item) => item.directness !== "direct")
          && assessment.mechanisms.some((item) => item.directness === "contextual")
      )).length,
    },
    denominator: "123 active clusters; each direct mechanism maps to one current audit channel.",
    boundary: "These are direct mechanism/channel opportunities, not elevations.",
  });
  m.push({
    measurementNumber: 16,
    id: "independent-source-count-distribution",
    title: "Independent-source-count distribution",
    status: "partially-measured",
    results: {
      exactCountStatus: {
        assessed: assessments.filter((record) => record.independentSourceCount.status === "assessed").length,
        unknown: assessments.filter((record) => record.independentSourceCount.status === "unknown").length,
      },
      exactAssessedDistribution: exactIndependentDistribution,
      assessedLowerBoundDistribution: lowerBoundDistribution,
    },
    boundary: "Lower bounds are reported separately and are not relabeled exact counts.",
  });
  m.push({
    measurementNumber: 17,
    id: "corroboration-distribution",
    title: "Corroboration distribution",
    status: "measured",
    results: {
      overall: corroborationOverall,
      byComposition: corroborationByComposition,
    },
    denominator: "123 active clusters; unknown-origin is an explicit assessed corroboration category.",
  });
  m.push({
    measurementNumber: 18,
    id: "lifecycle-distribution",
    title: "Lifecycle distribution",
    status: "partially-measured",
    results: {
      clusterLevel: clusterLifecycle,
      observationLevel: observationLifecycle,
      clockAssessmentStatus: {
        firstSeen: counts(assessments.map((record) => record.auditFirstSeen.status)),
        lastObservedAt: counts(assessments.map((record) => record.auditLastObservedAt.status)),
        lastMaterialChangeAt: counts(assessments.map((record) => record.auditLastMaterialChangeAt.status)),
      },
      postInitialEscalatingTransitions: observationLifecycle.escalating,
      postInitialDeEscalatingTransitions: observationLifecycle["de-escalating"],
    },
    limitation: "No post-initial escalating or de-escalating transition was observed; fidelity-C chronology remains unknown.",
  });
  m.push({
    measurementNumber: 19,
    id: "repeated-observations-without-material-change",
    title: "Repeated observations updating lastObservedAt but not lastMaterialChangeAt",
    status: "measured",
    results: {
      repeatedAcceptedObservations: repeatedWithoutMaterialChange.length,
      shareOfAcceptedObservations: proportion(repeatedWithoutMaterialChange.length, observationLifecycleRows.length, {
        exclusions: [],
        unknownTreatment: "51 lifecycle-unknown accepted observations remain in the denominator and are not counted as repeated-without-change.",
      }),
      affectedClusters: new Set(repeatedWithoutMaterialChange.map((row) => row.eventClusterId)).size,
      initialMaterialClockInitializations: observationLifecycleRows.filter((row) => row.lifecycle.status === "assessed" && row.lifecycle.value === "new").length,
      postInitialMaterialClockAdvances: observationLifecycleRows.filter((row) => (
        row.lifecycle.status === "assessed" && ["escalating", "de-escalating"].includes(row.lifecycle.value)
      )).length,
    },
    boundary: "Initial material-clock initialization is separate from post-initial material change.",
  });
  m.push({
    measurementNumber: 20,
    id: "candidate-elevation-frequency",
    title: "Elevation frequency by channel under every candidate rule",
    status: "measured",
    results: {
      evaluationCoverage: inputs.sensitivity.evaluationCoverage,
      candidateA,
      candidateB,
      candidateCStructuralRanking: candidateC,
      candidateCLeaderChangeDiagnostics: {
        runChannelCellsEvaluated: inputs.sensitivity.candidateC.leaderChangeDiagnostics.runChannelCellsEvaluated,
        cellsWithNoLeaderInAnyVariant: inputs.sensitivity.candidateC.leaderChangeDiagnostics.cellsWithNoLeaderInAnyVariant,
        cellsWithExactlyOneDistinctLeader: inputs.sensitivity.candidateC.leaderChangeDiagnostics.cellsWithExactlyOneDistinctLeader,
        cellsWithMultipleDistinctLeaders: inputs.sensitivity.candidateC.leaderChangeDiagnostics.cellsWithMultipleDistinctLeaders,
        totalAdjacentVariantLeaderChangesIncludingNull: inputs.sensitivity.candidateC.leaderChangeDiagnostics.totalAdjacentVariantLeaderChangesIncludingNull,
        totalAdjacentVariantNonNullLeaderChanges: inputs.sensitivity.candidateC.leaderChangeDiagnostics.totalAdjacentVariantNonNullLeaderChanges,
      },
    },
    denominator: "295 point-in-time direct cluster/run/channel opportunities across 28 retained B payload identities; C-only chronology excluded.",
  });
  m.push({
    measurementNumber: 21,
    id: "candidate-rule-differences",
    title: "Differences between structural, scalar, and combined candidates",
    status: "measured",
    results: {
      matchedStructuralScalar: crossCandidate.pairedStructuralScalar.map((row) => ({
        structuralCandidateId: row.structuralCandidateId,
        scalarCandidateId: row.scalarCandidateId,
        qualifyingUnderAOnly: row.qualifyingUnderAOnly.length,
        qualifyingUnderBOnly: row.qualifyingUnderBOnly.length,
        qualifyingUnderBoth: row.qualifyingUnderBoth.length,
        qualifyingUnderNeither: row.qualifyingUnderNeither.length,
        rowsChangedSolelyBecauseCandidateARequiresLifecycle: row.rowsChangedSolelyBecauseCandidateARequiresLifecycle.length,
      })),
      structuralVersusCombined: {
        eligibilityDifferences: 0,
        explanation: "Candidate C eligibility is identical to Candidate A; C adds deterministic stage-based ranking only.",
      },
      evidenceVariantChanges: crossCandidate.evidenceVariantChanges.map((row) => ({
        family: row.family,
        fromCandidateId: row.fromCandidateId,
        toCandidateId: row.toCandidateId,
        addedCount: row.addedCount,
        removedCount: row.removedCount,
      })),
      stageBoundaryChanges: crossCandidate.stageBoundaryChanges.map((row) => ({
        family: row.family,
        fromCandidateId: row.fromCandidateId,
        toCandidateId: row.toCandidateId,
        addedCount: row.addedCount,
      })),
      stageOnlyScalarAddsEligibilityBeyondMatchedNoLifecycleStructuralStageVariant: false,
    },
  });
  m.push({
    measurementNumber: 22,
    id: "reproduced-legacy-selected-comparison",
    title: "Legacy selected observations collapsing into duplicate/contextual clusters",
    status: "measured",
    results: {
      status: inputs.sensitivity.legacySelectedComparison.status,
      reproducedLegacySelectedObservations: inputs.sensitivity.legacySelectedComparison.inputObservationCount,
      assignedObservations: inputs.sensitivity.legacySelectedComparison.assignedObservationCount,
      unresolvedObservations: inputs.sensitivity.legacySelectedComparison.unresolvedFromStepECount,
      representedClusters: legacyCompression.representedActiveClusters,
      pointInTimeDirectObservationChannelOccurrences: inputs.sensitivity.legacySelectedComparison.pointInTimeDirectObservationChannelOccurrences,
      uniquePointInTimeClusterRunChannelCases: inputs.sensitivity.legacySelectedComparison.uniquePointInTimeClusterRunChannelCases,
      repeatedObservationChannelOccurrencesCollapsed: inputs.sensitivity.legacySelectedComparison.repeatedSelectedObservationOccurrencesCollapsedWithinClusterRunChannel,
      distinctObservationIdsCollapsed: inputs.sensitivity.legacySelectedComparison.distinctSelectedObservationIdsCollapsedAtLeastOnceWithinClusterRunChannel,
      zeroDirectObservations: inputs.sensitivity.legacySelectedComparison.observationsBlockedForZeroDirectMechanism,
      zeroDirectClusters: 14,
      contextualOnlyClusters: 13,
      allNoneClusters: 1,
      pointInTimeDirectEvidenceTimingCensoredObservations: inputs.sensitivity.legacySelectedComparison.observationsWhoseFinalDirectMechanismWasNotYetEvidenced,
      candidateAResults: inputs.sensitivity.legacySelectedComparison.candidateAResults.map(compactObservationCandidateResult),
      candidateBResults: inputs.sensitivity.legacySelectedComparison.candidateBResults.map(compactObservationCandidateResult),
    },
    boundary: "This reproduces the current frozen legacy script on retained payloads; it is not claimed as exact historical legacy output.",
  });
  m.push({
    measurementNumber: 23,
    id: "unmatched-controls-with-direct-mechanisms",
    title: "Unmatched controls carrying direct mechanisms",
    status: "measured",
    results: {
      inputObservations: inputs.sensitivity.unmatchedControlComparison.inputObservationCount,
      assignedObservations: inputs.sensitivity.unmatchedControlComparison.assignedObservationCount,
      unresolvedObservations: inputs.sensitivity.unmatchedControlComparison.unresolvedFromStepECount,
      representedClusters: controlCompression.representedActiveClusters,
      assignedWithPointInTimeDirectMechanism: inputs.sensitivity.unmatchedControlComparison.assignedWithPointInTimeDirectMechanism,
      representedDirectClusters: 7,
      strictAE1S1QualifyingObservations: inputs.sensitivity.unmatchedControlComparison.observationsQualifyingStrictestAE1S1,
      strictAE1S1QualifyingClusters: inputs.sensitivity.unmatchedControlComparison.distinctClustersQualifyingStrictestAE1S1,
      AE1S2QualifyingObservations: inputs.sensitivity.unmatchedControlComparison.observationsQualifyingAE1S2,
      AE1S2QualifyingClusters: inputs.sensitivity.unmatchedControlComparison.distinctClustersQualifyingAE1S2,
      candidateAResults: inputs.sensitivity.unmatchedControlComparison.candidateAResults.map(compactObservationCandidateResult),
      candidateBResults: inputs.sensitivity.unmatchedControlComparison.candidateBResults.map(compactObservationCandidateResult),
    },
    limitation: "The deterministic controls are enrichment controls, not a population sample; these counts are not a false-negative estimate.",
  });
  m.push({
    measurementNumber: 24,
    id: "cluster-assignment-ambiguity",
    title: "Cluster assignment ambiguity, corrections, merge/split, and adjudication",
    status: "measured",
    results: {
      initialNeedsAdjudicationProposalRecords: initialNeeds.length,
      initialNeedsAdjudicationNormalizedContents: new Set(initialNeeds.map((record) => record.normalizedContentId)).size,
      groupedAdjudicationCases: 35,
      acceptedCurrentAssignments: acceptedAssignments.length,
      unresolvedCurrentAssignments: unresolvedAssignments.length,
      supersededProposalRecords: inputs.assignments.filter((record) => record.supersedesAssignmentId.status === "assessed").length,
      appendOnlyLedgerRecords: inputs.assignments.length,
      acceptedAssignmentMethods: acceptedMethodCounts,
      methodRatesOfAcceptedAssignments: Object.fromEntries(Object.entries(acceptedMethodCounts).map(([method, count]) => [
        method,
        proportion(count, acceptedAssignments.length, {
          exclusions: [`${unresolvedAssignments.length} unresolved assignments`],
          unknownTreatment: "Only accepted assignments are in the method-rate denominator.",
        }),
      ])),
      tieBreakAssignments: 0,
      tieBreakRate: proportion(0, acceptedAssignments.length, {
        exclusions: [`${unresolvedAssignments.length} unresolved assignments`],
        unknownTreatment: "Substantively ambiguous cases were adjudicated or left unresolved; lexical tie-break was not used.",
      }),
      merges: 0,
      splits: 0,
      unresolvedRate: proportion(unresolvedAssignments.length, inputs.manual.length, {
        exclusions: [],
        unknownTreatment: "Unresolved is the measured numerator and remains explicit.",
      }),
      multiIncidentUnresolvedCaseGroups: 5,
    },
  });
  m.push({
    measurementNumber: 25,
    id: "recurring-content-cluster-stability",
    title: "Cluster identity stability for normalized content recurring across runs",
    status: "partially-measured",
    results: {
      fullBCensusNormalizedContentIdsInMoreThanOneRetainedRun: recurringFullBNormalized.size,
      recurringIdsCoveredByManualAssignments: recurringManualB.length,
      recurringIdsOutsideManualSemanticAssignmentCoverage: recurringFullBNormalized.size - recurringManualB.length,
      coveredIdsWhoseAcceptedOccurrencesResolveToOneCluster: recurringStable,
      coveredIdsSplitAcrossActiveClusters: recurringSplit,
      coveredIdsWithUnresolvedOccurrences: recurringWithUnresolved,
      coveredIdsWithNoAcceptedOccurrences: recurringWithNoAccepted,
      activeClustersInMoreThanOneRetainedBRun: activeClusters.filter((cluster) => cluster.distinctRetainedBRuns.length > 1).length,
      activeClustersOnMoreThanOneSupportedUtcObservationDate: activeClusters.filter((cluster) => cluster.distinctSupportedUtcObservationDates.length > 1).length,
      maximumDistinctRetainedBRunsPerCluster: Math.max(...activeClusters.map((cluster) => cluster.distinctRetainedBRuns.length)),
      maximumDistinctSupportedDatesPerCluster: Math.max(...activeClusters.map((cluster) => cluster.distinctSupportedUtcObservationDates.length)),
    },
    limitation: "Only the deterministic 428-observation manual set has semantic assignments; 43 recurring full-B contents are outside that coverage.",
  });
  m.push({
    measurementNumber: 26,
    id: "storage-growth",
    title: "Bytes per run, candidates per run, duplicate rate, and projected storage growth",
    status: "partially-measured",
    results: {
      perRetainedBPayload,
      distributions: {
        canonicalSerializedPayloadBytesPerRun: canonicalPayloadByteDistribution,
        auditCandidateJsonlBytesPerRun: candidateByteDistribution,
        candidatesPerRun: candidatesPerRunDistribution,
      },
      otherAuditArtifactStorage: artifactStorage,
      projectionScenarios: {
        scenarioOne,
        scenarioTwo,
        genericFormula: "projectedBytes = observedMeanOrMedianBytesPerRun * persistedRunsPerDay * periodDays",
      },
      assignmentStorageProjection: {
        status: "not-measurable-from-retained-evidence",
        observedAuditAssignmentLedgerBytes: artifactStorage.assignmentLedger.bytes,
        reason: "The manual audit assignment ledger is enriched, append-only, and not a complete per-run production assignment schema or cadence sample.",
      },
    },
    boundary: "Storage evidence informs Session 17 backend/tiering review; it is not a capacity guarantee and freezes no ingestion cadence or backend.",
  });

  invariant(m.length === 26, "all 26 protocol measurements must be present");
  invariant(m.every((row, index) => row.measurementNumber === index + 1), "measurement numbering is not contiguous");

  const recommendations = [
    ["Candidate disposition / non-event representation", "101/428 unresolved; schema conflates no discrete event, multi-incident, and identity-unresolved.", "recommend-for-session17-review", "Add an explicit candidate-disposition concept before production schema freeze.", "High confidence in the gap; exact disposition counts are unavailable.", "required-for-2.0"],
    ["Five-leaf event vocabulary", "20/123 active clusters (16.260163%) have unknown event type; zero financial-distress clusters occurred.", "recommend-for-session17-review", "Amend/review before freeze; preserve typed unknown and do not adopt the full ontology without further evidence.", "Manual set is enriched and not a population prevalence sample.", "required-for-2.0"],
    ["Deterministic versus assisted clustering", "184/327 accepted assignments used exact content, 8 used explicit identifiers, 135 used manual identity tuples; 101/428 remained unresolved.", "architecture-supported", "Use deterministic high-confidence paths plus a persisted assisted/human adjudication path for ambiguous cases.", "Strong within the manual set; production error rates remain unmeasured.", "required-for-2.0"],
    ["Source-origin / independence schema", "341/428 origins assessed; 121 origins and 138 independence groups remain distinct.", "architecture-supported", "Freeze origin and independence as separate wrapped fields with conservative unknown handling.", "B resolution is stronger than C; provenance remains incomplete.", "required-for-2.0"],
    ["Correction-state wrapper", "All 428 correction states remain unknown; zero confirmed corrected/retracted cases.", "insufficient-evidence", "Keep a required correction-state wrapper and collect prospective evidence; do not infer original state.", "No calibration of correction prevalence is possible.", "required-for-2.0"],
    ["Independent-source lower bound", "Exact count assessed for 102/123 clusters; lower bound assessed for all 123.", "architecture-supported", "Persist exact count and conservative lower bound separately.", "21 clusters lack an exact count.", "required-for-2.0"],
    ["Directness gate", "24/123 clusters have zero direct mechanisms; 21 of those have contextual mechanisms.", "architecture-supported", "Retain per-mechanism directness and require Session 17 to decide the production qualifying directness rule.", "Directness is fully assessed in this sample; elevation impact is candidate-dependent.", "required-for-2.0"],
    ["Evidence sufficiency", "E1 yields only 2–4 A rows and 4–8 B rows; E3 adds 4–5 A and 30–32 B rows beyond E2.", "recommend-for-session17-review", "Prioritize E2-family review; test whether E3's unresolved-provenance complexity is justified.", "Candidate sensitivity is complete for retained B chronology, not representative history.", "required-for-2.0"],
    ["Action-stage boundary", "S1→S2 adds 42 A and 106 B rows under E2/E3; S2→S3 adds 9 A and 16 B.", "recommend-for-session17-review", "Treat implemented-versus-impact as the major discontinuity and decide announced-stage inclusion explicitly.", "Final/furthest stage is known; full transition histories are not.", "required-for-2.0"],
    ["Structural versus scalar rule", "Matched B equals A without lifecycle; A-only rows are zero in all 15 matched comparisons.", "architecture-supported", "Prefer structural eligibility review over a stage-only scalar gate; do not freeze a production rule in Session 15.", "A scalar with additional empirically justified components was not evaluated.", "required-for-2.0"],
    ["Candidate-C ranking", "Eligibility matches A; 2,100 run/channel/variant rankings produce one adjacent non-null leader change and bounded tie diagnostics.", "architecture-supported", "Use transparent ranking after a structural gate as the leading family for Session 17 review; freeze tie display semantics.", "Ranking uses stage only and does not prove market relevance.", "required-for-2.0"],
    ["Lifecycle semantics", "184 accepted repeats advanced lastObservedAt without material change; zero post-initial material transitions.", "architecture-supported", "Keep new/escalating/continuing/de-escalating and the material-change clock distinction.", "Transition calibration is absent despite strong repetition evidence.", "required-for-2.0"],
    ["Decay function / rate", "No post-initial material transitions; maximum assessable first-to-last interval is 172,133,333 ms.", "insufficient-evidence", "Do not select a numeric decay function/rate; collect prospective material transitions.", "No empirical calibration is possible.", "required-for-2.0"],
    ["Stale-event rule", "The retained sample contains recurrence intervals but no calibrated material-change expiry behavior.", "insufficient-evidence", "Leave stale threshold unset for Session 17 unless prospective evidence is added.", "Silence and repeated coverage cannot establish staleness.", "required-for-2.0"],
    ["De-escalation contribution / expiry", "Zero post-initial de-escalating observations were retained.", "insufficient-evidence", "Preserve representation but do not choose numeric contribution or expiry.", "No observed cases.", "required-for-2.0"],
    ["Point-in-time stage history", "Direct/stage timing-censor counts are zero only because Step-F references final cluster evidence broadly.", "recommend-for-session17-review", "Persist stage transitions prospectively; do not interpret zero censoring as complete history.", "Earlier lower stages are unreconstructable.", "required-for-2.0"],
    ["Point-in-time conflict / corroboration history", "Naive final-state projection changes 113 variant-row memberships across 26 variants and 10 rows.", "recommend-for-session17-review", "Persist point-in-time evidence/conflict state for deterministic no-look-ahead scoring.", "Measured on retained B chronology only.", "required-for-2.0"],
    ["Mixed / C-only chronology", "31 C-only clusters and 46 C observations are excluded; 2 mixed clusters ignore 2 C observations for chronology.", "recommend-for-session17-review", "Keep C chronology excluded and collect prospective complete timestamps rather than infer order.", "Historical C chronology is unavailable.", "required-for-2.0"],
    ["Parent-series shape", "7 parents cover 99 clusters; largest has 43/123 children; 18 standalone and 6 unknown relationships.", "architecture-supported", "Retain one optional parent for 2.0; review nested/multiple parents only if necessary.", "One enriched manual sample cannot establish a general hierarchy shape.", "deferable-to-2.1"],
    ["One-candidate/one-cluster versus multi-incident decomposition", "Five unresolved grouped cases explicitly combine multiple incidents.", "recommend-for-session17-review", "Decide atomic ingestion decomposition versus multiple candidate-to-cluster edges.", "Counts are lower bounds from the reviewed sample.", "required-for-2.0"],
    ["Storage backend / tiering", "Observed audit candidate records average the measured bytes/run; one-run/day projections are recorded without production-schema claims.", "recommend-for-session17-review", "Treat immutable retention as operationally plausible at this scale, then choose access-controlled backend/tiering after source-term review.", "Final schema, indexes, backups, and cadence remain unset.", "required-for-2.0"],
    ["Raw-candidate retention", "B evidence shows 72.333044% exact duplicate excess, but immutable observations are required for reproduction.", "architecture-supported", "Retain candidate observations/hashes; do not discard duplicates solely for capacity savings.", "Redistribution rights are not established.", "required-for-2.0"],
    ["Public/private artifact boundary", "Raw-text-bearing artifacts and preservation copies contain source payloads; aggregate metrics/report contain no raw candidate text.", "architecture-supported", "Track hashes/aggregates only after review; keep raw evidence access-controlled and unstaged.", "Source terms were not researched or inferred.", "required-for-2.0"],
    ["Canonical ordering / hashing", "28 payload hashes at 27 timestamps include one equal-timestamp/two-hash conflict; byte identity depends on canonical ordering.", "recommend-for-session17-review", "Freeze canonical JSON standard, array ordering, same-timestamp identity handling, and self-hash envelope rules.", "Audit procedures are deterministic but not yet the production standard.", "required-for-2.0"],
  ].map(([parameterOrQuestion, session15Evidence, recommendationStatus, recommendedActionForSession17, confidenceOrLimitation, delivery]) => ({
    parameterOrQuestion,
    session15Evidence,
    recommendationStatus,
    recommendedActionForSession17,
    confidenceOrLimitation,
    delivery,
  }));

  const privacyClassification = [
    [PATHS.inventory, "needs explicit source-term/privacy review before tracking", "Contains detailed local evidence inventory and machine-specific provenance, but no candidate raw-text field."],
    [PATHS.manifest, "sanitized/aggregate candidate for tracking", "Hashes, fidelity boundaries, and counts; no raw candidate text."],
    [PATHS.candidates, "private/raw evidence — do not stage", "Contains retained raw candidate text and source payload references."],
    [PATHS.manual, "needs explicit source-term/privacy review before tracking", "No raw text field, but record-level links/hashes expose detailed private-evidence topology."],
    [PATHS.origins, "needs explicit source-term/privacy review before tracking", "Contains detailed source-origin evidence and reviewer reasoning."],
    [PATHS.assignments, "needs explicit source-term/privacy review before tracking", "Contains record-level identity judgments and evidence reasoning."],
    [PATHS.clusters, "needs explicit source-term/privacy review before tracking", "Contains detailed event summaries, evidence links, and assessment reasoning."],
    [PATHS.sensitivity, "sanitized/aggregate candidate for tracking", "Contains IDs and aggregate sensitivity results but no raw candidate text or full private URLs."],
    [PATHS.notes, "needs explicit source-term/privacy review before tracking", "Contains detailed adjudication narratives derived from private evidence."],
    [PATHS.missingTimeDecision, "sanitized/aggregate candidate for tracking", "Methodological decision record without raw candidate text."],
    [PATHS.extractor, "code/helper candidate for tracking", "Audit-only extraction code; no embedded raw candidate corpus."],
    [PATHS.selector, "code/helper candidate for tracking", "Deterministic selection code; no raw candidate corpus."],
    [PATHS.originValidator, "needs explicit source-term/privacy review before tracking", "Code contains curated record-level origin decisions and source-specific reasoning."],
    [PATHS.clusterValidator, "needs explicit source-term/privacy review before tracking", "Code contains curated record-level cluster decisions and summaries."],
    [PATHS.labelValidator, "needs explicit source-term/privacy review before tracking", "Code contains curated cluster-level semantic decisions."],
    [PATHS.evaluator, "code/helper candidate for tracking", "Deterministic aggregate evaluation code; no raw candidate corpus."],
    [PATHS.helper, "code/helper candidate for tracking", "Deterministic aggregate finalization code; no raw candidate text."],
    [PATHS.output, "sanitized/aggregate candidate for tracking", "Aggregate metrics only; generator validates absence of raw text and full URLs."],
    ["audit/session15/signal-audit-report.md", "sanitized/aggregate candidate for tracking", "Reviewer-authored aggregate report; must pass no-raw-text/no-full-URL checks."],
    [inputs.preservationValidation.preservationRoot, "private/raw evidence — do not stage", "Byte-for-byte copies of ignored raw retained inputs."],
  ].map(([artifact, classification, rationale]) => ({ artifact, classification, rationale }));

  const measuredCount = m.filter((row) => row.status === "measured").length;
  const partialCount = m.filter((row) => row.status === "partially-measured").length;
  const metrics = {
    recordType: "session15-consolidated-signal-audit-metrics",
    schemaVersion: "crucix-session15-final-metrics/v1",
    auditSession: 15,
    checkpoint: "Final completion gate — consolidated metrics and signal audit report",
    auditStatus: "complete-with-explicit-limitations",
    methodologySelectionStatus: "not-selected",
    creationMetadata: {
      deterministic: true,
      volatileGenerationTimestampIncluded: false,
      rule: "Canonical metrics exclude the execution timestamp so identical frozen inputs and helper bytes regenerate byte-identical output.",
      generatorPath: PATHS.helper,
      generatorSha256: inputs.physical.helperSha256,
      governingFinalWorkOrderSha256: EXPECTED.finalWorkOrderSha256,
    },
    auditScope: {
      purpose: "Aggregate and interpret persisted Session 15 signal evidence only.",
      productionBehaviorImplemented: false,
      finalSignalRuleSelected: false,
      scalarScoreSelected: false,
      decayFunctionOrRateSelected: false,
      staleEventThresholdSelected: false,
      evidenceOrStageThresholdSelected: false,
      marketEvidenceIncluded: false,
      webOrLaterEvidenceUsed: false,
    },
    inputHashes: {
      governingDocuments: {
        [PATHS.projectLog]: inputs.physical.projectLogSha256,
        [PATHS.protocol]: inputs.physical.protocolSha256,
        [PATHS.architecture]: inputs.physical.architectureSha256,
        [PATHS.coreSchema]: inputs.physical.coreSchemaSha256,
        [PATHS.parameterRegister]: inputs.physical.parameterRegisterSha256,
      },
      session15InputArtifacts: {
        [PATHS.inventory]: inputs.physical.inventorySha256,
        [PATHS.manifest]: inputs.physical.manifestPhysicalSha256,
        inputManifestCanonicalSelfHash: inputs.manifestSelfHash,
        [PATHS.candidates]: inputs.physical.candidatesSha256,
        [PATHS.manual]: inputs.physical.manualSha256,
        [PATHS.origins]: inputs.physical.originsSha256,
        [PATHS.assignments]: inputs.physical.assignmentsSha256,
        [PATHS.clusters]: inputs.physical.clustersSha256,
        [PATHS.sensitivity]: inputs.physical.sensitivitySha256,
        [PATHS.notes]: inputs.physical.notesSha256,
        [PATHS.missingTimeDecision]: inputs.physical.missingTimeDecisionSha256,
      },
      session15Helpers: {
        [PATHS.extractor]: inputs.physical.extractorSha256,
        [PATHS.selector]: inputs.physical.selectorSha256,
        [PATHS.originValidator]: inputs.physical.originValidatorSha256,
        [PATHS.clusterValidator]: inputs.physical.clusterValidatorSha256,
        [PATHS.labelValidator]: inputs.physical.labelValidatorSha256,
        [PATHS.evaluator]: inputs.physical.evaluatorSha256,
        [PATHS.helper]: inputs.physical.helperSha256,
      },
      recordedHashBoundaries: {
        stepEEventClusterLedgerPrefix: {
          bytes: EXPECTED.stepEClusterPrefixBytes,
          sha256: EXPECTED.stepEClusterPrefixSha256,
        },
        stepFEventAssessmentSuffix: { sha256: EXPECTED.stepFClusterSuffixSha256 },
        preStepGAdjudicationNotesPrefix: {
          bytes: EXPECTED.preStepGNotesBytes,
          sha256: EXPECTED.preStepGNotesSha256,
        },
      },
      frozenSourceVerification: inputs.frozenSourceValidation,
      preservationVerification: inputs.preservationValidation,
      gitHeadAtFreeze: EXPECTED.gitHeadAtFreeze,
    },
    fidelityStrata: inputs.manifest.selectionStrata,
    denominatorDefinitions: {
      fidelityBCensus: "1,153 records reconstructed from 28 retained payload identities; complete only for the frozen current legacy extractor over those payloads.",
      fidelityCSelectedSupplement: "64 selected-output observations; never a complete candidate denominator and chronology-ineligible.",
      manualAuditSet: "428 deterministically selected observations: 364 B and 64 C.",
      acceptedManualAssignments: "327 manual observations with current accepted event-cluster assignment.",
      activeClusters: "123 active clusters represented by accepted manual assignments.",
      stepGOpportunity: "295 point-in-time B cluster/run/channel direct-mechanism opportunities across 28 retained payload identities.",
      assessedOrigins: "341 manual observations whose specific source origin was assessed; 87 unknown origins excluded from origin-share/HHI denominators.",
    },
    exclusions: [
      "No fidelity-A canonical historical candidate archive existed.",
      "Fidelity C is selected-output-only and excluded from complete-run and chronological Step-G denominators.",
      "101 unresolved manual observations are not forced into event clusters or relabeled non-events.",
      "31 C-only clusters and C observations in mixed clusters are excluded from retained-B point-in-time evaluation.",
      "No web, later evidence, production behavior, or market evidence enters these metrics.",
    ],
    requiredMeasurements: m,
    synthesis: {
      geopoliticalConcentration: {
        armedConflictActionShareOfActiveClusters: proportion(eventTypesOverall["armed-conflict-action"], activeClusters.length, {
          unknownTreatment: "20 unknown-type clusters remain in the denominator.",
          fidelityStratum: "manual-assigned-active-clusters",
        }),
        largestParentShareOfActiveClusters: proportion(largestParent.childClusterCount, activeClusters.length, {
          unknownTreatment: "Standalone and unknown-parent clusters remain in the denominator.",
          fidelityStratum: "manual-assigned-active-clusters",
        }),
        topOriginShare: proportion(topOrigin[1], assessedOriginObservations, {
          exclusions: [`${inputs.origins.length - assessedOriginObservations} unknown-origin observations`],
          unknownTreatment: "Unknown origins excluded, not fabricated.",
        }),
        assessedOriginHhi: round(originHhi, 9),
        finding: "Armed-conflict material remains materially concentrated after content duplication and event clustering. High publication duplication is real, but low top-origin share and the 78/123 cluster-level conflict count do not support attributing the remaining concentration primarily to one duplicated origin.",
      },
      taxonomy: {
        unknownEventTypeRate: proportion(eventTypesOverall.unknown, activeClusters.length, {
          unknownTreatment: "Unknown is included as the numerator category.",
          fidelityStratum: "manual-assigned-active-clusters",
        }),
        financialDistressClusters: eventTypesOverall["financial-distress-event"],
        recommendation: "Do not freeze the five-leaf vocabulary unchanged. Review/amend the minimal enum and add candidate disposition before freeze; defer a broad replacement ontology to 2.1.",
      },
      clusteringMethod: {
        deterministicHighConfidenceAccepted: acceptedMethodCounts["exact-normalized-content"] + acceptedMethodCounts["explicit-incident-or-source-identifier"],
        manualIdentityTupleAccepted: acceptedMethodCounts["manual-identity-tuple"],
        unresolved: unresolvedAssignments.length,
        recommendation: "Deterministic high-confidence path plus persisted assisted/human adjudication for ambiguous cases.",
      },
      sourceOrigin: {
        fidelityBResolution: proportion(
          inputs.origins.filter((record) => record.fidelityStratum === FIDELITY_B && record.sourceOriginId.status === "assessed").length,
          inputs.origins.filter((record) => record.fidelityStratum === FIDELITY_B).length,
          { unknownTreatment: "Unknown B origins remain in the denominator.", fidelityStratum: FIDELITY_B },
        ),
        fidelityCResolution: proportion(
          inputs.origins.filter((record) => record.fidelityStratum === FIDELITY_C && record.sourceOriginId.status === "assessed").length,
          inputs.origins.filter((record) => record.fidelityStratum === FIDELITY_C).length,
          { unknownTreatment: "Unknown C origins remain in the denominator.", fidelityStratum: FIDELITY_C },
        ),
        finding: "Independence metrics are meaningful for assessed origins and cluster lower bounds, but exact counts, correction state, and fidelity-C provenance must retain unknown wrappers.",
      },
      signalElevation: {
        evaluationCoverage: inputs.sensitivity.evaluationCoverage,
        sensitivitySummary: {
          largestEvidenceClauseChange: {
            family: inputs.sensitivity.sensitivitySummary.largestObservedEvidenceClauseChange.family,
            fromCandidateId: inputs.sensitivity.sensitivitySummary.largestObservedEvidenceClauseChange.fromCandidateId,
            toCandidateId: inputs.sensitivity.sensitivitySummary.largestObservedEvidenceClauseChange.toCandidateId,
            addedCount: inputs.sensitivity.sensitivitySummary.largestObservedEvidenceClauseChange.addedCount,
            removedCount: inputs.sensitivity.sensitivitySummary.largestObservedEvidenceClauseChange.removedCount,
          },
          largestActionStageBoundaryChange: {
            family: inputs.sensitivity.sensitivitySummary.largestObservedActionStageBoundaryChange.family,
            fromCandidateId: inputs.sensitivity.sensitivitySummary.largestObservedActionStageBoundaryChange.fromCandidateId,
            toCandidateId: inputs.sensitivity.sensitivitySummary.largestObservedActionStageBoundaryChange.toCandidateId,
            addedCount: inputs.sensitivity.sensitivitySummary.largestObservedActionStageBoundaryChange.addedCount,
          },
          maximumLifecycleClauseReduction: inputs.sensitivity.sensitivitySummary.maximumLifecycleClauseReduction,
          noLookAheadCensoring: inputs.sensitivity.sensitivitySummary.noLookAheadCensoring,
        },
        finding: "Stage-only scalar scoring adds no eligibility distinction beyond matched structural stage sets without lifecycle. Structural eligibility plus transparent Candidate-C ranking is the leading family for Session 17 review; no production rule is selected.",
      },
      lifecycleAndDecay: {
        architectureClock: "lastMaterialChangeAt",
        repeatedWithoutMaterialChange: repeatedWithoutMaterialChange.length,
        postInitialMaterialTransitions: 0,
        finding: "The material-change clock is supported, but no numeric decay, stale interval, or de-escalation expiry can be calibrated.",
      },
      storageAndRetention: {
        scenarioOne,
        finding: "Immutable candidate and assignment retention appears operationally plausible at the measured audit scale, subject to final schema, cadence, source terms, access control, backups, and backend/tiering decisions.",
      },
    },
    artifactPrivacyClassification: privacyClassification,
    unresolvedLimitations: [
      "No canonical historical candidate archive existed.",
      "Only 28 B payload identities across 27 timestamps were reconstructable; one timestamp has two conflicting payload hashes.",
      "B extraction reproduces the current frozen legacy script, not necessarily each historical script revision.",
      "Fidelity C is selected-output-only, has unknown chronology, and is not a complete population.",
      "Publication and real-world event timestamps are missing for all candidate observations.",
      "Semantic event clustering covers the 428-observation manual set, not all 1,153 B candidates.",
      "The manual set is deterministic but enriched toward reproduced top-15 rows and controls, not a random prevalence sample.",
      "101 manual observations remain unresolved and cannot be classified as confirmed non-events.",
      "No post-initial material transition was observed; decay and de-escalation parameters cannot be calibrated.",
      "Step-F stage is final/furthest-stage evidence rather than complete stage-transition history.",
      "Point-in-time direct/stage censor counts of zero reflect broad final evidence references and do not prove complete histories.",
      "No market evidence, causal attribution, predictive claim, or population false-negative estimate is part of Session 15.",
    ],
    session17Recommendations: recommendations,
    completionGate: {
      requiredMeasurementsPresent: m.length,
      requiredMeasurementsExpected: 26,
      measured: measuredCount,
      partiallyMeasured: partialCount,
      notMeasurableWholeMeasurements: 0,
      submetricsExplicitlyNotMeasurable: [
        "Measurement 4 true non-event count",
        "Measurement 26 production-v2 assignment bytes/run and capacity projection",
      ],
      allFrozenInputHashesVerified: true,
      fidelityStrataSeparate: true,
      rawCandidatesFabricated: false,
      exactDuplicationAndEventClusteringSeparate: true,
      reportingSourceAndOriginSeparate: true,
      activeClustersAssessed: assessments.length,
      unresolvedObservationsExplicit: unresolvedAssignments.length,
      assignmentsAppendOnly: true,
      parentSeriesSeparateFromEventEpisodes: true,
      lifecycleFromRetainedEligibleEvidenceOnly: true,
      productionFilesChangedByHelper: false,
      methodologyProductionArtifactsCreated: false,
      parameterFrozenBySession15: false,
      completionStatus: "PASS with explicit partial measurements and limitations",
    },
  };

  const text = `${JSON.stringify(metrics, null, 2)}\n`;
  invariant(!text.includes('"selectedRule"'), "metrics must not contain selectedRule");
  invariant(!text.includes('"rawText"'), "metrics must not contain rawText fields");
  invariant(!/https?:\/\//i.test(text), "metrics must not contain full URLs");
  invariant(!/(api[_-]?key|bearer\s+[a-z0-9._-]+)/i.test(text), "metrics may contain sensitive credential material");
  return { metrics, text };
}

function validate(inputs, build) {
  const failures = [];
  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };
  check(build.metrics.requiredMeasurements.length === 26, "required measurement coverage is not 26/26");
  check(build.metrics.completionGate.activeClustersAssessed === 123, "active cluster assessment coverage changed");
  check(build.metrics.completionGate.unresolvedObservationsExplicit === 101, "unresolved observation count changed");
  check(build.metrics.inputHashes.inputManifestCanonicalSelfHash === undefined, "unexpected misplaced manifest hash");
  check(inputs.physical.clustersSha256 === EXPECTED.clustersSha256, "complete cluster ledger hash changed");
  check(inputs.physical.sensitivitySha256 === EXPECTED.sensitivitySha256, "sensitivity hash changed");
  check(!build.text.includes('"rawText"'), "rawText leaked into metrics");
  check(!/https?:\/\//i.test(build.text), "URL leaked into metrics");
  return { pass: failures.length === 0, failures };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const write = args.has("--write");
  invariant(args.size === (write ? 1 : 0), "supported usage is --write or no arguments");
  const inputs = loadInputs();
  const first = buildMetrics(inputs);
  const second = buildMetrics(inputs);
  invariant(first.text === second.text, "two in-memory final metrics builds differ");
  const validation = validate(inputs, first);
  invariant(validation.pass, `final metrics validation failed: ${validation.failures.join("; ")}`);
  const outputPath = absolute(PATHS.output);
  if (write) {
    fs.writeFileSync(outputPath, first.text, "utf8");
  } else {
    invariant(fs.existsSync(outputPath), `${PATHS.output} does not exist; use --write`);
    invariant(fs.readFileSync(outputPath, "utf8") === first.text, "existing metrics.json is not byte-identical to deterministic regeneration");
  }
  process.stdout.write(`${JSON.stringify({
    mode: write ? "write" : "validate-existing",
    deterministicByteIdentity: true,
    validation,
    helperSha256: inputs.physical.helperSha256,
    metricsSha256: sha256(Buffer.from(first.text, "utf8")),
    metricsBytes: Buffer.byteLength(first.text, "utf8"),
    requiredMeasurements: first.metrics.requiredMeasurements.length,
    measured: first.metrics.completionGate.measured,
    partiallyMeasured: first.metrics.completionGate.partiallyMeasured,
    completionStatus: first.metrics.completionGate.completionStatus,
  }, null, 2)}\n`);
}

main();
