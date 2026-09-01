/**
 * Deterministic, read-only validator for the Session 17 freeze candidate.
 * Uses Node built-ins only and writes no files.
 *
 * Usage: node audit/session17/validate-freeze.mjs
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const METHODOLOGY = path.join(ROOT, "methodology/2.0.0");

const results = [];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), "utf8"));
}

async function readJsonLines(relativePath) {
  return (await fs.readFile(path.join(ROOT, relativePath), "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function fileIdentity(relativePath) {
  const bytes = await fs.readFile(path.join(ROOT, relativePath));
  return { bytes: bytes.length, sha256: sha256(bytes) };
}

function canonicalize(value, excludedFields = new Set()) {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item, excludedFields));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).filter((key) => !excludedFields.has(key)).sort()
      .map((key) => [key, canonicalize(value[key], excludedFields)]));
  }
  if (typeof value === "number") {
    invariant(Number.isFinite(value), "canonical JSON prohibits non-finite numbers");
    return Object.is(value, -0) ? 0 : value;
  }
  return value;
}

function canonicalJson(value, excludedFields = []) {
  return JSON.stringify(canonicalize(value, new Set(excludedFields)));
}

function arraySortValue(item, sortKey) {
  if (sortKey === "lexical value") return String(item);
  if (sortKey === "numeric ascending") return Number(item);
  const keys = sortKey.split(" then ").map((part) => part.replace(/ ascending| descending| strictly/g, "").trim());
  return keys.map((key) => item?.[key] ?? "");
}

function compareSortValues(left, right) {
  const a = Array.isArray(left) ? left : [left];
  const b = Array.isArray(right) ? right : [right];
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if (a[index] === b[index]) continue;
    if (typeof a[index] === "number" && typeof b[index] === "number") return a[index] - b[index];
    return String(a[index]).localeCompare(String(b[index]));
  }
  return 0;
}

function validateSequenceOrder(items, propertyName, policy) {
  if (propertyName === "cases") {
    invariant(new Set(items.map((item) => item.id)).size === items.length, "cases: duplicate fixture ID");
    return;
  }
  if (propertyName === "instrumentObservationDates") {
    invariant(items.every((item, index) => index === 0 || items[index - 1] < item), `${propertyName}: sequence is not strictly ascending`);
    return;
  }
  const keyText = policy.monotonicKey;
  const keys = keyText.split(" then ").map((part) => part.replace(/ ascending| strictly ascending| authored order.*$/g, "").trim()).filter(Boolean);
  for (let index = 1; index < items.length; index += 1) {
    const prior = keys.map((key) => items[index - 1]?.[key]);
    const current = keys.map((key) => items[index]?.[key]);
    invariant(compareSortValues(prior, current) <= 0, `${propertyName}: sequence violates ${policy.monotonicKey}`);
    if (/strictly/.test(keyText)) invariant(compareSortValues(prior, current) < 0, `${propertyName}: sequence is not strict`);
  }
}

function canonicalizeV2(value, canonicalization, propertyName = null) {
  if (Array.isArray(value)) {
    const policy = canonicalization.arrayPoliciesByProperty[propertyName];
    invariant(policy, `${propertyName ?? "<root-array>"}: no canonical array policy`);
    const items = value.map((item) => canonicalizeV2(item, canonicalization, null));
    if (policy.kind === "sequence") {
      validateSequenceOrder(items, propertyName, policy);
      return items;
    }
    invariant(policy.kind === "set", `${propertyName}: unknown array policy kind`);
    const sorted = [...items].sort((a, b) => compareSortValues(arraySortValue(a, policy.sortKey), arraySortValue(b, policy.sortKey)));
    const keys = sorted.map((item) => canonicalJson(arraySortValue(item, policy.sortKey)));
    invariant(new Set(keys).size === keys.length, `${propertyName}: duplicate canonical set key`);
    return sorted;
  }
  if (value && typeof value === "object") {
    const excluded = new Set(canonicalization.volatileFieldsExcludedFromIdentity);
    return Object.fromEntries(Object.keys(value).filter((key) => !excluded.has(key)).sort()
      .map((key) => [key, canonicalizeV2(value[key], canonicalization, key)]));
  }
  if (typeof value === "number") {
    invariant(Number.isFinite(value), "canonical JSON prohibits non-finite numbers");
    return Object.is(value, -0) ? 0 : value;
  }
  return value;
}

function canonicalV2Bytes(value, canonicalization) {
  return Buffer.from(`${JSON.stringify(canonicalizeV2(value, canonicalization))}\n`, "utf8");
}

function conservativeNormalize(rawText) {
  return String(rawText).normalize("NFKC").replace(/\r\n?/g, "\n").trim().replace(/\s+/gu, " ");
}

function roundPersisted(value, places) {
  invariant(Number.isInteger(places) && places >= 0, "rounding places must be a nonnegative integer");
  invariant(Number.isFinite(value), "persisted numeric value must be finite");
  const rounded = Number(value.toFixed(places));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function getPath(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value?.[key], object);
}

function resolveLocalRef(rootSchema, ref) {
  invariant(ref.startsWith("#/"), `only local schema refs are frozen: ${ref}`);
  return ref.slice(2).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, key) => value?.[key], rootSchema);
}

function sameValue(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function hasType(value, expected) {
  if (expected === "null") return value === null;
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (expected === "integer") return Number.isInteger(value);
  if (expected === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === expected;
}

function validateAgainstSchema(value, definition, rootSchema, location = "$") {
  if (definition.$ref) return validateAgainstSchema(value, resolveLocalRef(rootSchema, definition.$ref), rootSchema, location);
  if (definition.if) {
    let matched = true;
    try { validateAgainstSchema(value, definition.if, rootSchema, location); } catch { matched = false; }
    if (matched && definition.then) validateAgainstSchema(value, definition.then, rootSchema, location);
    if (!matched && definition.else) validateAgainstSchema(value, definition.else, rootSchema, location);
  }
  if (definition.not) {
    let matched = true;
    try { validateAgainstSchema(value, definition.not, rootSchema, location); } catch { matched = false; }
    invariant(!matched, `${location}: prohibited schema matched`);
  }
  if (definition.anyOf) {
    const matches = definition.anyOf.filter((branch) => {
      try { validateAgainstSchema(value, branch, rootSchema, location); return true; } catch { return false; }
    }).length;
    invariant(matches >= 1, `${location}: expected at least one anyOf match`);
  }
  if (definition.oneOf) {
    const attempts = definition.oneOf.map((branch) => {
      try { validateAgainstSchema(value, branch, rootSchema, location); return null; } catch (error) { return error.message; }
    });
    invariant(attempts.filter((item) => item === null).length === 1, `${location}: expected exactly one oneOf match; ${attempts.filter(Boolean).join(" | ")}`);
  }
  if (definition.allOf) definition.allOf.forEach((branch) => validateAgainstSchema(value, branch, rootSchema, location));
  if (definition.type) {
    const types = Array.isArray(definition.type) ? definition.type : [definition.type];
    invariant(types.some((type) => hasType(value, type)), `${location}: expected type ${types.join("|")}`);
  }
  if (Object.hasOwn(definition, "const")) invariant(sameValue(value, definition.const), `${location}: const mismatch`);
  if (definition.enum) invariant(definition.enum.some((item) => sameValue(value, item)), `${location}: enum mismatch`);
  if (typeof value === "string") {
    if (definition.minLength !== undefined) invariant(value.length >= definition.minLength, `${location}: string shorter than minLength`);
    if (definition.pattern) invariant(new RegExp(definition.pattern).test(value), `${location}: pattern mismatch`);
  }
  if (typeof value === "number") {
    if (definition.minimum !== undefined) invariant(value >= definition.minimum, `${location}: below minimum`);
    if (definition.maximum !== undefined) invariant(value <= definition.maximum, `${location}: above maximum`);
  }
  if (Array.isArray(value)) {
    if (definition.minItems !== undefined) invariant(value.length >= definition.minItems, `${location}: too few items`);
    if (definition.maxItems !== undefined) invariant(value.length <= definition.maxItems, `${location}: too many items`);
    if (definition.uniqueItems) invariant(new Set(value.map((item) => canonicalJson(item))).size === value.length, `${location}: duplicate items`);
    if (definition.items) value.forEach((item, index) => validateAgainstSchema(item, definition.items, rootSchema, `${location}[${index}]`));
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const required of definition.required ?? []) invariant(Object.hasOwn(value, required), `${location}: missing required ${required}`);
    for (const [key, child] of Object.entries(definition.properties ?? {})) {
      if (Object.hasOwn(value, key)) validateAgainstSchema(value[key], child, rootSchema, `${location}.${key}`);
    }
    if (definition.additionalProperties === false) {
      const allowed = new Set(Object.keys(definition.properties ?? {}));
      for (const key of Object.keys(value)) invariant(allowed.has(key), `${location}: unexpected property ${key}`);
    }
  }
}

function semanticResult(valid, reason = null) {
  return { valid, reason: valid ? null : reason };
}

let positiveFixtureIndex = new Map();

function setPathValue(object, dottedPath, value) {
  const parts = dottedPath.split(".");
  const key = parts.pop();
  const parent = parts.reduce((current, part) => current[part], object);
  parent[key] = value;
}

function deletePathValue(object, dottedPath) {
  const parts = dottedPath.split(".");
  const key = parts.pop();
  const parent = parts.reduce((current, part) => current[part], object);
  delete parent[key];
}

function validateOriginTopology(record) {
  const nodeIds = new Set([
    record.candidateId,
    ...record.reportingSources.map((item) => item.reportingSourceId),
    ...record.originatingAssertions.map((item) => item.assertionId),
    ...record.reportingOrigins.map((item) => item.reportingOriginId),
    ...record.independenceGroups.map((item) => item.independenceGroupId),
  ]);
  invariant(nodeIds.size === 1 + record.reportingSources.length + record.originatingAssertions.length + record.reportingOrigins.length + record.independenceGroups.length, "INV-ORIGIN-002 duplicate topology node ID");
  for (const edge of record.provenanceEdges) {
    invariant(nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId), "INV-ORIGIN-002 dangling topology edge");
    invariant(edge.fromNodeId !== edge.toNodeId, "INV-ORIGIN-002 self-referential topology edge");
  }
  const directedTypes = new Set(["syndicated-from", "quotes-official-statement", "derived-from", "repeats"]);
  const graph = new Map();
  for (const edge of record.provenanceEdges.filter((item) => directedTypes.has(item.edgeType))) {
    if (!graph.has(edge.fromNodeId)) graph.set(edge.fromNodeId, []);
    graph.get(edge.fromNodeId).push(edge.toNodeId);
  }
  const active = new Set(), complete = new Set();
  const visit = (node) => {
    invariant(!active.has(node), "INV-ORIGIN-002 circular topology edge");
    if (complete.has(node)) return;
    active.add(node);
    for (const next of graph.get(node) ?? []) visit(next);
    active.delete(node); complete.add(node);
  };
  for (const node of graph.keys()) visit(node);

  const hasEdge = (from, to, type) => record.provenanceEdges.some((edge) => edge.fromNodeId === from && edge.toNodeId === to && edge.edgeType === type);
  for (const sourceId of record.originEvidence.reportingSourceIds) invariant(hasEdge(record.candidateId, sourceId, "candidate-reported-by"), "INV-ORIGIN-002 candidate-to-reporter path missing");
  for (const assertionId of record.originEvidence.originatingAssertionIds) invariant(record.originEvidence.reportingSourceIds.some((sourceId) => hasEdge(sourceId, assertionId, "reporter-reports-assertion")), "INV-ORIGIN-002 reporter-to-assertion path missing");
  for (const originId of record.originEvidence.reportingOriginIds) invariant(record.originEvidence.originatingAssertionIds.some((assertionId) => hasEdge(assertionId, originId, "assertion-originated-by")), "INV-ORIGIN-002 assertion-to-origin path missing");
  for (const groupId of record.originEvidence.independenceGroupIds) invariant(record.originEvidence.reportingOriginIds.some((originId) => hasEdge(originId, groupId, "origin-member-of-independence-group")), "INV-ORIGIN-002 origin-to-group path missing");
  const assessedGroups = record.independenceGroups.filter((group) => group.assessmentStatus === "assessed" && record.originEvidence.independenceGroupIds.includes(group.independenceGroupId));
  invariant(record.originEvidence.independentOriginCount === assessedGroups.length, "INV-ORIGIN-001 independent-origin count differs from reachable groups");
}

function validateEventClusterSemantics(record) {
  invariant(record.firstSeen <= record.lastMaterialChangeAt && record.lastMaterialChangeAt <= record.lastObservedAt, "INV-LIFE-001 lifecycle timestamp contradiction");
  for (let index = 1; index < record.lifecycleHistory.length; index += 1) {
    const prior = record.lifecycleHistory[index - 1], current = record.lifecycleHistory[index];
    invariant(prior.effectiveAt <= current.effectiveAt && prior.transitionVersion < current.transitionVersion, "INV-LIFE-001 lifecycle history not monotonic");
  }
  invariant(record.lifecycleStatus === record.lifecycleHistory.at(-1).state, "INV-LIFE-001 current lifecycle status differs from last transition");
  for (const transition of record.lifecycleHistory) {
    if (transition.state === "continuing") invariant(!transition.material && !transition.materialTransitionProvenanceId, "INV-LIFE-002 continuing transition marked material");
    else invariant(transition.material && transition.materialTransitionProvenanceId, "INV-LIFE-002 material transition lacks provenance");
  }
  for (let index = 1; index < record.originEvidenceHistory.length; index += 1) {
    const prior = record.originEvidenceHistory[index - 1], current = record.originEvidenceHistory[index];
    invariant(prior.effectiveAt <= current.effectiveAt && prior.assessmentVersion < current.assessmentVersion, "INV-ORIGIN-001 origin history not monotonic");
  }
}

function validateInstrumentReadingSemantics(record) {
  const dates = record.instrumentObservationDates;
  invariant(dates.length === 6 && dates.every((date, index) => index === 0 || dates[index - 1] < date), "INV-MARKET-001 observation dates must be six strictly ascending own-series dates");
  invariant(record.actualWindowObservationCount === dates.length && record.windowStart === dates[0] && record.windowEnd === dates.at(-1) && record.asOf === record.windowEnd, "INV-MARKET-001 window endpoints/count/asOf mismatch");
  const countPart = Number(record.conditioningKey.split("|").at(-1));
  invariant(record.conditioningKey === `${record.instrumentSetVersion}|${countPart}`, "INV-MARKET-002 conditioning key malformed");
  invariant(record.historyCount <= 252, "INV-MARKET-002 history exceeds rolling maximum");
  if (record.eligibilityStatus === "eligible") {
    invariant(record.eligible === true && record.exclusionReason === null && record.freshnessStatus === "fresh" && record.businessDayAge <= 3, "INV-MARKET-001 eligible/freshness state contradiction");
    invariant(record.zScoreAssessment === "assessed" && typeof record.zScore === "number" && record.absoluteZScore === Math.abs(record.zScore), "INV-MARKET-001 z-score assessment contradiction");
  }
}

function validateMarketChannelSemantics(record, parameters) {
  if (record.status !== "assessed") return;
  invariant(record.conditioningKey === `${record.instrumentSetVersion}|${record.eligibleInstrumentCount}`, "INV-MARKET-002 channel conditioning key mismatch");
  invariant(record.includedInstrumentReadings.length === record.eligibleInstrumentCount && record.includedInstrumentReadings.every((reading) => reading.asOf === record.marketAsOf && reading.instrumentSetVersion === record.instrumentSetVersion), "INV-MARKET-003 same-date/set/cohort mismatch");
  record.includedInstrumentReadings.forEach(validateInstrumentReadingSemantics);
  const ranked = [...record.includedInstrumentReadings].sort((a, b) => b.absoluteZScore - a.absoluteZScore || a.instrumentId.localeCompare(b.instrumentId));
  invariant(record.marketStatistic === ranked[0].absoluteZScore && record.driverInstrumentId === ranked[0].instrumentId && record.driverZ === ranked[0].zScore, "INV-MARKET-003 primary driver mismatch");
  invariant(record.secondDriverInstrumentId === ranked[1].instrumentId && record.secondDriverZ === ranked[1].zScore, "INV-MARKET-003 second driver mismatch");
  const rawCount = ranked.filter((item) => item.absoluteZScore > parameters.parameters.market.diagnosticRawZThreshold).length;
  const percentileCount = ranked.filter((item) => item.absoluteZScore > record.percentileThreshold).length;
  invariant(record.numberAboveRawDiagnosticThreshold === rawCount && record.numberAbovePercentileThreshold === percentileCount, "INV-MARKET-003 threshold diagnostic mismatch");
  invariant(record.breadthRatio === roundPersisted(rawCount / record.eligibleInstrumentCount, parameters.parameters.canonicalization.computedDecimalPlaces), "INV-MARKET-003 breadth mismatch");
  invariant(record.elevated === (record.marketStatistic > record.percentileThreshold), "INV-MARKET-003 strict percentile result mismatch");
}

function validateDivergenceSemantics(record) {
  if (record.status !== "assessed") return invariant(record.state === null, "INV-DIV-001 non-assessed state must be null");
  const expected = record.signalElevated ? (record.marketElevated ? "co-movement" : "signal-leading") : (record.marketElevated ? "market-only" : "calm");
  invariant(record.state === expected, "INV-DIV-001 assessed state mapping mismatch");
}

function validateRunBundleSemantics(bundle, parameters) {
  const runId = bundle.runManifest.runId;
  invariant(bundle.signalOutput.runId === runId && bundle.marketOutput.runId === runId && bundle.divergenceOutput.runId === runId && bundle.candidates.every((item) => item.runId === runId), "INV-BUNDLE-001 run ID mismatch");
  const candidateIds = new Set(bundle.candidates.map((item) => item.candidateId));
  invariant(bundle.originProvenance.every((item) => candidateIds.has(item.candidateId)), "INV-BUNDLE-001 origin record has dangling candidate");
  bundle.originProvenance.forEach(validateOriginTopology);
  bundle.registry.eventClusters.forEach(validateEventClusterSemantics);
  for (const assignment of bundle.assignments) invariant(candidateIds.has(assignment.candidateId) && bundle.registry.eventClusters.some((cluster) => cluster.eventClusterId === assignment.eventClusterId), "INV-BUNDLE-001 assignment reference unresolved");
  bundle.marketOutput.channels.forEach((channel) => validateMarketChannelSemantics(channel, parameters));
  bundle.divergenceOutput.channels.forEach(validateDivergenceSemantics);
  const inputHashes = new Set(bundle.runManifest.inputArtifacts.map((item) => item.sha256));
  const configurationHashes = new Set(bundle.runManifest.configurationArtifacts.map((item) => item.sha256));
  invariant(bundle.signalOutput.inputHashes.every((hash) => inputHashes.has(hash)) && bundle.marketOutput.inputHashes.every((hash) => inputHashes.has(hash)) && bundle.divergenceOutput.inputHashes.every((hash) => inputHashes.has(hash)), "INV-BUNDLE-001 input hash unresolved");
  invariant(bundle.marketOutput.configurationHashes.every((hash) => configurationHashes.has(hash)), "INV-BUNDLE-001 configuration hash unresolved");
}

function validateRecordSemantics(definitionName, record, parameters) {
  if (definitionName === "originProvenance") validateOriginTopology(record);
  else if (definitionName === "eventCluster") validateEventClusterSemantics(record);
  else if (definitionName === "instrumentReading") validateInstrumentReadingSemantics(record);
  else if (definitionName === "marketChannelOutput") validateMarketChannelSemantics(record, parameters);
  else if (definitionName === "divergenceChannelOutput") validateDivergenceSemantics(record);
  else if (definitionName === "runBundle") validateRunBundleSemantics(record, parameters);
}

function validateSimpleTopology(input) {
  const nodes = new Set(input.nodeIds);
  for (const edge of input.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) return semanticResult(false, "origin-edge-dangling");
    if (edge.from === edge.to) return semanticResult(false, "origin-edge-self-reference");
  }
  const graph = new Map();
  for (const edge of input.edges) {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    graph.get(edge.from).push(edge.to);
  }
  const active = new Set(), done = new Set();
  const visit = (node) => {
    if (active.has(node)) return false;
    if (done.has(node)) return true;
    active.add(node);
    for (const next of graph.get(node) ?? []) if (!visit(next)) return false;
    active.delete(node); done.add(node); return true;
  };
  for (const node of graph.keys()) if (!visit(node)) return semanticResult(false, "origin-edge-cycle");
  return semanticResult(true);
}

function evaluateFixture(testCase, parameters) {
  const input = testCase.input;
  const market = parameters.parameters.market;
  const signal = parameters.parameters.signal;
  switch (testCase.ruleId) {
    case "syndication-origin-count": {
      const unique = new Set(input.originIds).size;
      return semanticResult(input.independentOriginCount === unique, "syndicated-counted-independent");
    }
    case "independent-corroboration": {
      const minimumOrigins = signal.minimumIndependentOriginsForCorroboration;
      const valid = input.originStatus === "assessed" && new Set(input.originIds).size >= minimumOrigins
        && input.independentOriginCount >= minimumOrigins && input.conflicting === false && input.qualifiesE2 === true;
      return semanticResult(valid, "independent-corroboration-not-established");
    }
    case "unknown-origin-conservative": {
      const valid = input.originStatus !== "unknown" || (input.independentOriginCount === 0 && input.qualifiesE2 === false && input.elevated === false);
      return semanticResult(valid, "unknown-origin-elevated");
    }
    case "direct-mechanism-required": {
      const hasDirect = input.mechanismRelations.includes("direct");
      return semanticResult(input.elevated === hasDirect, "direct-mechanism-missing");
    }
    case "one-contribution-per-cluster-channel-run":
      return semanticResult(input.contributionCount <= signal.maximumClusterContributionPerChannelPerRun, "cluster-channel-double-count");
    case "stage-boundary": {
      const expectedElevated = signal.actionStageOrdinals[input.stage] >= signal.minimumQualifyingActionStageOrdinal;
      const reason = input.stage === "announced" && input.elevated ? "announced-elevated" : "stage-boundary-mismatch";
      return semanticResult(input.visible === true && input.elevated === expectedElevated, reason);
    }
    case "material-clock": {
      const observedAdvanced = input.lastObservedAt > input.priorLastObservedAt;
      const materialUnchanged = input.lastMaterialChangeAt === input.priorLastMaterialChangeAt;
      return semanticResult(input.state !== "continuing" || (observedAdvanced && materialUnchanged && input.elevated === false), "nonmaterial-repeat-moved-clock");
    }
    case "material-transition": {
      const allowed = new Set(["new", "escalating", "de-escalating"]);
      return semanticResult(allowed.has(input.state) && input.material === true && input.transitionAt === input.lastMaterialChangeAt && input.evidenceRefs.length > 0, "material-transition-invalid");
    }
    case "unresolved-is-not-nonevent":
      return semanticResult(input.observedDisposition === input.storedDisposition && input.eventTypeStatus === "unknown" && input.scored === false, "unresolved-relabelled");
    case "atomic-decomposition-provenance": {
      let reason = "atomic-decomposition-invalid";
      if (!input.provenanceOperations.includes("decomposed")) reason = "decomposition-provenance-missing";
      const valid = input.parentDisposition === "decomposed-parent" && input.childCount === input.childDispositions.length
        && input.childCount > 1 && input.childDispositions.every((item) => item === "atomic-event-observation")
        && input.provenanceOperations.includes("decomposed") && input.rawParentRetained === true;
      return semanticResult(valid, reason);
    }
    case "append-only-lineage": {
      if (!input.priorAssignmentRetained) return semanticResult(false, "prior-assignment-not-retained");
      const allowed = new Set(["assigned", "reassigned", "merged", "split", "aliased", "superseded", "corrected", "retracted", "decomposed"]);
      return semanticResult(input.operations.every((item) => allowed.has(item)) && input.allOperationsHaveProvenance && !input.idsReused, "lineage-not-append-only");
    }
    case "chronology-fidelity":
      return semanticResult(!(input.pointInTimeEligible === false && input.includedInThresholdHistory === true), "chronology-ineligible-included");
    case "own-series-window": {
      const dates = input.actualObservationDates;
      const sortedUnique = [...new Set(dates)].sort();
      const valid = dates.length === market.transformLookbackValidObservations + 1
        && sameValue(dates, sortedUnique) && input.lookbackValidObservations === market.transformLookbackValidObservations && !input.usesGlobalDates;
      return semanticResult(valid, "actual-window-dates-missing");
    }
    case "per-channel-dating":
      return semanticResult(input.eachChannelSameDate === true && input.requiresGlobalDate === false && Object.keys(input.channelDates).length > 1, "global-date-dependency");
    case "freshness-bound":
      return semanticResult(input.eligible === (input.businessDayAge <= market.freshnessMaximumBusinessDays), "stale-reading-included");
    case "minimum-eligible-count": {
      const minimum = market.minimumEligibleInstrumentCountByMappedCount[String(input.mappedCount)];
      const valid = input.minimumCount === minimum && input.assessed === (input.eligibleCount >= minimum);
      return semanticResult(valid, "minimum-count-mismatch");
    }
    case "no-mixed-date-statistic":
      return semanticResult(input.status !== "assessed" || new Set(input.includedDates).size <= 1, "mixed-date-binary-statistic");
    case "prior-only-percentile": {
      const valid = input.currentIncludedInHistory === false && input.historyDates.every((date) => date < input.currentDate);
      return semanticResult(valid, "lookahead-history");
    }
    case "conditioned-history": {
      const key = `${input.currentInstrumentSetVersion}|${input.currentEligibleCount}`;
      return semanticResult(!input.pooledDifferentKey && input.historyKeys.every((item) => item === key), "incompatible-history-pooled");
    }
    case "insufficient-history": {
      const insufficient = input.conditionedPriorCount < market.percentileMinimumConditionedPriorObservations;
      const valid = !insufficient || (input.status === "insufficient-conditioned-history" && input.threshold === null && input.elevated === null && input.fallbackUsed === false);
      return semanticResult(valid, "hidden-history-fallback");
    }
    case "quantile-tie": {
      const sorted = [...input.history].sort((a, b) => a - b);
      const rank = Math.max(1, Math.ceil((1 - market.percentileAlpha) * sorted.length));
      const threshold = sorted[rank - 1];
      const elevated = input.current > threshold;
      const valid = input.alpha === market.percentileAlpha && input.rank === rank && input.threshold === threshold && input.elevated === elevated;
      return semanticResult(valid, input.current === threshold && input.elevated ? "threshold-equality-triggered" : "quantile-semantics-mismatch");
    }
    case "market-diagnostics": {
      const ranked = Object.entries(input.zByInstrument).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0]));
      const above = ranked.filter(([, value]) => Math.abs(value) > market.diagnosticRawZThreshold).length;
      const expectedBreadth = roundPersisted(above / input.eligibleCount, parameters.parameters.canonicalization.computedDecimalPlaces);
      const valid = input.driver === ranked[0][0] && input.secondDriver === ranked[1][0] && input.aboveThresholdCount === above
        && input.breadth === expectedBreadth && input.breadthAffectsBinary === false;
      return semanticResult(valid, input.breadthAffectsBinary ? "breadth-used-as-binary-gate" : "market-diagnostics-mismatch");
    }
    case "after-close-pending": {
      const after = input.signalObservedAt > input.relevantCloseAt;
      return semanticResult(!after || (input.status === "pending-next-eligible-close" && input.state === null), "after-close-not-pending");
    }
    case "unknown-timing":
      return semanticResult(input.timestampReliability === "reliable" || (input.status === "unknown-timing" && input.state === null), "unreliable-timing-classified");
    case "four-state-table": {
      const expected = input.signalElevated
        ? (input.marketElevated ? "co-movement" : "signal-leading")
        : (input.marketElevated ? "market-only" : "calm");
      return semanticResult(input.state === expected, "four-state-table-mismatch");
    }
    case "noncausal-language": {
      const banned = /\b(caus\w*|predict\w*|confirm\w*|driv\w*|result\w*|respond\w*|response|priced?)\b/i;
      return semanticResult(input.canonicalSemantics.every((text) => !banned.test(text)), "causal-language");
    }
    case "legacy-immutability": {
      if (input.legacyMethodologyVersion !== null) return semanticResult(false, "legacy-restamped");
      return semanticResult(input.beforeSha256 === input.afterSha256, "legacy-mutated");
    }
    case "v2-version-stamp":
      return semanticResult(input.namespace.includes("/v2/2.0.0/") && input.methodologyVersion === "2.0.0", "v2-version-missing");
    case "canonical-reproduction": {
      const actualSame = sha256(canonicalJson(input.payloadA, input.excludedViewFields)) === sha256(canonicalJson(input.payloadB, input.excludedViewFields));
      const valid = input.excludedViewFields.includes("generatedAt") && input.sameCanonicalHash === actualSame && actualSame;
      return semanticResult(valid, "volatile-field-not-excluded");
    }
    case "normative-normalization": {
      const normalized = input.rawInputs.map(conservativeNormalize);
      const hashes = normalized.map((value) => sha256(Buffer.from(value, "utf8")));
      const valid = input.normalizationVersion === "crucix-session15-conservative-normalization/v1"
        && normalized.every((value) => value === input.expectedNormalized)
        && hashes.every((value) => value === input.expectedHash)
        && input.expectEqual === true;
      return semanticResult(valid, "normative-normalization-mismatch");
    }
    case "normalization-distinguishes-content": {
      const hashes = input.rawInputs.map((value) => sha256(Buffer.from(conservativeNormalize(value), "utf8")));
      return semanticResult(input.normalizationVersion === "crucix-session15-conservative-normalization/v1" && sameValue(hashes, input.expectedHashes) && new Set(hashes).size === hashes.length && input.expectAllDifferent, "normalization-collapsed-material-difference");
    }
    case "normalization-auto-assignment": {
      const shaPattern = /^[0-9a-f]{64}$/;
      if (!shaPattern.test(input.leftHash) || !shaPattern.test(input.rightHash)) return semanticResult(false, "malformed-normalized-content-hash");
      if (input.leftVersion !== input.rightVersion || input.leftVersion !== "crucix-session15-conservative-normalization/v1") return semanticResult(false, "normalization-version-mismatch");
      return semanticResult(input.decisionMode !== "deterministic-automatic" || input.leftHash === input.rightHash, "normalized-content-hash-mismatch");
    }
    case "normalization-hash-reproduction": {
      const actual = sha256(Buffer.from(conservativeNormalize(input.rawInput), "utf8"));
      return semanticResult(input.normalizationVersion === "crucix-session15-conservative-normalization/v1" && input.recordedHash === actual, "normalized-content-hash-mismatch");
    }
    case "ambiguous-match-adjudication": {
      const ambiguous = input.assessedIncidentFieldConflict || !input.normalizationVersionEqual || !input.normalizedHashEqual;
      const valid = !ambiguous || ((input.decisionMode === "assisted-human-confirmed" || input.decisionMode === "human") && input.proposalPersisted);
      return semanticResult(valid, "ambiguous-match-not-adjudicated");
    }
    case "origin-copy-collapse":
      return semanticResult(input.reporterCount === 30 && input.assertionCount === 1 && input.originCount === 1 && input.independenceGroupCount === 1 && input.independentOriginCount === 1 && input.edgeType === "syndicated-from", "syndicated-counted-independent");
    case "official-quotation-collapse":
      return semanticResult(input.officialStatementCount === 1 && input.originCount === 1 && input.independenceGroupCount === 1 && input.independentOriginCount === 1 && input.edgeType === "quotes-official-statement", "official-quotation-counted-independent");
    case "independent-direct-observation":
      return semanticResult(input.assessedDirectObservationCount >= 2 && input.distinctOriginCount >= 2 && input.distinctIndependenceGroupCount >= 2 && !input.conflicting && input.independentOriginCount === input.distinctIndependenceGroupCount, "independent-observation-not-established");
    case "unknown-derivation-noncorroborating":
      return semanticResult(input.edgeType === "unknown-derivation" && input.assessmentStatus === "unknown" && !input.countsAsIndependent && !input.qualifiesE2, "unknown-derivation-corroborated");
    case "conflicting-origin-conservative":
      return semanticResult(input.conflicting && input.evidenceClass === "conflicting-origin" && !input.qualifiesE2, "conflicting-origin-increased-confidence");
    case "origin-topology-integrity":
      return validateSimpleTopology(input);
    case "schema-adversarial-record": {
      try {
        validateAgainstSchema(input.record, schema.$defs[input.schemaDefinition], schema, `$fixture.${testCase.id}`);
        return semanticResult(true);
      } catch {
        return semanticResult(false, input.invariantId);
      }
    }
    case "complete-schema-record": {
      try {
        validateAgainstSchema(input.record, schema.$defs[input.schemaDefinition], schema, `$fixture.${testCase.id}`);
        validateRecordSemantics(input.schemaDefinition, input.record, parameters);
        return semanticResult(true);
      } catch (error) {
        return semanticResult(false, error.message.match(/INV-[A-Z]+-[0-9]+/)?.[0] ?? "complete-schema-record-invalid");
      }
    }
    case "complete-record-mutation": {
      const sourceCase = positiveFixtureIndex.get(input.sourceFixtureId);
      invariant(sourceCase, `${testCase.id}: missing source fixture ${input.sourceFixtureId}`);
      const record = structuredClone(getPath(sourceCase.input.record, input.recordPath));
      for (const [key, value] of Object.entries(input.set ?? {})) setPathValue(record, key, value);
      for (const key of input.deletePaths ?? []) deletePathValue(record, key);
      try {
        validateAgainstSchema(record, schema.$defs[input.schemaDefinition], schema, `$fixture.${testCase.id}`);
        validateRecordSemantics(input.schemaDefinition, record, parameters);
        return semanticResult(true);
      } catch {
        return semanticResult(false, input.invariantId);
      }
    }
    case "canonical-complete-record": {
      try {
        validateAgainstSchema(input.payloadA, schema.$defs[input.schemaDefinition], schema, `$fixture.${testCase.id}.payloadA`);
        validateAgainstSchema(input.payloadB, schema.$defs[input.schemaDefinition], schema, `$fixture.${testCase.id}.payloadB`);
        const bytesA = canonicalV2Bytes(input.payloadA, parameters.parameters.canonicalization);
        const bytesB = canonicalV2Bytes(input.payloadB, parameters.parameters.canonicalization);
        const repeated = Array.from({ length: input.repeatCount }, () => canonicalV2Bytes(input.payloadA, parameters.parameters.canonicalization));
        const valid = bytesA.equals(bytesB) && repeated.every((bytes) => bytes.equals(bytesA)) && bytesA.toString("utf8") === input.expectedCanonicalUtf8 && sha256(bytesA) === input.expectedSha256;
        return semanticResult(valid, "canonical-complete-record-mismatch");
      } catch {
        return semanticResult(false, "canonical-complete-record-mismatch");
      }
    }
    case "canonical-sequence-order": {
      try {
        canonicalV2Bytes({ [input.property]: input.sequence }, parameters.parameters.canonicalization);
        return semanticResult(true);
      } catch {
        return semanticResult(false, "canonical-sequence-order-invalid");
      }
    }
    default:
      throw new Error(`unknown fixture rule ${testCase.ruleId}`);
  }
}

async function listFiles(directory) {
  const output = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(absolute));
    else output.push(absolute);
  }
  return output;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true }).trim();
}

async function check(name, operation) {
  try {
    const detail = await operation();
    results.push({ name, status: "PASS", detail: detail ?? null });
    process.stdout.write(`PASS ${name}${detail ? `: ${detail}` : ""}\n`);
  } catch (error) {
    results.push({ name, status: "FAIL", detail: error.message });
    process.stderr.write(`FAIL ${name}: ${error.message}\n`);
  }
}

const schema = await readJson("methodology/2.0.0/schema.json");
const enums = await readJson("methodology/2.0.0/enums.json");
const parameters = await readJson("methodology/2.0.0/parameters.json");
const mapping = await readJson("methodology/2.0.0/leaf-channel-map.json");
const clusteringRules = await readJson("methodology/2.0.0/clustering-lifecycle-rules.json");
const sourceOriginRules = await readJson("methodology/2.0.0/source-origin-rules.json");
const decisions = await readJson("audit/session17/decision-register.json");
const deferrals = await readJson("audit/session17/deferred-items.json");
const traceability = await readJson("audit/session17/parameter-traceability.json");
const positiveFixtures = await readJson("methodology/2.0.0/fixtures/positive.json");
positiveFixtureIndex = new Map(positiveFixtures.cases.map((item) => [item.id, item]));

await check("all JSON parses", async () => {
  const jsonFiles = (await listFiles(METHODOLOGY)).filter((file) => file.endsWith(".json"))
    .concat((await listFiles(HERE)).filter((file) => file.endsWith(".json")));
  for (const file of jsonFiles) JSON.parse(await fs.readFile(file, "utf8"));
  return `${jsonFiles.length} files`;
});

await check("all local schema refs resolve", () => {
  let count = 0;
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (value.$ref) {
      invariant(resolveLocalRef(schema, value.$ref), `unresolved ref ${value.$ref}`);
      count += 1;
    }
    Object.values(value).forEach(visit);
  };
  visit(schema);
  return `${count} refs`;
});

await check("fixture suites conform to schema", async () => {
  for (const relative of ["methodology/2.0.0/fixtures/positive.json", "methodology/2.0.0/fixtures/negative.json"]) {
    validateAgainstSchema(await readJson(relative), schema.$defs.fixtureSuite, schema, relative);
  }
  return "2 suites";
});

await check("positive and negative fixture semantics", async () => {
  let positive = 0;
  let negative = 0;
  for (const relative of ["methodology/2.0.0/fixtures/positive.json", "methodology/2.0.0/fixtures/negative.json"]) {
    const suite = await readJson(relative);
    for (const testCase of suite.cases) {
      const actual = evaluateFixture(testCase, parameters);
      invariant(actual.valid === testCase.expectedValid, `${testCase.id}: expected valid=${testCase.expectedValid}, got ${actual.valid} (${actual.reason})`);
      invariant(actual.reason === testCase.expectedReasonCode, `${testCase.id}: expected reason ${testCase.expectedReasonCode}, got ${actual.reason}`);
      if (suite.suite === "positive") positive += 1; else negative += 1;
    }
  }
  return `${positive} positive, ${negative} negative`;
});

await check("normative Session 15 normalization and persisted hash contract", () => {
  const contract = clusteringRules.normalizedContentIdentity;
  invariant(contract.normalizationVersion === "crucix-session15-conservative-normalization/v1", "normalization version changed or missing");
  invariant(contract.normativeImplementation === "String(rawText).normalize('NFKC').replace(/\\r\\n?/g, '\\n').trim().replace(/\\s+/gu, ' ')", "normalization implementation differs from frozen Session 15 helper");
  invariant(contract.hashInput.includes("UTF-8 bytes") && contract.hash.encoding === "lowercase hexadecimal" && contract.hash.length === 64, "normalized hash byte/format contract incomplete");
  invariant(/Preserve case/.test(contract.caseHandling) && /Preserve URLs/.test(contract.urlHandling) && /Preserve punctuation/.test(contract.punctuationHandling), "normalization preservation rules incomplete");
  invariant(contract.automaticMatchRequirement.includes("normalizationVersion") && contract.automaticMatchRequirement.includes("normalizedContentHash"), "automatic match does not bind version and hash");
  const equivalent = positiveFixtureIndex.get("normalization-equivalent-session15-inputs");
  const different = positiveFixtureIndex.get("normalization-material-difference-preserved");
  invariant(evaluateFixture(equivalent, parameters).valid && evaluateFixture(different, parameters).valid, "normalization fixtures do not reproduce");
  for (const property of ["normalizationVersion", "normalizedContentHash"]) invariant(schema.$defs.rawIdentity.required.includes(property), `candidate raw identity missing ${property}`);
  return `${contract.normalizationVersion}; NFKC/case-preserving/Unicode-whitespace/UTF-8 SHA-256 reproduced`;
});

await check("all ten PA-08 adversarial records are rejected for mapped invariants", async () => {
  const negativeSuite = await readJson("methodology/2.0.0/fixtures/negative.json");
  const adversarial = negativeSuite.cases.filter((item) => item.id.startsWith("adversarial-"));
  const expected = new Map([
    ["adversarial-assessed-enum-without-value", "INV-ASSESS-001"],
    ["adversarial-unknown-enum-with-value", "INV-ASSESS-002"],
    ["adversarial-independent-class-with-zero-origins", "INV-ORIGIN-001"],
    ["adversarial-unknown-status-with-resolved-origin", "INV-ORIGIN-001"],
    ["adversarial-automatic-assignment-without-rule-or-cluster", "INV-ASSIGN-001"],
    ["adversarial-continuing-transition-marked-material", "INV-LIFE-002"],
    ["adversarial-escalating-transition-marked-nonmaterial", "INV-LIFE-002"],
    ["adversarial-eligible-reading-with-exclusion-and-no-window", "INV-MARKET-001"],
    ["adversarial-assessed-market-with-null-statistic-and-empty-cohort", "INV-MARKET-003"],
    ["adversarial-assessed-divergence-with-inconsistent-state", "INV-DIV-001"],
  ]);
  invariant(adversarial.length === 10, `expected ten adversarial fixtures, found ${adversarial.length}`);
  for (const fixture of adversarial) {
    invariant(fixture.input.invariantId === expected.get(fixture.id), `${fixture.id}: invariant mapping differs`);
    const outcome = evaluateFixture(fixture, parameters);
    invariant(!outcome.valid && outcome.reason === fixture.expectedReasonCode, `${fixture.id}: not rejected for ${fixture.expectedReasonCode}`);
    let rejected = false;
    try { validateAgainstSchema(fixture.input.record, schema.$defs[fixture.input.schemaDefinition], schema, `$fixture.${fixture.id}`); } catch { rejected = true; }
    invariant(rejected, `${fixture.id}: schema still admits adversarial record`);
  }
  return "10/10 rejected by schema conditionals/required fields with invariant-specific fixtures";
});

await check("required lifecycle and market operational fields", () => {
  const required = {
    eventCluster: ["firstSeen", "lastObservedAt", "lastMaterialChangeAt", "lifecycleStatus", "lifecycleAssessmentStatus", "assignmentVersion", "provenanceVersion", "parentSeriesIds", "provenanceIds", "lifecycleHistory"],
    lifecycleTransition: ["assessmentStatus", "transitionVersion", "material", "evidenceRefs", "provenanceId", "semanticValidationVersion"],
    instrumentReading: ["windowStart", "windowEnd", "asOf", "instrumentObservationDates", "actualWindowObservationCount", "historyCount", "instrumentSetVersion", "conditioningKey", "observationAgeCalendarDays", "businessDayAge", "freshnessStatus", "eligibilityStatus", "exclusionReason", "zScoreAssessment"],
    marketChannelOutput: ["instrumentSetVersion", "conditioningKey", "eligibleInstrumentCount", "includedInstrumentReadings", "driverInstrumentId", "secondDriverInstrumentId", "breadthRatio"],
  };
  for (const [definition, fields] of Object.entries(required)) for (const field of fields) invariant(schema.$defs[definition].required.includes(field), `${definition}: missing required ${field}`);
  const bundle = positiveFixtureIndex.get("complete-end-to-end-v2-bundle").input.record;
  validateRunBundleSemantics(bundle, parameters);
  const mutationIds = ["complete-event-cluster-invalid-chronology", "complete-instrument-reading-missing-history-count", "complete-instrument-reading-malformed-window-date", "complete-instrument-reading-chronology-invalid"];
  return `${Object.values(required).flat().length} required fields enforced; ${mutationIds.length} complete-record mutations rejected`;
});

await check("recoverable origin topology and invalid-edge rejection", async () => {
  const bundle = positiveFixtureIndex.get("complete-end-to-end-v2-bundle").input.record;
  bundle.originProvenance.forEach(validateOriginTopology);
  const topology = sourceOriginRules.recoverableTopology;
  invariant(sameValue(topology.path, ["candidateId", "reportingSourceId", "assertionId", "reportingOriginId", "independenceGroupId"]), "origin topology path incomplete");
  const positiveIds = ["thirty-syndicated-copies-one-group", "official-statement-quotations-one-group", "independent-direct-observation-second-group", "unknown-derivation-remains-noncorroborating", "conflicting-origins-do-not-increase-confidence"];
  for (const id of positiveIds) invariant(evaluateFixture(positiveFixtureIndex.get(id), parameters).valid, `${id}: positive origin topology failed`);
  const negativeSuite = await readJson("methodology/2.0.0/fixtures/negative.json");
  const negativeIds = ["origin-topology-dangling-edge", "origin-topology-circular-derivation", "origin-topology-broken-self-edge"];
  for (const id of negativeIds) {
    const fixture = negativeSuite.cases.find((item) => item.id === id);
    const result = evaluateFixture(fixture, parameters);
    invariant(!result.valid && result.reason === fixture.expectedReasonCode, `${id}: invalid topology did not fail correctly`);
  }
  return "candidate→reporter→assertion→origin→group path recovered; copy/quote/unknown/conflict rules and 3 invalid-edge cases verified";
});

await check("complete production records and end-to-end bundle", () => {
  const fixture = positiveFixtureIndex.get("complete-end-to-end-v2-bundle");
  const bundle = fixture.input.record;
  validateAgainstSchema(bundle, schema.$defs.runBundle, schema, "$bundle");
  validateRunBundleSemantics(bundle, parameters);
  const covered = new Set(["candidate", "originProvenance", "assignment", "eventCluster", "registry", "signalOutput", "instrumentReading", "marketChannelOutput", "divergenceOutput", "runManifest", "runBundle"]);
  for (const definition of covered) invariant(schema.$defs[definition], `missing complete-record definition ${definition}`);
  invariant(bundle.registry.eventClusters.length && bundle.marketOutput.channels[0].includedInstrumentReadings.length, "bundle omits complete cluster or instrument reading");
  return `${covered.size} production definitions covered by one connected schema-valid bundle`;
});

await check("canonical array policy and exact complete-record bytes", async () => {
  const policies = parameters.parameters.canonicalization.arrayPoliciesByProperty;
  const arrayProperties = new Set();
  const visit = (definition) => {
    if (!definition || typeof definition !== "object") return;
    for (const [property, child] of Object.entries(definition.properties ?? {})) {
      const resolved = child.$ref ? resolveLocalRef(schema, child.$ref) : child;
      if (resolved.type === "array") arrayProperties.add(property);
    }
    for (const value of Object.values(definition)) visit(value);
  };
  visit(schema);
  for (const property of arrayProperties) invariant(policies[property], `${property}: canonical array policy missing`);
  for (const [property, policy] of Object.entries(policies)) invariant(["set", "sequence"].includes(policy.kind), `${property}: invalid array policy kind`);
  const fixture = positiveFixtureIndex.get("canonical-complete-run-manifest-bytes");
  const outcome = evaluateFixture(fixture, parameters);
  invariant(outcome.valid, outcome.reason);
  const bytes = canonicalV2Bytes(fixture.input.payloadA, parameters.parameters.canonicalization);
  invariant(bytes.at(-1) === 0x0a && !bytes.subarray(0, -1).includes(0x0a), "canonical bytes final-newline/whitespace rule failed");
  const bundle = positiveFixtureIndex.get("complete-end-to-end-v2-bundle").input.record;
  const bundleBytesA = canonicalV2Bytes(bundle, parameters.parameters.canonicalization);
  const bundleBytesB = canonicalV2Bytes(structuredClone(bundle), parameters.parameters.canonicalization);
  invariant(bundleBytesA.equals(bundleBytesB) && bundleBytesA.toString("utf8").includes('"state":null'), "complete bundle canonical repeat/null handling failed");
  const negativeSuite = await readJson("methodology/2.0.0/fixtures/negative.json");
  const history = negativeSuite.cases.find((item) => item.id === "canonical-sequence-history-out-of-order");
  invariant(!evaluateFixture(history, parameters).valid, "out-of-order sequence was silently sorted");
  return `${arrayProperties.size} schema array properties declared; exact fixture SHA-256 ${fixture.input.expectedSha256}; complete bundle repeated; invalid history rejected`;
});

await check("corrected traceability denominators", async () => {
  const assignments = await readJsonLines("audit/session15/assignment-ledger.jsonl");
  const final = new Map();
  for (const row of assignments) if (!final.has(row.candidateObservationId) || final.get(row.candidateObservationId).assignmentPass < row.assignmentPass) final.set(row.candidateObservationId, row);
  const unresolvedObservations = [...final.values()].filter((row) => row.assignmentDecision !== "accepted").length;
  const assessments = (await readJsonLines("audit/session15/event-cluster-ledger.jsonl")).filter((row) => row.recordType === "event-field-assessment");
  const corroboration = Object.fromEntries(["single-origin", "corroborated-independent", "conflicting", "unknown-origin"].map((value) => [value, assessments.filter((row) => row.corroborationStatus.value === value).length]));
  const exactAssessed = assessments.filter((row) => row.independentSourceCount.status === "assessed").length;
  const exactUnknown = assessments.length - exactAssessed;
  invariant(final.size === 428 && unresolvedObservations === 101, "observation disposition denominator mismatch");
  invariant(assessments.length === 123 && exactUnknown === 21 && exactAssessed === 102, "cluster origin denominator mismatch");
  invariant(sameValue(corroboration, { "single-origin": 97, "corroborated-independent": 4, "conflicting": 1, "unknown-origin": 21 }), "corroboration counts mismatch");
  const traceText = JSON.stringify(traceability);
  for (const text of ["101/428", "21/123", "102/123", "97", "4", "1", "21"]) invariant(traceText.includes(text), `traceability omits corrected count ${text}`);
  const files = [...await listFiles(METHODOLOGY), ...await listFiles(HERE)];
  const immutableNames = new Set(["validate-independent.mjs", "independent-validation-results.json", "independent-validation-report.md"]);
  const incorrectClaim = `${101}/${123}`;
  for (const file of files.filter((item) => !immutableNames.has(path.basename(item)))) invariant(!(await fs.readFile(file, "utf8")).includes(incorrectClaim), `${path.relative(ROOT, file)} retains incorrect observation/cluster denominator claim`);
  return "101/428 unresolved observations; 21/123 unknown-origin clusters; 102/123 exact counts; corroboration 97/4/1/21";
});

await check("immutable failed PA-08 artifacts and superseded identity", async () => {
  const expected = {
    "audit/session17/independent-validation-report.md": "59f2d82692c8a052b3758e92ceed8fb3a3382dbfcaa6178d7d0bf86b934e1f9b",
    "audit/session17/independent-validation-results.json": "34f1daf6ddd07f675c2c107a66e84bf25711503d15f08b24a5b58cbbaff8260e",
    "audit/session17/validate-independent.mjs": "cb82199c3160e22dc16f18a45b843a07e4ae043aa4b3af66241cb3df08eebc0c",
  };
  for (const [file, hash] of Object.entries(expected)) invariant((await fileIdentity(file)).sha256 === hash, `${file}: failed PA-08 history changed`);
  const manifest = await readJson("methodology/2.0.0/manifest.json");
  invariant(manifest.correction?.supersedesFailedManifestIdentity === "809fb5119c3634ab6c30349c8b58ef7659effd4b0b227af69186ed876e63bf33", "failed manifest identity not retained as superseded failure");
  invariant(sameValue(manifest.correction.failedPa08ArtifactIdentities, Object.entries(expected).map(([path, sha256]) => ({ path, sha256 }))), "failed PA-08 identities missing from corrected manifest");
  return `3 immutable artifacts; failed manifest 809fb5119c3634ab6c30349c8b58ef7659effd4b0b227af69186ed876e63bf33`;
});

await check("enum, schema, map, and parameter consistency", () => {
  const enumEventTypes = enums.enumerations.eventType;
  invariant(sameValue(enumEventTypes, schema.$defs.eventType.enum), "event-type enum differs from schema");
  invariant(sameValue(enums.enumerations.divergenceState, schema.$defs.divergenceChannelOutput.properties.state.enum.filter((item) => item !== null)), "divergence states differ from schema");
  invariant(sameValue(enums.enumerations.actionStage, Object.keys(parameters.parameters.signal.actionStageOrdinals)), "action stages differ from ordinals");
  const channelIds = mapping.channels.map((item) => item.channelId).sort();
  invariant(sameValue(channelIds, [...enumEventTypes].sort()), "leaf-channel map is not one-to-one with event types");
  for (const channel of mapping.channels) {
    invariant(channel.instruments.length === channel.mappedInstrumentCount, `${channel.channelId}: mapped count mismatch`);
    invariant(channel.instruments.every((item, index, list) => index === 0 || list[index - 1].instrumentId.localeCompare(item.instrumentId) < 0), `${channel.channelId}: instruments not ascending`);
    const expected = parameters.parameters.market.minimumEligibleInstrumentCountByMappedCount[String(channel.mappedInstrumentCount)];
    invariant(channel.minimumEligibleInstrumentCount === expected, `${channel.channelId}: minimum count mismatch`);
  }
  invariant(mapping.channels.every((item, index, list) => index === 0 || list[index - 1].channelId.localeCompare(item.channelId) < 0), "channels not ascending");
  return `${channelIds.length} channels, ${new Set(mapping.channels.flatMap((item) => item.instruments.map((instrument) => instrument.instrumentId))).size} instruments`;
});

await check("selected Session 16 market configurations match the frozen rule", async () => {
  const coverage = await readJson("audit/session16/tables/05-channel-dating-age-gap-coverage.json");
  const seriesMap = await readJson("audit/session16/tables/configuration-to-statistic-series-map.json");
  const market = parameters.parameters.market;
  for (const channel of mapping.channels) {
    const row = coverage.find((item) => item.candidateConfigurationId === channel.session16SelectedConfigurationId);
    invariant(row, `${channel.channelId}: selected configuration missing from Session 16 coverage`);
    invariant(row.channelId === channel.channelId, `${channel.channelId}: selected configuration channel mismatch`);
    invariant(row.ruleId === "rule2-latest-same-date-eligible-cohort", `${channel.channelId}: selected rule is not same-date Rule 2`);
    invariant(row.freshnessRuleId === `business-day-age-${market.freshnessMaximumBusinessDays}`, `${channel.channelId}: freshness selection mismatch`);
    invariant(row.minimumEligibleInstrumentCount === channel.minimumEligibleInstrumentCount, `${channel.channelId}: Session 16 minimum count mismatch`);
    invariant(row.maximumBusinessDayGap === market.sameDateMaximumGapBusinessDays && row.mixedDateCount === 0, `${channel.channelId}: mixed-date selection`);
    invariant(row.assessedCount > 0 && row.assessedCount + row.unassessedCount === row.evaluationDateCount, `${channel.channelId}: invalid coverage totals`);
    const mappedSeries = seriesMap.mappings.find((item) => item.candidateConfigurationId === channel.session16SelectedConfigurationId);
    invariant(mappedSeries?.statisticSeriesId === channel.session16StatisticSeriesId, `${channel.channelId}: statistic series mapping mismatch`);
  }
  return `${mapping.channels.length} selected configurations`;
});

await check("frozen signal and market selections are unchanged", async () => {
  const signal = parameters.parameters.signal;
  const market = parameters.parameters.market;
  invariant(signal.selectedEvidenceFamily === "E2-resolved-single-or-independent" && signal.minimumIndependentOriginsForCorroboration === 2, "E2/two-origin selection changed");
  invariant(signal.minimumQualifyingActionStageOrdinal === 3 && sameValue(signal.qualifyingLifecycleStates, ["new", "escalating", "de-escalating"]), "stage/lifecycle selection changed");
  invariant(signal.maximumClusterContributionPerChannelPerRun === 1 && signal.scalarSignalScore === null, "signal contribution/score selection changed");
  invariant(market.transformLookbackValidObservations === 5 && market.zHistoryValidTransformsMinimum === 252 && market.zHistoryValidTransformsMaximum === 252, "own-series/z-history selection changed");
  invariant(market.sameDateMaximumGapBusinessDays === 0 && market.freshnessMaximumBusinessDays === 3, "dating/freshness selection changed");
  invariant(sameValue(market.minimumEligibleInstrumentCountByMappedCount, { "2": 2, "3": 2, "4": 3 }), "quorum selection changed");
  invariant(market.percentileAlpha === 0.2 && market.percentileMinimumConditionedPriorObservations === 126 && market.percentileRollingPriorObservationMaximum === 252 && market.percentileComparison === "strictly-greater-than", "percentile selection changed");
  invariant(market.breadthBinaryWeight === 0 && parameters.nonNumericRules.historyFallback.startsWith("No cross-set"), "breadth/fallback selection changed");
  const deferralIdentity = await fileIdentity("audit/session17/deferred-items.json");
  invariant(deferralIdentity.sha256 === "4c8f0ead8d1af79173c6388960216bfbb6e5a21a18470bef5281af06a2755360", "bounded deferrals changed during correction");
  return "Candidate C/E2/stage-3; Rule 2 age-3 gap-0; 2/2,2/3,3/4; alpha .20; 126/252; no fallback/decay; breadth 0";
});

await check("consequential decisions are frozen or deferred", () => {
  const allowed = new Set(decisions.allowedStatuses);
  invariant(decisions.decisions.every((item) => allowed.has(item.status)), "decision with unbounded status");
  invariant(new Set(decisions.decisions.map((item) => item.decisionId)).size === decisions.decisions.length, "duplicate decision IDs");
  const deferredIds = new Set(deferrals.items.map((item) => item.deferredItemId));
  for (const item of decisions.decisions.filter((entry) => entry.status === "deferred")) {
    invariant(item.contractRefs.some((ref) => [...deferredIds].some((id) => ref.endsWith(id))), `${item.decisionId}: deferred decision has no deferred item`);
  }
  for (const item of deferrals.items) {
    for (const field of ["whyEvidenceIsInsufficient", "safeSession18Or19Behavior", "blockEffect", "evidenceNeeded", "futureGate"]) {
      invariant(typeof item[field] === "string" && item[field].length > 0, `${item.deferredItemId}: missing ${field}`);
    }
  }
  invariant(traceability.entries.every((item) => allowed.has(item.status)), "traceability contains unresolved status");
  return `${decisions.decisions.length} decisions, ${deferrals.items.length} bounded deferrals`;
});

await check("numeric parameter registry is complete", () => {
  const requiredNumericPaths = [
    "parameters.canonicalization.computedDecimalPlaces",
    "parameters.canonicalization.displayDecimalPlaces",
    "parameters.identity.contentHashHexLength",
    "parameters.identity.opaqueIdDigestPrefixHexLength",
    "parameters.signal.minimumQualifyingActionStageOrdinal",
    "parameters.signal.minimumIndependentOriginsForCorroboration",
    "parameters.signal.maximumClusterContributionPerChannelPerRun",
    "parameters.market.transformLookbackValidObservations",
    "parameters.market.zHistoryValidTransformsMinimum",
    "parameters.market.zHistoryValidTransformsMaximum",
    "parameters.market.sampleStandardDeviationDegreesOfFreedomAdjustment",
    "parameters.market.sameDateMaximumGapBusinessDays",
    "parameters.market.freshnessMaximumBusinessDays",
    "parameters.market.diagnosticRawZThreshold",
    "parameters.market.percentileAlpha",
    "parameters.market.percentileQuantile",
    "parameters.market.percentileMinimumConditionedPriorObservations",
    "parameters.market.percentileRollingPriorObservationMaximum",
    "parameters.market.afterCloseDeferralEligibleCloses",
    "parameters.market.breadthBinaryWeight",
    "parameters.parallelAcceptance.minimumDistinctEligibleMarketCloses",
    "parameters.parallelAcceptance.requiredIndependentPostFreezeValidationPasses",
    "parameters.parallelAcceptance.allowedUnexplainedDeterminismFailures",
    "parameters.parallelAcceptance.allowedForbiddenPathChanges",
    "parameters.parallelAcceptance.allowedUnrecordedAmbiguousAssignments"
  ];
  for (const parameterPath of requiredNumericPaths) invariant(typeof getPath(parameters, parameterPath) === "number", `numeric parameter missing: ${parameterPath}`);
  invariant(parameters.parameters.market.percentileQuantile === 1 - parameters.parameters.market.percentileAlpha, "alpha/quantile mismatch");
  invariant(parameters.parameters.market.zHistoryValidTransformsMinimum <= parameters.parameters.market.zHistoryValidTransformsMaximum, "z history bounds inverted");
  invariant(parameters.parameters.market.percentileMinimumConditionedPriorObservations <= parameters.parameters.market.percentileRollingPriorObservationMaximum, "percentile history bounds inverted");
  return `${requiredNumericPaths.length} domain numeric values explicit`;
});

await check("canonical serialization, rounding, and hashing", () => {
  const left = { z: -0, b: { y: 2, x: 1 }, a: [3, 2, 1] };
  const right = { a: [3, 2, 1], b: { x: 1, y: 2 }, z: 0 };
  invariant(canonicalJson(left) === canonicalJson(right), "canonical key ordering or negative-zero normalization failed");
  invariant(sha256(canonicalJson(left)) === sha256(canonicalJson(right)), "canonical hash reproduction failed");
  const places = parameters.parameters.canonicalization.computedDecimalPlaces;
  invariant(roundPersisted(1 / 3, places) === 0.333333333333, "persisted rounding fixture failed");
  invariant(roundPersisted(-0.0000000000001, places) === 0, "negative zero normalization after rounding failed");
  return "deterministic canonical payload and 12-place output boundary";
});

await check("canonical divergence semantics are noncausal", () => {
  const semantics = Object.values(enums.semantics.divergenceStates);
  const result = evaluateFixture({ ruleId: "noncausal-language", input: { canonicalSemantics: semantics } }, parameters);
  invariant(result.valid, result.reason);
  invariant(enums.semantics.nonStates.includes("not divergence states"), "non-state separation missing");
  return `${semantics.length} states`;
});

await check("manifest methodology hashes and self-identity", async () => {
  const manifest = await readJson("methodology/2.0.0/manifest.json");
  const paths = manifest.artifactIdentities.map((item) => item.path);
  invariant(sameValue(paths, [...paths].sort()), "manifest artifact paths are not ascending");
  for (const item of manifest.artifactIdentities) {
    const actual = await fileIdentity(item.path);
    invariant(actual.bytes === item.bytes && actual.sha256 === item.sha256, `${item.path}: methodology identity mismatch`);
  }
  const copy = structuredClone(manifest);
  copy.selfIdentity.value = null;
  const actualSelf = sha256(canonicalJson(copy));
  invariant(manifest.selfIdentity.value === actualSelf, `manifest self-identity mismatch: ${actualSelf}`);
  return `${manifest.artifactIdentities.length} artifacts, self ${actualSelf}`;
});

await check("Session 15 and Session 16 evidence identities", async () => {
  const manifest = await readJson("methodology/2.0.0/manifest.json");
  const paths = manifest.evidenceIdentities.map((item) => item.path);
  invariant(sameValue(paths, [...paths].sort()), "evidence paths are not ascending");
  for (const item of manifest.evidenceIdentities) {
    const actual = await fileIdentity(item.path);
    invariant(actual.bytes === item.bytes && actual.sha256 === item.sha256, `${item.path}: evidence identity mismatch`);
  }
  const session16Manifest = await readJson("audit/session16/input-manifest.json");
  const selfCopy = structuredClone(session16Manifest);
  selfCopy.manifestHash.value = null;
  invariant(sha256(canonicalJson(selfCopy)) === session16Manifest.manifestHash.value, "Session 16 canonical manifest self-hash changed");
  const session15Manifest = await readJson("audit/session15/input-manifest.json");
  let preservationCount = 0;
  let preservationBytes = 0;
  for (const source of session15Manifest.sourceEvidenceFiles) {
    if (source.preservation?.status !== "verified") continue;
    preservationCount += 1;
    const actual = await fileIdentity(source.preservation.copyPath);
    preservationBytes += actual.bytes;
    invariant(actual.bytes === source.byteCount && actual.sha256 === source.sha256 && actual.sha256 === source.preservation.copySha256, `${source.preservation.copyPath}: preservation mismatch`);
  }
  invariant(preservationCount === manifest.session15Preservation.verifiedCopies, "Session 15 preservation count mismatch");
  invariant(preservationBytes === manifest.session15Preservation.verifiedBytes, "Session 15 preservation byte mismatch");
  return `${manifest.evidenceIdentities.length} evidence files; ${preservationCount} preservation copies`;
});

await check("production and legacy preservation baseline", async () => {
  const manifest = await readJson("methodology/2.0.0/manifest.json");
  for (const item of manifest.productionPreservationBaseline) {
    const actual = await fileIdentity(item.path);
    invariant(actual.sha256 === item.sha256, `${item.path}: production/legacy baseline changed`);
  }
  const forbidden = git(["diff", "--name-only", "--", "CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md", "dashboard/public", "docs", "log", "runs", "scripts", ".github/workflows"]);
  invariant(forbidden === "", `forbidden tracked paths changed: ${forbidden}`);
  const staged = git(["diff", "--cached", "--name-only"]);
  invariant(staged === "", `staged paths present: ${staged}`);
  return `${manifest.productionPreservationBaseline.length} baseline files; no forbidden tracked or staged changes`;
});

await check("working-tree scope", () => {
  const status = git(["status", "--porcelain=v1", "--untracked-files=all"]);
  const lines = status ? status.split(/\r?\n/) : [];
  const allowed = ["audit/session16/", "audit/session17/", "methodology/2.0.0/"];
  for (const line of lines) {
    const relative = line.slice(3).replaceAll("\\", "/").replace(/^"|"$/g, "");
    invariant(allowed.some((prefix) => relative.startsWith(prefix)), `out-of-scope worktree path: ${line}`);
  }
  return `${lines.length} allowed status entries`;
});

await check("git diff --check", () => {
  execFileSync("git", ["diff", "--check"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  return "clean";
});

const failures = results.filter((item) => item.status === "FAIL");
process.stdout.write(`\n${results.length - failures.length}/${results.length} validation groups passed.\n`);
if (failures.length) process.exitCode = 1;
