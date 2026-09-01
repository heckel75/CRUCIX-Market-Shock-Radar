#!/usr/bin/env node

/**
 * PA-08 independent validator for the CRUCIX Methodology 2.0.0 freeze candidate.
 *
 * Independence boundary:
 * - Node built-ins only.
 * - Does not import, execute, or inspect the logic of validate-freeze.mjs.
 * - Reads the frozen Session 14/15/16 evidence and Methodology 2.0.0 package directly.
 * - Writes only the two independent result artifacts named below.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const OUT_JSON = "audit/session17/independent-validation-results.json";
const OUT_MD = "audit/session17/independent-validation-report.md";
const SELF = "audit/session17/validate-independent.mjs";
const ORIGINAL_VALIDATOR = "audit/session17/validate-freeze.mjs";
const ORIGINAL_REPORT = "audit/session17/validation-report.md";
const shaCache = new Map();
const checks = [];

function posix(p) { return p.replaceAll("\\", "/"); }
function absolute(p) { return path.join(ROOT, ...posix(p).split("/")); }
function readJson(p) { return JSON.parse(fs.readFileSync(absolute(p), "utf8")); }
function git(args) { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim(); }
function stableNumber(value) { return Object.is(value, -0) ? 0 : value; }
function canonicalize(value) {
  if (value === null || typeof value !== "object") return typeof value === "number" ? stableNumber(value) : value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }
function shaText(text) { return crypto.createHash("sha256").update(text, "utf8").digest("hex"); }
function close(a, b, tolerance = 1e-10) {
  if (a === null || b === null) return a === b;
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}
function record(id, pass, evidence, severity = "hard") {
  checks.push({ id, pass: Boolean(pass), severity, evidence });
  return Boolean(pass);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

async function shaFile(p, bypassCache = false) {
  const rel = posix(p);
  if (!bypassCache && shaCache.has(rel)) return shaCache.get(rel);
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(absolute(rel));
  for await (const chunk of stream) hash.update(chunk);
  const value = hash.digest("hex");
  if (!bypassCache) shaCache.set(rel, value);
  return value;
}

async function filesUnder(rel) {
  const output = [];
  async function walk(current) {
    const entries = await fsp.readdir(absolute(current), { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      const child = posix(path.join(current, entry.name));
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile()) output.push(child);
    }
  }
  await walk(rel);
  return output;
}

async function identityRows(paths, bypassCache = false) {
  const rows = [];
  for (const p of [...new Set(paths.map(posix))].sort()) {
    const stat = await fsp.stat(absolute(p));
    rows.push({ path: p, bytes: stat.size, sha256: await shaFile(p, bypassCache) });
  }
  return rows;
}

function treeDigest(rows) {
  return shaText(canonicalJson(rows.map(({ path: p, bytes, sha256 }) => ({ path: p, bytes, sha256 }))));
}

async function* jsonLines(rel) {
  const input = fs.createReadStream(absolute(rel), { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line);
}

async function verifyManifestRows(rows, label) {
  const failures = [];
  for (const expected of rows) {
    const p = expected.path;
    try {
      const stat = await fsp.stat(absolute(p));
      const actualSha = await shaFile(p);
      if ((expected.bytes !== undefined && stat.size !== expected.bytes) || actualSha !== expected.sha256) {
        failures.push({ path: p, expectedBytes: expected.bytes, actualBytes: stat.size, expectedSha256: expected.sha256, actualSha256: actualSha });
      }
    } catch (error) {
      failures.push({ path: p, error: error.message });
    }
  }
  record(`${label}-physical-identities`, failures.length === 0, { checked: rows.length, failures });
  return failures;
}

function deref(schema, root) {
  if (!schema?.$ref) return schema;
  const parts = schema.$ref.replace(/^#\//, "").split("/").map((s) => s.replaceAll("~1", "/").replaceAll("~0", "~"));
  return parts.reduce((value, key) => value[key], root);
}

// Deliberately small validator for the constructs used by the mutation tests below.
function validateSchema(value, rawSchema, root, at = "$", errors = []) {
  const schema = deref(rawSchema, root);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => validateSchema(value, candidate, root, at, []).length === 0).length;
    if (matches !== 1) errors.push(`${at}: expected exactly one oneOf match, found ${matches}`);
    return errors;
  }
  if (Object.hasOwn(schema, "const") && !Object.is(value, schema.const)) errors.push(`${at}: const mismatch`);
  if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) errors.push(`${at}: enum mismatch`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;
    const compatible = types.includes(actual) || (actual === "integer" && types.includes("number"));
    if (!compatible) { errors.push(`${at}: expected ${types.join("|")}, found ${actual}`); return errors; }
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${at}: minLength`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) errors.push(`${at}: pattern`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: minItems`);
    if (schema.uniqueItems && new Set(value.map(canonicalJson)).size !== value.length) errors.push(`${at}: uniqueItems`);
    if (schema.items) value.forEach((item, index) => validateSchema(item, schema.items, root, `${at}[${index}]`, errors));
  } else if (value && typeof value === "object") {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${at}.${key}: required`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!Object.hasOwn(schema.properties ?? {}, key)) errors.push(`${at}.${key}: additional property`);
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) validateSchema(value[key], child, root, `${at}.${key}`, errors);
    }
  }
  return errors;
}

function evaluateFixture(test) {
  const x = test.input;
  let valid = false;
  switch (test.ruleId) {
    case "syndication-origin-count": valid = x.independentOriginCount === new Set(x.originIds).size; break;
    case "independent-corroboration": valid = x.originStatus === "assessed" && x.independentOriginCount >= 2 && x.conflicting === false && x.qualifiesE2 === true; break;
    case "unknown-origin-conservative": valid = x.originStatus !== "unknown" || (x.independentOriginCount === 0 && x.qualifiesE2 === false && x.elevated === false); break;
    case "direct-mechanism-required": valid = x.elevated === x.mechanismRelations.includes("direct"); break;
    case "one-contribution-per-cluster-channel-run": valid = x.contributionCount <= 1; break;
    case "stage-boundary": valid = x.elevated === (["implemented", "impact-observed"].includes(x.stage) && x.visible); break;
    case "material-clock": valid = x.state !== "continuing" || x.lastMaterialChangeAt === x.priorLastMaterialChangeAt; break;
    case "material-transition": valid = ["escalating", "de-escalating"].includes(x.state) && x.material && x.transitionAt === x.lastMaterialChangeAt && x.evidenceRefs.length > 0; break;
    case "unresolved-is-not-nonevent": valid = x.observedDisposition !== "unresolved-event-identity" || x.storedDisposition === "unresolved-event-identity"; break;
    case "atomic-decomposition-provenance": valid = x.parentDisposition === "decomposed-parent" && x.childCount === x.childDispositions.length && x.childCount > 1 && x.provenanceOperations.includes("decomposed") && x.rawParentRetained; break;
    case "append-only-lineage": valid = x.priorAssignmentRetained && x.allOperationsHaveProvenance && !x.idsReused; break;
    case "chronology-fidelity": valid = x.pointInTimeEligible || !x.includedInThresholdHistory; break;
    case "own-series-window": valid = !x.usesGlobalDates && x.actualObservationDates.length >= x.lookbackValidObservations + 1; break;
    case "per-channel-dating": valid = x.eachChannelSameDate && !x.requiresGlobalDate; break;
    case "freshness-bound": valid = x.eligible === (x.businessDayAge <= 3); break;
    case "minimum-eligible-count": {
      const expected = x.mappedCount === 2 ? 2 : x.mappedCount === 3 ? 2 : 3;
      valid = x.minimumCount === expected && x.assessed === (x.eligibleCount >= expected);
      break;
    }
    case "no-mixed-date-statistic": valid = x.status !== "assessed" || new Set(x.includedDates).size === 1; break;
    case "prior-only-percentile": valid = !x.currentIncludedInHistory && x.historyDates.every((date) => date < x.currentDate); break;
    case "conditioned-history": valid = !x.pooledDifferentKey && x.historyKeys.every((key) => key === `${x.currentInstrumentSetVersion}|${x.currentEligibleCount}`); break;
    case "insufficient-history": valid = x.conditionedPriorCount >= 126 || (x.status === "insufficient-conditioned-history" && x.threshold === null && x.elevated === null && !x.fallbackUsed); break;
    case "quantile-tie": valid = x.rank === Math.max(1, Math.ceil((1 - x.alpha) * x.history.length)) && x.threshold === [...x.history].sort((a, b) => a - b)[x.rank - 1] && x.elevated === (x.current > x.threshold); break;
    case "market-diagnostics": {
      const ordered = Object.entries(x.zByInstrument).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0]));
      valid = x.driver === ordered[0][0] && x.secondDriver === ordered[1][0] && x.aboveThresholdCount === ordered.filter(([, z]) => Math.abs(z) >= 1.5).length && close(x.breadth, x.aboveThresholdCount / x.eligibleCount, 1e-12) && !x.breadthAffectsBinary;
      break;
    }
    case "after-close-pending": valid = x.signalObservedAt > x.relevantCloseAt ? x.status === "pending-next-eligible-close" && x.state === null : true; break;
    case "unknown-timing": valid = x.timestampReliability !== "unreliable" || (x.status === "unknown-timing" && x.state === null); break;
    case "four-state-table": {
      const expected = x.signalElevated ? (x.marketElevated ? "co-movement" : "signal-leading") : (x.marketElevated ? "market-only" : "calm");
      valid = x.state === expected;
      break;
    }
    case "noncausal-language": valid = !x.canonicalSemantics.some((s) => /predict|cause|response to|confirm/i.test(s)); break;
    case "legacy-immutability": valid = x.legacyMethodologyVersion === null && x.beforeSha256 === x.afterSha256; break;
    case "v2-version-stamp": valid = x.methodologyVersion === "2.0.0" && x.namespace.includes("/v2/2.0.0/"); break;
    case "canonical-reproduction": {
      const strip = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => x.excludedViewFields.includes(key) === false));
      const computedSame = shaText(canonicalJson(strip(x.payloadA))) === shaText(canonicalJson(strip(x.payloadB)));
      valid = x.excludedViewFields.includes("generatedAt") && computedSame && x.sameCanonicalHash === true;
      break;
    }
    default: throw new Error(`Unhandled fixture rule: ${test.ruleId}`);
  }
  return valid;
}

function recomputeSignal(sensitivity, assessments, assignmentStats, candidateStats) {
  const qualifyingStates = new Set(["new", "escalating", "de-escalating"]);
  const cells = new Map();
  const clusterIds = new Set();
  const channelCounts = new Map();
  const qualifyingRows = [];
  for (const row of sensitivity.pointInTimeClusterRunRows) {
    const evidenceOk = ["single-origin", "corroborated-independent"].includes(row.pointInTimeCorroboration.corroborationStatus);
    const stage = row.pointInTimeActionStage.stageOrdinal;
    const lifecycleOk = (row.runLifecyclePulse.values ?? []).some((state) => qualifyingStates.has(state));
    if (!evidenceOk || stage < 3 || !lifecycleOk) continue;
    for (const mechanism of row.pointInTimeDirectMechanisms) {
      const key = `${row.runId}|${mechanism.channelId}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push({ eventClusterId: row.eventClusterId, stageOrdinal: stage });
      clusterIds.add(row.eventClusterId);
      channelCounts.set(mechanism.channelId, (channelCounts.get(mechanism.channelId) ?? 0) + 1);
      qualifyingRows.push({ runId: row.runId, channelId: mechanism.channelId, eventClusterId: row.eventClusterId, stageOrdinal: stage });
    }
  }
  let one = 0, multiple = 0, ties = 0, topTies = 0;
  for (const rows of cells.values()) {
    if (rows.length === 1) one += 1; else multiple += 1;
    const stageCounts = new Map();
    for (const row of rows) stageCounts.set(row.stageOrdinal, (stageCounts.get(row.stageOrdinal) ?? 0) + 1);
    if ([...stageCounts.values()].some((n) => n > 1)) ties += 1;
    const maxStage = Math.max(...rows.map((r) => r.stageOrdinal));
    if (rows.filter((r) => r.stageOrdinal === maxStage).length > 1) topTies += 1;
  }
  const selectedStored = sensitivity.candidateC.variants.find((v) => v.candidateId === "C-E2-S2");
  return {
    candidateAndAssignmentCounts: { ...candidateStats, ...assignmentStats },
    selectedRule: {
      candidateFamily: "Candidate C (structural eligibility plus ranking only)",
      evidenceFamily: "E2: single-origin or corroborated-independent; unknown provenance excluded",
      minimumIndependentOriginsForCorroboration: 2,
      minimumActionStageOrdinal: 3,
      includedStages: ["implemented", "impact-observed"],
      qualifyingLifecycleStates: [...qualifyingStates],
      directMechanismRequired: true,
      maximumClusterContributionPerChannelPerRun: 1,
      ranking: "action stage descending, eventClusterId ascending"
    },
    recomputed: {
      qualifyingClusterRunChannelRows: qualifyingRows.length,
      distinctQualifyingClusters: clusterIds.size,
      channelCounts: Object.fromEntries([...channelCounts.entries()].sort()),
      activeRunChannelCells: 140,
      nonzeroCells: cells.size,
      zeroOneMultiple: { zero: 140 - cells.size, one, multiple },
      rankingTieCells: ties,
      topRankTieCells: topTies
    },
    storedCrossCheck: {
      qualifyingClusterRunChannelRows: selectedStored.qualifyingClusterRunChannelCount,
      channelBreadth: selectedStored.channelBreadth,
      rankingTieCells: selectedStored.rankingTieCellCount,
      topRankTieCells: selectedStored.topRankTieCellCount,
      eligibilityIdenticalToStructuralVariant: selectedStored.eligibilityIdenticalToStructuralVariant
    },
    assessmentDiagnostics: assessments
  };
}

async function loadAndRecomputeSignal() {
  const candidateStats = { fidelityB: 0, fidelityC: 0, chronologyEligible: 0, chronologyIneligible: 0, uniqueNormalizedB: 0 };
  const uniqueB = new Set();
  for await (const row of jsonLines("audit/session15/candidate-observations.jsonl")) {
    if (row.fidelityStratum.startsWith("B-")) { candidateStats.fidelityB += 1; uniqueB.add(row.normalizedContentId); }
    else if (row.fidelityStratum.startsWith("C-")) candidateStats.fidelityC += 1;
    const eligible = row.fidelityStratum.startsWith("B-") && row.inputEvidence?.observedAt?.status === "assessed";
    if (eligible) candidateStats.chronologyEligible += 1; else candidateStats.chronologyIneligible += 1;
  }
  candidateStats.uniqueNormalizedB = uniqueB.size;
  candidateStats.duplicateExcessB = candidateStats.fidelityB - uniqueB.size;

  let manualCount = 0;
  for await (const _row of jsonLines("audit/session15/manual-audit-set.jsonl")) manualCount += 1;
  const finalAssignments = new Map();
  for await (const row of jsonLines("audit/session15/assignment-ledger.jsonl")) {
    const prior = finalAssignments.get(row.candidateObservationId);
    if (!prior || row.assignmentPass > prior.assignmentPass) finalAssignments.set(row.candidateObservationId, row);
  }
  const accepted = [...finalAssignments.values()].filter((r) => r.assignmentDecision === "accepted").length;
  const unresolved = finalAssignments.size - accepted;
  const assignmentStats = { manualAuditRows: manualCount, finalAssignmentRows: finalAssignments.size, accepted, unresolved };

  const eventTypes = new Map(), corroboration = new Map(), directMechanisms = new Map();
  let assessmentCount = 0, exactCountAssessed = 0, exactCountUnknown = 0, lifecycleContinuingNonmaterial = 0;
  for await (const row of jsonLines("audit/session15/event-cluster-ledger.jsonl")) {
    if (row.recordType !== "event-field-assessment") continue;
    assessmentCount += 1;
    const eventType = row.eventType.value ?? "typed-unknown";
    eventTypes.set(eventType, (eventTypes.get(eventType) ?? 0) + 1);
    const corr = row.corroborationStatus.value ?? "unknown";
    corroboration.set(corr, (corroboration.get(corr) ?? 0) + 1);
    if (row.independentSourceCount.status === "assessed") exactCountAssessed += 1; else exactCountUnknown += 1;
    for (const mechanism of row.mechanisms.filter((m) => m.directness === "direct")) directMechanisms.set(mechanism.mechanismId, (directMechanisms.get(mechanism.mechanismId) ?? 0) + 1);
    for (const pulse of row.observationLifecycle) {
      if (pulse.lifecycle?.value === "continuing" && pulse.materialChange?.status === "assessed" && pulse.materialChange.value === false) lifecycleContinuingNonmaterial += 1;
    }
  }
  const assessments = {
    eventClusterAssessments: assessmentCount,
    eventTypes: Object.fromEntries([...eventTypes.entries()].sort()),
    directMechanismOpportunities: Object.fromEntries([...directMechanisms.entries()].sort()),
    corroboration: Object.fromEntries([...corroboration.entries()].sort()),
    exactIndependentCount: { assessed: exactCountAssessed, unknown: exactCountUnknown },
    continuingNonmaterialRepeats: lifecycleContinuingNonmaterial
  };
  const sensitivity = readJson("audit/session15/signal-elevation-sensitivity.json");
  return recomputeSignal(sensitivity, assessments, assignmentStats, candidateStats);
}

function sampleSd(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return { mean, sd: Math.sqrt(variance) };
}

async function recomputeTransforms() {
  const observations = new Map();
  let observationCount = 0;
  for await (const row of jsonLines("audit/session16/instrument-observations.jsonl")) {
    if (!observations.has(row.instrumentId)) observations.set(row.instrumentId, []);
    observations.get(row.instrumentId).push(row);
    observationCount += 1;
  }
  const expected = new Map();
  for (const [instrumentId, rows] of observations) {
    rows.sort((a, b) => a.observationDate.localeCompare(b.observationDate));
    const transforms = [];
    for (let i = 5; i < rows.length; i += 1) {
      const current = rows[i], prior = rows[i - 5];
      const transform = current.type === "price" ? current.value / prior.value - 1 : current.value - prior.value;
      transforms.push(transform);
      const history = transforms.slice(Math.max(0, transforms.length - 252));
      let z = null;
      if (history.length === 252) {
        const { mean, sd } = sampleSd(history);
        z = (transform - mean) / sd;
      }
      expected.set(`${instrumentId}|${current.observationDate}`, {
        instrumentId, asOf: current.observationDate, windowStart: prior.observationDate, windowEnd: current.observationDate,
        transform, historyCount: history.length, z, zHistoryStart: rows[i - history.length + 1].observationDate
      });
    }
  }
  const lookup = new Map();
  let persistedCount = 0, mismatches = 0, maxTransformError = 0, maxZError = 0;
  const samples = [];
  for await (const row of jsonLines("audit/session16/instrument-transforms.jsonl")) {
    persistedCount += 1;
    lookup.set(`${row.instrumentId}|${row.asOf}`, row);
    const exp = expected.get(`${row.instrumentId}|${row.asOf}`);
    const transformError = exp ? Math.abs(exp.transform - row.transformValue) : Infinity;
    const zError = exp && exp.z !== null && row.zScore !== null ? Math.abs(exp.z - row.zScore) : exp?.z === row.zScore ? 0 : Infinity;
    maxTransformError = Math.max(maxTransformError, transformError);
    maxZError = Math.max(maxZError, zError);
    const pass = exp && exp.windowStart === row.windowStart && exp.windowEnd === row.windowEnd && exp.historyCount === row.historyCount && exp.zHistoryStart === row.zHistoryStart && close(exp.transform, row.transformValue, 1e-12) && close(exp.z, row.zScore, 1e-10);
    if (!pass) { mismatches += 1; if (samples.length < 5) samples.push({ key: `${row.instrumentId}|${row.asOf}`, expected: exp, actual: row }); }
  }
  record("market-own-series-transform-recomputation", mismatches === 0 && expected.size === persistedCount, { observationCount, instrumentCount: observations.size, expectedTransformCount: expected.size, persistedCount, mismatches, maxTransformError, maxZError, samples });
  return { observationCount, instrumentCount: observations.size, transformCount: persistedCount, lookup, maxTransformError, maxZError };
}

async function recomputeSelectedMarket(transformState, leafMap) {
  const selectedByConfig = new Map(leafMap.channels.map((channel) => [channel.session16SelectedConfigurationId, channel]));
  const rowsByChannel = new Map(leafMap.channels.map((channel) => [channel.channelId, []]));
  let selectedRows = 0, semanticMismatches = 0;
  const mismatchSamples = [];
  const input = fs.createReadStream(absolute("audit/session16/channel-statistics.jsonl"), { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    let matchedConfig = null;
    for (const config of selectedByConfig.keys()) if (line.includes(`\"candidateConfigurationId\":\"${config}\"`)) { matchedConfig = config; break; }
    if (!matchedConfig) continue;
    const row = JSON.parse(line);
    const channel = selectedByConfig.get(matchedConfig);
    rowsByChannel.get(channel.channelId).push(row);
    selectedRows += 1;
    let pass = row.ruleId === "rule2-latest-same-date-eligible-cohort" && row.freshnessRuleId === "business-day-age-3" && row.maximumBusinessDayGap === 0 && row.mappedInstrumentCount === channel.mappedInstrumentCount && row.minimumEligibleInstrumentCount === channel.minimumEligibleInstrumentCount;
    if (row.status === "assessed") {
      const readings = row.includedInstrumentReadings;
      const ordered = [...readings].sort((a, b) => b.absZScore - a.absZScore || a.instrumentId.localeCompare(b.instrumentId));
      pass &&= row.marketAsOf === row.minInstrumentAsOf && row.marketAsOf === row.maxInstrumentAsOf && row.maximumBusinessDayGapObserved === 0 && row.mixedDates === false && row.eligibleInstrumentCount >= channel.minimumEligibleInstrumentCount;
      pass &&= readings.every((reading) => reading.asOf === row.marketAsOf && reading.businessDayAge <= 3 && close(reading.zScore, transformState.lookup.get(`${reading.instrumentId}|${reading.asOf}`)?.zScore, 1e-10));
      pass &&= close(row.M, ordered[0].absZScore, 1e-12) && row.driverInstrumentId === ordered[0].instrumentId && row.secondDriverInstrumentId === ordered[1]?.instrumentId;
      const rawCount = readings.filter((reading) => reading.absZScore >= 1.5).length;
      pass &&= row.rawAboveThresholdCount === rawCount && close(row.rawBreadthRatio, rawCount / row.eligibleInstrumentCount, 1e-12);
    }
    if (!pass) { semanticMismatches += 1; if (mismatchSamples.length < 5) mismatchSamples.push(row); }
  }
  record("market-selected-rule2-row-recomputation", semanticMismatches === 0 && selectedRows === 1955, { selectedRows, expectedSelectedRows: 1955, semanticMismatches, mismatchSamples });

  const channels = {};
  for (const channel of leafMap.channels) {
    const allRows = rowsByChannel.get(channel.channelId);
    const assessedEvaluationRows = allRows.filter((row) => row.status === "assessed");
    const unique = new Map();
    for (const row of assessedEvaluationRows) {
      const key = `${row.marketAsOf}|${row.instrumentSetVersion}|${row.eligibleInstrumentCount}`;
      if (!unique.has(key)) unique.set(key, row);
    }
    const observations = [...unique.values()].sort((a, b) => a.marketAsOf.localeCompare(b.marketAsOf));
    let thresholdAvailable = 0, insufficient = 0, percentileTriggers = 0, rawTriggers = 0, ties = 0;
    const historyByCondition = new Map();
    for (const row of observations) {
      if (row.M >= 1.5) rawTriggers += 1;
      const condition = `${row.instrumentSetVersion}|${row.eligibleInstrumentCount}`;
      const prior = historyByCondition.get(condition) ?? [];
      const rolling = prior.slice(-252);
      if (rolling.length < 126) insufficient += 1;
      else {
        thresholdAvailable += 1;
        const sorted = [...rolling].sort((a, b) => a - b);
        const rank = Math.max(1, Math.ceil(0.8 * sorted.length));
        const threshold = sorted[rank - 1];
        if (row.M > threshold) percentileTriggers += 1;
        if (row.M === threshold) ties += 1;
      }
      prior.push(row.M);
      historyByCondition.set(condition, prior);
    }
    const eligibleDistribution = {};
    for (const row of observations) eligibleDistribution[row.eligibleInstrumentCount] = (eligibleDistribution[row.eligibleInstrumentCount] ?? 0) + 1;
    channels[channel.channelId] = {
      configurationId: channel.session16SelectedConfigurationId,
      statisticSeriesId: channel.session16StatisticSeriesId,
      evaluationDates: allRows.length,
      assessedEvaluationDates: assessedEvaluationRows.length,
      unassessedEvaluationDates: allRows.length - assessedEvaluationRows.length,
      distinctMarketObservations: observations.length,
      eligibleInstrumentCountDistribution: eligibleDistribution,
      rawDiagnostic: { threshold: 1.5, triggers: rawTriggers, rate: rawTriggers / observations.length },
      conditionedNearestRank: { alpha: 0.2, priorOnly: true, minimumHistory: 126, rollingMaximum: 252, strictGreaterThan: true, available: thresholdAvailable, insufficient, triggers: percentileTriggers, triggerRateWhenAvailable: thresholdAvailable ? percentileTriggers / thresholdAvailable : null, equalityTies: ties }
    };
  }
  const expected = {
    "conflict-escalation": { rows: 361, available: 224, raw: 158 },
    "credit-stress": { rows: 362, available: 231, raw: 69 },
    "energy-disruption": { rows: 353, available: 220, raw: 108 },
    "sanctions-policy": { rows: 361, available: 231, raw: 117 },
    "supply-chain": { rows: 361, available: 235, raw: 81 }
  };
  const expectedPass = Object.entries(expected).every(([id, x]) => channels[id].distinctMarketObservations === x.rows && channels[id].conditionedNearestRank.available === x.available && channels[id].rawDiagnostic.triggers === x.raw);
  record("market-selected-series-counts-and-history", expectedPass, { expected, observed: channels });
  return channels;
}

async function recomputeTiming() {
  const rows = [];
  for await (const row of jsonLines("audit/session16/signal-market-timing.jsonl")) if (row.signalCandidateId === "C-E2-S2") rows.push(row);
  const qualifying = rows.filter((row) => row.qualifyingClusterCount > 0);
  const definitive = qualifying.filter((row) => row.timingStatus === "assessed-market-close-order-source-availability-unavailable");
  const ambiguous = qualifying.filter((row) => row.timingStatus === "ambiguous-timing");
  const countClass = (name) => qualifying.filter((row) => row.timingClassifications.includes(name)).length;
  const result = { rows: rows.length, qualifying: qualifying.length, definitive: definitive.length, ambiguous: ambiguous.length, signalBeforeClose: countClass("signal-before-close"), marketMovePrecedingSignal: countClass("market-move-preceding-signal"), signalFollowedByMarketMove: countClass("signal-followed-by-market-move"), causalAttributionClaims: rows.filter((row) => row.causalAttributionClaimed).length };
  record("signal-market-timing-recomputation", canonicalJson(result) === canonicalJson({ rows: 140, qualifying: 36, definitive: 10, ambiguous: 26, signalBeforeClose: 10, marketMovePrecedingSignal: 4, signalFollowedByMarketMove: 7, causalAttributionClaims: 0 }), result);
  return result;
}

function schemaMutationAudit(schema) {
  const defs = schema.$defs;
  const sha = "a".repeat(64), candidateId = `cand-sha256-${sha}`, assignmentId = `asn-sha256-${sha}`, provenanceId = `prov-sha256-${sha}`;
  const mutations = [
    ["assessed-enum-without-value", "enumAssessment", { status: "assessed", evidenceRefs: [] }],
    ["unknown-enum-with-value", "enumAssessment", { status: "unknown", value: "implemented", evidenceRefs: [] }],
    ["independent-class-with-zero-origins", "originEvidence", { status: "assessed", evidenceClass: "corroborated-independent-nonconflicting", specificOriginIds: [], independentOriginCount: 0, conflicting: false, evidenceRefs: [] }],
    ["unknown-status-with-resolved-origin", "originEvidence", { status: "unknown", evidenceClass: "resolved-single-origin-nonconflicting", specificOriginIds: ["origin-a"], independentOriginCount: 1, conflicting: false, evidenceRefs: [] }],
    ["automatic-assignment-without-rule-or-cluster", "assignment", { recordType: "assignment", methodologyVersion: "2.0.0", assignmentId, candidateId, decisionMode: "deterministic-automatic", decision: "join", decidedAt: "2026-08-01T00:00:00.000Z", decidedBy: "validator", evidenceRefs: ["evidence-1"], provenanceId }],
    ["continuing-transition-marked-material", "lifecycleTransition", { state: "continuing", effectiveAt: "2026-08-01T00:00:00.000Z", material: true, evidenceRefs: ["evidence-1"], provenanceId }],
    ["escalating-transition-marked-nonmaterial", "lifecycleTransition", { state: "escalating", effectiveAt: "2026-08-01T00:00:00.000Z", material: false, evidenceRefs: ["evidence-1"], provenanceId }],
    ["eligible-reading-with-exclusion-and-no-window", "instrumentReading", { instrumentId: "brent", asOf: "2026-08-01", availabilityAt: { status: "unknown", reason: { code: "date-only", detail: "unknown" }, evidenceRefs: [] }, transform: 0.1, zScore: 2, absoluteZScore: 2, eligible: true, exclusionReason: "missing" }],
    ["assessed-market-with-null-statistic-and-empty-cohort", "marketChannelOutput", { channelId: "conflict-escalation", status: "assessed", evaluationDate: "2026-08-01", marketAsOf: null, instrumentSetVersion: null, eligibleInstrumentCount: 0, minimumEligibleInstrumentCount: 3, includedInstrumentReadings: [], excludedInstrumentIds: [], marketStatistic: null, percentileAlpha: 0.2, conditionedPriorObservationCount: 0, percentileThreshold: null, elevated: null, driverInstrumentId: null, driverZ: null, secondDriverInstrumentId: null, secondDriverZ: null, numberAbovePercentileThreshold: null, numberAboveRawDiagnosticThreshold: null, breadthRatio: null, reasonCodes: [] }],
    ["assessed-divergence-with-inconsistent-state", "divergenceChannelOutput", { channelId: "conflict-escalation", status: "assessed", state: "calm", signalElevated: true, marketElevated: true, signalAsOf: { status: "unknown", reason: { code: "missing", detail: "missing" }, evidenceRefs: [] }, marketAsOf: null, reasonCodes: [] }]
  ];
  const admitted = mutations.map(([id, def, value]) => ({ id, definition: def, admitted: validateSchema(value, defs[def], schema, "$", []).length === 0, validationErrors: validateSchema(value, defs[def], schema, "$", []) }));
  const properties = (name) => Object.keys(defs[name]?.properties ?? {});
  const structuralGaps = {
    candidateRawIdentityHasNormalizedContentHash: properties("rawIdentity").some((p) => /normalized/i.test(p)),
    candidateHasNormalizedContentHash: properties("candidate").some((p) => /normalized/i.test(p)),
    eventClusterHasFirstSeen: properties("eventCluster").includes("firstSeen"),
    instrumentReadingRetainsWindowStart: properties("instrumentReading").includes("windowStart"),
    instrumentReadingRetainsWindowEnd: properties("instrumentReading").includes("windowEnd"),
    instrumentReadingRetainsHistoryCount: properties("instrumentReading").includes("historyCount"),
    originEvidenceStoresReporterOriginRelationships: properties("originEvidence").some((p) => /reporter|relationship|syndication|derivation/i.test(p))
  };
  return { mutations: admitted, admittedSemanticallyInvalidCount: admitted.filter((x) => x.admitted).length, structuralGaps };
}

function collectNumbers(value, output = []) {
  if (typeof value === "number") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectNumbers(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectNumbers(item, output));
  return output;
}

function buildReport(result) {
  const lines = [];
  lines.push(`# PA-08 independent validation — ${result.decision}`);
  lines.push("");
  lines.push(`Independent decision: **${result.decision}**. The Methodology 2.0.0 freeze candidate is not safe to hand to Session 18 unchanged.`);
  lines.push("");
  lines.push("## Boundary and method");
  lines.push("");
  lines.push(`Repository: \`${result.repository.branch}\` at \`${result.repository.head}\`; origin/master \`${result.repository.originMaster}\`; ahead/behind ${result.repository.ahead}/${result.repository.behind}.`);
  lines.push("");
  lines.push("This validator was authored from the Session 14 contract, Session 15/16 frozen evidence, and Methodology 2.0.0 artifacts. It did not import or execute the first validator. The first-validator comparison remains pending until these independent results are fixed.");
  lines.push("");
  lines.push("## Independently reproduced results");
  lines.push("");
  const s = result.signal.recomputed;
  lines.push(`Signal C-E2-S2 reproduced ${s.qualifyingClusterRunChannelRows} qualifying cluster/run/channel rows from ${s.distinctQualifyingClusters} clusters across ${s.nonzeroCells}/140 nonzero run/channel cells (${s.zeroOneMultiple.one} one, ${s.zeroOneMultiple.multiple} multiple), with ${s.rankingTieCells} tie cells and ${s.topRankTieCells} top-tie cells.`);
  lines.push("");
  for (const [channel, m] of Object.entries(result.market.channels)) lines.push(`- ${channel}: ${m.distinctMarketObservations} distinct closes; raw |z| >= 1.5 ${m.rawDiagnostic.triggers}; conditioned history ${m.conditionedNearestRank.available} available / ${m.conditionedNearestRank.insufficient} insufficient; percentile triggers ${m.conditionedNearestRank.triggers}.`);
  lines.push("");
  lines.push(`Timing reproduced ${result.market.timing.qualifying} qualifying cells: ${result.market.timing.definitive} definitive and ${result.market.timing.ambiguous} ambiguous; no causal attribution claims.`);
  lines.push("");
  lines.push("## Material defects");
  lines.push("");
  result.materialDefects.forEach((defect) => lines.push(`- **${defect.id} — ${defect.title}.** ${defect.evidence} ${defect.requiredCorrection}`));
  lines.push("");
  lines.push("## Other results");
  lines.push("");
  lines.push(`Artifact identities: ${result.identities.artifactFailures.length === 0 ? "PASS" : "FAIL"}; evidence identities: ${result.identities.evidenceFailures.length === 0 ? "PASS" : "FAIL"}; fixtures: ${result.fixtures.passed}/${result.fixtures.total} replayed as intended; deferrals: ${result.deferrals.pass ? "PASS" : "FAIL"}; hidden numeric constants: ${result.constants.undeclared.length === 0 ? "none detected" : result.constants.undeclared.join(", ")}.`);
  lines.push("");
  lines.push("## Original-validator comparison");
  lines.push("");
  lines.push("Pending by design. Run the first validator only after this result is fixed, then append the comparison without changing the independent findings above.");
  lines.push("");
  lines.push("## Mutation boundary");
  lines.push("");
  lines.push(`Frozen surface start/end match: ${result.mutationBoundary.pass ? "PASS" : "FAIL"}. Only \`${SELF}\`, \`${OUT_JSON}\`, and \`${OUT_MD}\` are authorized independent outputs. Nothing was staged, committed, pushed, repaired, implemented, or appended to the project log.`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const manifest = readJson("methodology/2.0.0/manifest.json");
  const parameters = readJson("methodology/2.0.0/parameters.json");
  const schema = readJson("methodology/2.0.0/schema.json");
  const leafMap = readJson("methodology/2.0.0/leaf-channel-map.json");
  const clustering = readJson("methodology/2.0.0/clustering-lifecycle-rules.json");
  const sourceOrigin = readJson("methodology/2.0.0/source-origin-rules.json");
  const storage = readJson("methodology/2.0.0/storage-migration-contract.json");
  const parallel = readJson("methodology/2.0.0/parallel-acceptance.json");
  const positive = readJson("methodology/2.0.0/fixtures/positive.json");
  const negative = readJson("methodology/2.0.0/fixtures/negative.json");
  const traceability = readJson("audit/session17/parameter-traceability.json");
  const deferralsSource = readJson("audit/session17/deferred-items.json");

  const repository = {
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
    shortHead: git(["rev-parse", "--short", "HEAD"]),
    originMaster: git(["rev-parse", "origin/master"]),
    staged: git(["diff", "--cached", "--name-only"]),
    statusAtStart: git(["status", "--short"]),
    untrackedAtStart: git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean).map(posix).sort()
  };
  [repository.ahead, repository.behind] = git(["rev-list", "--left-right", "--count", "HEAD...origin/master"]).split(/\s+/).map(Number);
  record("repository-preflight", repository.branch === "master" && repository.head === "bfce08feece67444ce7fd98ea6fe2b42d15eea24" && repository.originMaster === repository.head && repository.ahead === 0 && repository.behind === 0 && repository.staged === "", repository);

  const methodologyFiles = await filesUnder("methodology/2.0.0");
  const session15Files = await filesUnder("audit/session15");
  const preservationFiles = await filesUnder("runs/session15-preservation/20260813T111218Z");
  const session16Files = await filesUnder("audit/session16");
  const freezeCandidateFiles = ["audit/session17/decision-register.json", "audit/session17/deferred-items.json", "audit/session17/freeze-report.md", "audit/session17/parameter-traceability.json", ORIGINAL_VALIDATOR, ORIGINAL_REPORT];
  const productionFiles = manifest.productionPreservationBaseline.map((x) => x.path);
  const surfacePaths = [...methodologyFiles, ...session15Files, ...preservationFiles, ...session16Files, ...freezeCandidateFiles, ...productionFiles];
  const surfaceStart = await identityRows(surfacePaths);

  const artifactFailures = await verifyManifestRows(manifest.artifactIdentities, "methodology-artifact");
  const evidenceFailures = await verifyManifestRows(manifest.evidenceIdentities, "frozen-evidence");
  const productionFailures = await verifyManifestRows(manifest.productionPreservationBaseline, "production-baseline");
  const selfCopy = clone(manifest); selfCopy.selfIdentity.value = null;
  const manifestCanonicalSelf = shaText(canonicalJson(selfCopy));
  record("methodology-manifest-canonical-self", manifestCanonicalSelf === manifest.selfIdentity.value && manifestCanonicalSelf === "809fb5119c3634ab6c30349c8b58ef7659effd4b0b227af69186ed876e63bf33", { expected: manifest.selfIdentity.value, actual: manifestCanonicalSelf });

  const session16Manifest = readJson("audit/session16/input-manifest.json");
  const session16SelfCopy = clone(session16Manifest); session16SelfCopy.manifestHash.value = null;
  const session16CanonicalSelf = shaText(canonicalJson(session16SelfCopy));
  record("session16-manifest-canonical-self", session16CanonicalSelf === "308089d94d9b4f5825adb3204b99d3b421c85cd362c6d9e62e261037ff597d1d" && session16CanonicalSelf === session16Manifest.manifestHash.value, { physical: await shaFile("audit/session16/input-manifest.json"), canonicalSelf: session16CanonicalSelf, inventoryCount: session16Manifest.inventory.length, observationCount: session16Manifest.totals.validObservationCount });

  const session15Manifest = readJson("audit/session15/input-manifest.json");
  const session15SelfCopy = clone(session15Manifest); session15SelfCopy.manifestHash.value = null;
  const session15CanonicalSelf = shaText(canonicalJson(session15SelfCopy));
  const preservationRows = await identityRows(preservationFiles);
  const preservationBytes = preservationRows.reduce((sum, row) => sum + row.bytes, 0);
  record("session15-manifest-and-preservation", session15CanonicalSelf === "3a864319add335d4f2fb3550fa8b865a6282d29f4a37819200e516106cdf3651" && await shaFile("audit/session15/input-manifest.json") === "95fe87b181f4a714a4571960fc6fca03fa62c96a94b82b4920c0a471a5767f0c" && preservationFiles.length === 11 && preservationBytes === 597000, { physicalManifest: await shaFile("audit/session15/input-manifest.json"), canonicalSelf: session15CanonicalSelf, preservationFiles: preservationFiles.length, preservationBytes });

  const signal = await loadAndRecomputeSignal();
  const expectedSignal = { rows: 82, clusters: 62, channelCounts: { "conflict-escalation": 55, "credit-stress": 2, "energy-disruption": 6, "sanctions-policy": 6, "supply-chain": 13 }, nonzero: 36, one: 23, multiple: 13, ties: 10, topTies: 9 };
  record("signal-c-e2-s2-independent-recomputation", signal.recomputed.qualifyingClusterRunChannelRows === expectedSignal.rows && signal.recomputed.distinctQualifyingClusters === expectedSignal.clusters && canonicalJson(signal.recomputed.channelCounts) === canonicalJson(expectedSignal.channelCounts) && signal.recomputed.nonzeroCells === expectedSignal.nonzero && signal.recomputed.zeroOneMultiple.one === expectedSignal.one && signal.recomputed.zeroOneMultiple.multiple === expectedSignal.multiple && signal.recomputed.rankingTieCells === expectedSignal.ties && signal.recomputed.topRankTieCells === expectedSignal.topTies, { expected: expectedSignal, observed: signal.recomputed });
  record("signal-frozen-ledger-denominators", signal.candidateAndAssignmentCounts.fidelityB === 1153 && signal.candidateAndAssignmentCounts.uniqueNormalizedB === 319 && signal.candidateAndAssignmentCounts.duplicateExcessB === 834 && signal.candidateAndAssignmentCounts.fidelityC === 64 && signal.candidateAndAssignmentCounts.manualAuditRows === 428 && signal.candidateAndAssignmentCounts.accepted === 327 && signal.candidateAndAssignmentCounts.unresolved === 101 && signal.assessmentDiagnostics.eventClusterAssessments === 123 && signal.assessmentDiagnostics.exactIndependentCount.assessed === 102 && signal.assessmentDiagnostics.exactIndependentCount.unknown === 21 && signal.assessmentDiagnostics.continuingNonmaterialRepeats === 184, signal);

  const transformState = await recomputeTransforms();
  const marketChannels = await recomputeSelectedMarket(transformState, leafMap);
  const timing = await recomputeTiming();

  const fixtureResults = [...positive.cases, ...negative.cases].map((test) => {
    const actualValid = evaluateFixture(test);
    return { id: test.id, ruleId: test.ruleId, expectedValid: test.expectedValid, actualValid, pass: actualValid === test.expectedValid };
  });
  const fixturePassed = fixtureResults.filter((x) => x.pass).length;
  record("fixture-independent-semantic-replay", fixturePassed === fixtureResults.length && positive.cases.length === 37 && negative.cases.length === 26, { positive: positive.cases.length, negative: negative.cases.length, passed: fixturePassed, failures: fixtureResults.filter((x) => !x.pass) });

  const schemaAudit = schemaMutationAudit(schema);
  const traceMeasurement = traceability.entries?.[0]?.evidence?.[0]?.measurement ?? null;
  const traceabilityMismatch = typeof traceMeasurement === "string" && traceMeasurement.includes("101/123") && signal.assessmentDiagnostics.exactIndependentCount.unknown === 21;

  const declaredNumbers = new Set(collectNumbers(parameters).map(String));
  const packageNumericFiles = [schema, leafMap, clustering, sourceOrigin, storage, parallel];
  const usedNumbers = [...new Set(packageNumericFiles.flatMap((x) => collectNumbers(x)).map(String))].sort((a, b) => Number(a) - Number(b));
  const structuralNumbers = new Set(["0", "1"]);
  const undeclared = usedNumbers.filter((n) => !declaredNumbers.has(n) && !structuralNumbers.has(n));
  record("hidden-numeric-constant-scan", undeclared.length === 0, { used: usedNumbers, undeclared });

  const deferralRequired = ["deferredItemId", "topic", "whyEvidenceIsInsufficient", "safeSession18Or19Behavior", "blockEffect", "evidenceNeeded", "futureGate"];
  const deferralFailures = deferralsSource.items.flatMap((item) => deferralRequired.filter((key) => typeof item[key] !== "string" || item[key].trim() === "").map((key) => `${item.deferredItemId ?? "unknown"}.${key}`));
  const deferralPass = deferralsSource.items.length === 6 && deferralFailures.length === 0 && deferralsSource.items.some((item) => /retention|storage|backend/i.test(item.topic)) && deferralsSource.items.some((item) => /privacy|licens|source terms|terms restrict/i.test(item.topic + item.blockEffect + item.safeSession18Or19Behavior));
  record("deferral-governance", deferralPass, { itemCount: deferralsSource.items.length, failures: deferralFailures, items: deferralsSource.items.map((x) => ({ id: x.deferredItemId, topic: x.topic, blockEffect: x.blockEffect })) });

  const fixtureSchemaRecords = [...positive.cases, ...negative.cases].filter((x) => x.input?.recordType && x.input?.methodologyVersion).length;
  const canonicalOrderingKeys = Object.keys(parameters.parameters.canonicalization.arrayOrdering);
  const materialDefects = [
    {
      id: "PA08-D01", title: "The exact normalized-content automatic clustering path has no persisted input identity",
      evidence: `The clustering rules permit exact-normalized-content-hash joins, but schema.$defs.rawIdentity and schema.$defs.candidate expose no normalized-content hash and the frozen parameter package defines no candidate-text normalization algorithm. Structural test result: raw identity has normalized hash = ${schemaAudit.structuralGaps.candidateRawIdentityHasNormalizedContentHash}.`,
      requiredCorrection: "Add the normalized input field and deterministic normalization contract, add positive/negative record fixtures, regenerate identities, and rerun PA-08."
    },
    {
      id: "PA08-D02", title: "The schema admits states that contradict the frozen signal and market rules",
      evidence: `${schemaAudit.admittedSemanticallyInvalidCount}/${schemaAudit.mutations.length} adversarial records were schema-admissible, including independent corroboration with zero origins, automatic join without an allowed rule or cluster, continuing marked material, assessed market with no cohort/statistic, and an inconsistent assessed divergence state.`,
      requiredCorrection: "Encode cross-field conditions in the schema (or a normative validator bound by hash), add mutation fixtures, regenerate the package, and rerun."
    },
    {
      id: "PA08-D03", title: "Required temporal and own-series audit surfaces are absent from the final schema",
      evidence: `eventCluster.firstSeen=${schemaAudit.structuralGaps.eventClusterHasFirstSeen}; instrumentReading.windowStart=${schemaAudit.structuralGaps.instrumentReadingRetainsWindowStart}; windowEnd=${schemaAudit.structuralGaps.instrumentReadingRetainsWindowEnd}; historyCount=${schemaAudit.structuralGaps.instrumentReadingRetainsHistoryCount}. These fields are required to demonstrate lifecycle clocks and the five-valid-observation/no-lookahead calculation.`,
      requiredCorrection: "Restore required retained fields and their ordering/consistency constraints, then add complete schema-record fixtures."
    },
    {
      id: "PA08-D04", title: "Reporter/origin/syndication independence cannot be reconstructed from the frozen origin schema",
      evidence: `originEvidence stores a flat origin-ID list and count but no reporter-to-asserted-origin or derivation/syndication relationship; structural relationship field present=${schemaAudit.structuralGaps.originEvidenceStoresReporterOriginRelationships}. The schema therefore cannot enforce the two-origin rule from recoverable records.`,
      requiredCorrection: "Persist relationship evidence and bind independentOriginCount/evidenceClass/conflicting to it with record-level tests."
    },
    {
      id: "PA08-D05", title: "Canonicalization and fixture coverage do not prove byte determinism",
      evidence: `The parameters promise schema-defined array order, but ordering is declared for only ${canonicalOrderingKeys.length} broad collections while critical arrays such as evidenceRefs, histories, mechanisms, readings, reasonCodes, and hashes lack normative ordering. The ${fixtureResults.length} fixtures contain ${fixtureSchemaRecords} complete v2 schema records and test only one object-key/volatile-field canonicalization example.`,
      requiredCorrection: "Define every persisted array's canonical ordering and add byte fixtures for arrays, LF, rounding, negative zero, timestamps, and repeated full records."
    },
    {
      id: "PA08-D06", title: "Parameter traceability materially overstates unresolved cluster provenance",
      evidence: `parameter-traceability.json entries[0].evidence[0].measurement states ${JSON.stringify(traceMeasurement)}, while direct ledger recomputation finds 21/123 clusters with unknown exact independent-source count; 101 is the unresolved observation assignment count out of 428.`,
      requiredCorrection: "Correct the evidence statement and review the E2/E3 rationale, regenerate hashes/reports, and rerun both validators."
    }
  ];

  const observations = [
    { id: "PA08-O01", text: "The storage contract allows a lossless normalized equivalent but does not freeze a raw/normalized market-input record schema; this is governance debt under the already-deferred PA-09 durable-storage/cutover boundary." },
    { id: "PA08-O02", text: "The fixture suite does not include a direct negative case for corroborated-independent with fewer than two origins, a 3-of-4 quorum failure, or invalid escalating/de-escalating material flags; the mutation audit exposes these omissions." }
  ];

  // Exact end-of-run rehash of every prohibited/frozen surface. Only independent outputs are outside this set.
  const surfaceEnd = await identityRows(surfacePaths, true);
  const mutationMismatches = surfaceStart.filter((before, index) => canonicalJson(before) !== canonicalJson(surfaceEnd[index])).map((before, index) => ({ before, after: surfaceEnd[index] }));
  const mutationBoundary = { pass: mutationMismatches.length === 0, filesCompared: surfaceStart.length, startTreeSha256: treeDigest(surfaceStart), endTreeSha256: treeDigest(surfaceEnd), mismatches: mutationMismatches };
  record("frozen-surface-start-end-identity", mutationBoundary.pass, mutationBoundary);

  const hardFailures = checks.filter((x) => x.severity === "hard" && !x.pass);
  const decision = hardFailures.length === 0 && materialDefects.length === 0 ? "PASS" : "FAIL";
  const result = {
    recordType: "pa08-independent-validation",
    schemaVersion: "crucix-session17-independent-validation/v1",
    methodologyVersion: "2.0.0",
    decision,
    independentResultState: "fixed-before-first-validator-execution",
    independenceStatement: "Authored and executed without importing, executing, or inspecting the logic/report of audit/session17/validate-freeze.mjs; only opaque hashes of those two files were included in the mutation boundary.",
    repository,
    identities: {
      manifestCanonicalSelf,
      artifactIdentityCount: manifest.artifactIdentities.length,
      evidenceIdentityCount: manifest.evidenceIdentities.length,
      artifactFailures,
      evidenceFailures,
      productionFailures,
      session15: { physicalManifestSha256: await shaFile("audit/session15/input-manifest.json"), canonicalSelfSha256: session15CanonicalSelf, preservationFiles: preservationFiles.length, preservationBytes },
      session16: { physicalManifestSha256: await shaFile("audit/session16/input-manifest.json"), canonicalSelfSha256: session16CanonicalSelf, frozenFileCount: session16Files.length }
    },
    signal,
    market: { observations: transformState.observationCount, instruments: transformState.instrumentCount, transforms: transformState.transformCount, maximumTransformError: transformState.maxTransformError, maximumZScoreError: transformState.maxZError, channels: marketChannels, timing },
    schemaAudit,
    fixtures: { positive: positive.cases.length, negative: negative.cases.length, total: fixtureResults.length, passed: fixturePassed, completeSchemaRecordCases: fixtureSchemaRecords, failures: fixtureResults.filter((x) => !x.pass) },
    traceability: { measurement: traceMeasurement, directUnknownExactCountClusters: signal.assessmentDiagnostics.exactIndependentCount.unknown, mismatch: traceabilityMismatch },
    constants: { declaredNumericValues: [...declaredNumbers].sort((a, b) => Number(a) - Number(b)), usedNumericValues: usedNumbers, undeclared },
    deferrals: { pass: deferralPass, itemCount: deferralsSource.items.length, failures: deferralFailures },
    checks: { total: checks.length, passed: checks.filter((x) => x.pass).length, failed: hardFailures.length, items: checks },
    materialDefects,
    observations,
    mutationBoundary,
    originalValidatorComparison: { status: "not-run-until-independent-result-fixed", validator: ORIGINAL_VALIDATOR, report: ORIGINAL_REPORT, independentFindingsLocked: true },
    authorizedOutputs: [SELF, OUT_JSON, OUT_MD],
    prohibitedActions: { repairedFreezeCandidate: false, staged: false, committed: false, pushed: false, implementedSession18Or19: false, appendedProjectLog: false }
  };
  fs.writeFileSync(absolute(OUT_JSON), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(absolute(OUT_MD), buildReport(result), "utf8");
  process.stdout.write(`PA-08 ${decision}\n${JSON.stringify({ hardFailures: hardFailures.map((x) => x.id), materialDefects: materialDefects.map((x) => x.id), result: OUT_JSON, report: OUT_MD }, null, 2)}\n`);
  process.exitCode = decision === "PASS" ? 0 : 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 2;
});
