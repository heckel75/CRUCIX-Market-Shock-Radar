#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import readline from "node:readline";

const ROOT = path.resolve(import.meta.dirname, "../..");
const METHODOLOGY = path.join(ROOT, "methodology", "2.0.0");
const RESULTS_PATH = path.join(ROOT, "audit", "session17", "independent-validation-r2-results.json");
const REPORT_PATH = path.join(ROOT, "audit", "session17", "independent-validation-r2-report.md");

const EXPECTED_HEAD = "bfce08feece67444ce7fd98ea6fe2b42d15eea24";
const EXPECTED_MANIFEST_ID = "c99059b2aa12022d73d3fd5ffb5505d805de5e2e77aa093de975b309cdc8196c";
const FAILED_MANIFEST_ID = "809fb5119c3634ab6c30349c8b58ef7659effd4b0b227af69186ed876e63bf33";
const EXPECTED_CANONICAL_FIXTURE_HASH = "e871a28d2d2b6634246939c4b078b0116c8f4b65fb04ff37e7082218f0f7c7c7";
const EXPECTED_DEFERRAL_HASH = "4c8f0ead8d1af79173c6388960216bfbb6e5a21a18470bef5281af06a2755360";

const INITIAL_CAPTURE = Object.freeze({
  branch: "master",
  head: EXPECTED_HEAD,
  originMaster: EXPECTED_HEAD,
  ahead: 0,
  behind: 0,
  trackedChanges: [],
  stagedChanges: [],
  expectedUntrackedRoots: ["audit/session16/", "audit/session17/", "methodology/"],
  treeHashes: {
    "audit/session15": "b3d1474b617b6bb9ac6d323f684fb7356f2b0168a285199a9e8cd59da0659e93",
    "audit/session16": "3e3b52ce07c5a25e8b1538f74206663f2f1f6dcf5e725975cb9df03b1b070fe5",
    "audit/session17-existing": "1a8568db8489461a791b2afef7f89af7b6104a088f43d386e6a8eb1716d2dc0c",
    "methodology/2.0.0": "44171a92ff734354617501844529f60140aee1f3cbd77d3b3d6baacbf4e9a1bf",
  },
});

const EXISTING_SESSION17_HASHES = Object.freeze({
  "audit/session17/correction-report.md": "ea2cf0363df2d388028793c6be418cceaedac67e687255e9d81054d212371f75",
  "audit/session17/decision-register.json": "f99cf25a854e910983df819cbbb6cb417ae21b8ab2d8d293557650a42ccb0d6d",
  "audit/session17/deferred-items.json": EXPECTED_DEFERRAL_HASH,
  "audit/session17/freeze-report.md": "81c6b04aea9e754b4ba45e3de4050dc48279e833f8113109614a7745b791c43c",
  "audit/session17/independent-validation-report.md": "59f2d82692c8a052b3758e92ceed8fb3a3382dbfcaa6178d7d0bf86b934e1f9b",
  "audit/session17/independent-validation-results.json": "34f1daf6ddd07f675c2c107a66e84bf25711503d15f08b24a5b58cbbaff8260e",
  "audit/session17/parameter-traceability.json": "07151ebe6edcc5a31406b8d3cb3706d0c2b766c910370130f5da007c1391e941",
  "audit/session17/validate-freeze.mjs": "fb1568efec529c34fcf4b9dd3b15f4dec1af662d4d0e75c28b6dbc14fe1b46e0",
  "audit/session17/validate-independent.mjs": "cb82199c3160e22dc16f18a45b843a07e4ae043aa4b3af66241cb3df08eebc0c",
  "audit/session17/validation-report.md": "a4fecfdb8bfc4513f32a49723260fec6259573b2fae4f86358212fa82627f301",
});

const JSON_INPUTS = Object.freeze([
  "methodology/2.0.0/clustering-lifecycle-rules.json",
  "methodology/2.0.0/enums.json",
  "methodology/2.0.0/fixtures/negative.json",
  "methodology/2.0.0/fixtures/positive.json",
  "methodology/2.0.0/leaf-channel-map.json",
  "methodology/2.0.0/manifest.json",
  "methodology/2.0.0/parallel-acceptance.json",
  "methodology/2.0.0/parameters.json",
  "methodology/2.0.0/schema.json",
  "methodology/2.0.0/source-origin-rules.json",
  "methodology/2.0.0/storage-migration-contract.json",
  "audit/session17/decision-register.json",
  "audit/session17/deferred-items.json",
  "audit/session17/independent-validation-results.json",
  "audit/session17/parameter-traceability.json",
]);

const PRODUCTION_DEFINITIONS = Object.freeze([
  "candidate",
  "originProvenance",
  "assignment",
  "eventCluster",
  "registry",
  "signalOutput",
  "instrumentReading",
  "marketChannelOutput",
  "marketOutput",
  "divergenceOutput",
  "runManifest",
]);

function abs(relativePath) {
  return path.join(ROOT, ...relativePath.split("/"));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(abs(relativePath), "utf8"));
}

function readJsonl(relativePath) {
  const text = fs.readFileSync(abs(relativePath), "utf8").trim();
  return text ? text.split(/\r?\n/u).map((line) => JSON.parse(line)) : [];
}

function sha256Bytes(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(relativePath) {
  return sha256Bytes(fs.readFileSync(abs(relativePath)));
}

function sha256Text(text) {
  return sha256Bytes(Buffer.from(text, "utf8"));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = stableValue(value[key]);
    return output;
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function deepEqual(left, right) {
  return stableJson(left) === stableJson(right);
}

function lexicalCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function listFiles(rootPath) {
  const output = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else output.push(full);
    }
  }
  walk(abs(rootPath));
  return output.sort((a, b) => a.replaceAll("\\", "/").localeCompare(b.replaceAll("\\", "/")));
}

function treeHash(rootPath, includedPaths = null) {
  const files = includedPaths
    ? includedPaths.map(abs).sort((a, b) => a.replaceAll("\\", "/").localeCompare(b.replaceAll("\\", "/")))
    : listFiles(rootPath);
  const lines = files.map((full) => {
    const relative = path.relative(ROOT, full).replaceAll("\\", "/");
    const bytes = fs.statSync(full).size;
    return `${relative}\t${bytes}\t${sha256Bytes(fs.readFileSync(full))}`;
  });
  return sha256Text(`${lines.join("\n")}\n`);
}

function clone(value) {
  return structuredClone(value);
}

function getAt(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value?.[Number.isInteger(Number(key)) ? Number(key) : key], object);
}

function setAt(object, dottedPath, value) {
  const parts = dottedPath.split(".");
  const leaf = parts.pop();
  const parent = parts.reduce((current, key) => current[Number.isInteger(Number(key)) ? Number(key) : key], object);
  parent[leaf] = value;
}

function deleteAt(object, dottedPath) {
  const parts = dottedPath.split(".");
  const leaf = parts.pop();
  const parent = parts.reduce((current, key) => current[Number.isInteger(Number(key)) ? Number(key) : key], object);
  delete parent[leaf];
}

function resolvePointer(document, reference) {
  if (!reference.startsWith("#/")) throw new Error(`External schema reference prohibited: ${reference}`);
  return reference
    .slice(2)
    .split("/")
    .map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, token) => value?.[token], document);
}

function typeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function validateSchema(schema, value, schemaDocument, dataPath = "$", errors = []) {
  if (typeof schema === "boolean") {
    if (!schema) errors.push(`${dataPath}: false schema`);
    return errors;
  }
  if (!schema || typeof schema !== "object") return errors;

  if (schema.$ref) {
    const resolved = resolvePointer(schemaDocument, schema.$ref);
    if (resolved === undefined) errors.push(`${dataPath}: unresolved reference ${schema.$ref}`);
    else validateSchema(resolved, value, schemaDocument, dataPath, errors);
    return errors;
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(value, type))) {
      errors.push(`${dataPath}: expected type ${types.join("|")}`);
      return errors;
    }
  }

  if (Object.hasOwn(schema, "const") && !deepEqual(value, schema.const)) {
    errors.push(`${dataPath}: const mismatch`);
  }
  if (schema.enum && !schema.enum.some((item) => deepEqual(item, value))) {
    errors.push(`${dataPath}: not in enum`);
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${dataPath}: minLength`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${dataPath}: maxLength`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) errors.push(`${dataPath}: pattern`);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${dataPath}: minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${dataPath}: maximum`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push(`${dataPath}: exclusiveMinimum`);
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) errors.push(`${dataPath}: exclusiveMaximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${dataPath}: minItems`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${dataPath}: maxItems`);
    if (schema.uniqueItems) {
      const identities = value.map(stableJson);
      if (new Set(identities).size !== identities.length) errors.push(`${dataPath}: uniqueItems`);
    }
    if (schema.items) value.forEach((item, index) => validateSchema(schema.items, item, schemaDocument, `${dataPath}[${index}]`, errors));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(`${dataPath}.${required}: required`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) validateSchema(childSchema, value[key], schemaDocument, `${dataPath}.${key}`, errors);
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(schema.properties, key)) errors.push(`${dataPath}.${key}: additional property`);
      }
    }
  }

  for (const part of schema.allOf ?? []) validateSchema(part, value, schemaDocument, dataPath, errors);
  if (schema.oneOf) {
    const branches = schema.oneOf.map((part) => validateSchema(part, value, schemaDocument, dataPath, []));
    if (branches.filter((branch) => branch.length === 0).length !== 1) {
      errors.push(`${dataPath}: oneOf matched ${branches.filter((branch) => branch.length === 0).length} branches`);
      const shortest = branches.filter((branch) => branch.length).sort((a, b) => a.length - b.length)[0];
      if (shortest) errors.push(...shortest.map((error) => `${dataPath}: oneOf detail ${error}`));
    }
  }
  if (schema.anyOf) {
    const branches = schema.anyOf.map((part) => validateSchema(part, value, schemaDocument, dataPath, []));
    if (!branches.some((branch) => branch.length === 0)) errors.push(`${dataPath}: anyOf did not match`);
  }
  if (schema.not && validateSchema(schema.not, value, schemaDocument, dataPath, []).length === 0) {
    errors.push(`${dataPath}: prohibited by not`);
  }
  if (schema.if) {
    const conditionMatches = validateSchema(schema.if, value, schemaDocument, dataPath, []).length === 0;
    if (conditionMatches && schema.then) validateSchema(schema.then, value, schemaDocument, dataPath, errors);
    if (!conditionMatches && schema.else) validateSchema(schema.else, value, schemaDocument, dataPath, errors);
  }
  return errors;
}

function schemaErrorsForDefinition(schemaDocument, definition, value) {
  return validateSchema({ $ref: `#/$defs/${definition}` }, value, schemaDocument, "$", []);
}

function roundPersisted(number, places) {
  if (!Number.isFinite(number)) throw new Error("Non-finite number in canonical payload");
  if (Object.is(number, -0)) return 0;
  return Number(number.toFixed(places));
}

function sequenceIsValid(property, values) {
  const strictlyAscending = (items) => items.every((item, index) => index === 0 || lexicalCompare(items[index - 1], item) < 0);
  if (property === "instrumentObservationDates") return strictlyAscending(values);
  if (property === "lifecycleHistory") {
    return values.every((item, index) => index === 0 || (
      lexicalCompare(values[index - 1].effectiveAt, item.effectiveAt) <= 0 &&
      values[index - 1].transitionVersion < item.transitionVersion
    ));
  }
  if (property === "originEvidenceHistory") {
    return values.every((item, index) => index === 0 || (
      lexicalCompare(values[index - 1].effectiveAt, item.effectiveAt) <= 0 &&
      values[index - 1].assessmentVersion < item.assessmentVersion
    ));
  }
  if (property === "assignments") {
    return values.every((item, index) => index === 0 || lexicalCompare(
      `${values[index - 1].decidedAt}\u0000${String(values[index - 1].assignmentVersion).padStart(12, "0")}\u0000${values[index - 1].assignmentId}`,
      `${item.decidedAt}\u0000${String(item.assignmentVersion).padStart(12, "0")}\u0000${item.assignmentId}`,
    ) < 0);
  }
  if (property === "correctionHistory" || property === "lineage") {
    const timeKey = property === "correctionHistory" ? "effectiveAt" : "decidedAt";
    return values.every((item, index) => index === 0 || lexicalCompare(
      `${values[index - 1][timeKey]}\u0000${values[index - 1].provenanceId}`,
      `${item[timeKey]}\u0000${item.provenanceId}`,
    ) < 0);
  }
  if (property === "rankedClusters") {
    return values.every((item, index) => index === 0 || (
      values[index - 1].rank < item.rank ||
      (values[index - 1].rank === item.rank && lexicalCompare(values[index - 1].eventClusterId, item.eventClusterId) < 0)
    ));
  }
  if (property === "cases") return new Set(values.map((item) => item.id)).size === values.length;
  return true;
}

function canonicalKey(item, sortKey) {
  if (sortKey === "lexical value" || sortKey === "numeric ascending") return item;
  return item?.[sortKey];
}

function canonicalize(value, parameters, propertyName = null) {
  const canonicalParameters = parameters.parameters.canonicalization;
  if (typeof value === "number") return roundPersisted(value, canonicalParameters.computedDecimalPlaces);
  if (Array.isArray(value)) {
    const policy = canonicalParameters.arrayPoliciesByProperty[propertyName];
    if (!policy) throw new Error(`No canonical array policy for ${propertyName}`);
    if (policy.kind === "sequence" && !sequenceIsValid(propertyName, value)) {
      throw new Error(`Sequence order invalid for ${propertyName}`);
    }
    let output = value.map((item) => canonicalize(item, parameters, null));
    if (policy.kind === "set") {
      const keyed = output.map((item) => ({ item, key: canonicalKey(item, policy.sortKey) }));
      if (keyed.some(({ key }) => key === undefined)) throw new Error(`Missing set sort key for ${propertyName}`);
      keyed.sort((left, right) => lexicalCompare(String(left.key), String(right.key)));
      const keys = keyed.map(({ key }) => stableJson(key));
      if (new Set(keys).size !== keys.length) throw new Error(`Duplicate set key for ${propertyName}`);
      output = keyed.map(({ item }) => item);
    }
    return output;
  }
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      if (parameters.parameters.canonicalization.volatileFieldsExcludedFromIdentity.includes(key)) continue;
      output[key] = canonicalize(value[key], parameters, key);
    }
    return output;
  }
  return value;
}

function canonicalBytes(value, parameters) {
  return Buffer.from(`${JSON.stringify(canonicalize(value, parameters))}\n`, "utf8");
}

function normalizeSession15(rawText) {
  return String(rawText).normalize("NFKC").replace(/\r\n?/gu, "\n").trim().replace(/\s+/gu, " ");
}

function isStrictAscending(values) {
  return values.every((value, index) => index === 0 || lexicalCompare(values[index - 1], value) < 0);
}

function graphHasCycle(edges) {
  const graph = new Map();
  for (const edge of edges) {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    graph.get(edge.from).push(edge.to);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  }
  return [...graph.keys()].some(visit);
}

function validateSimpleTopology(input) {
  const nodes = new Set(input.nodeIds);
  if (input.edges.some((edge) => !nodes.has(edge.from) || !nodes.has(edge.to))) return "origin-edge-dangling";
  if (input.edges.some((edge) => edge.from === edge.to)) return "origin-edge-self-reference";
  if (graphHasCycle(input.edges)) return "origin-edge-cycle";
  return null;
}

function topologyErrors(record) {
  const errors = [];
  const nodes = new Set([
    record.candidateId,
    ...record.reportingSources.map((node) => node.reportingSourceId),
    ...record.originatingAssertions.map((node) => node.assertionId),
    ...record.reportingOrigins.map((node) => node.reportingOriginId),
    ...record.independenceGroups.map((node) => node.independenceGroupId),
  ]);
  const edges = record.provenanceEdges.map((edge) => ({ from: edge.fromNodeId, to: edge.toNodeId, type: edge.edgeType }));
  if (edges.some((edge) => !nodes.has(edge.from) || !nodes.has(edge.to))) errors.push("origin-edge-dangling");
  if (edges.some((edge) => edge.from === edge.to)) errors.push("origin-edge-self-reference");
  const directedTypes = new Set(["syndicated-from", "quotes-official-statement", "derived-from", "repeats"]);
  if (graphHasCycle(edges.filter((edge) => directedTypes.has(edge.type)))) errors.push("origin-edge-cycle");

  const requiredPath = [
    [record.candidateId, "candidate-reported-by", new Set(record.reportingSources.map((node) => node.reportingSourceId))],
    [null, "reporter-reports-assertion", new Set(record.originatingAssertions.map((node) => node.assertionId))],
    [null, "assertion-originated-by", new Set(record.reportingOrigins.map((node) => node.reportingOriginId))],
    [null, "origin-member-of-independence-group", new Set(record.independenceGroups.map((node) => node.independenceGroupId))],
  ];
  let frontier = new Set([record.candidateId]);
  for (const [, edgeType, destinations] of requiredPath) {
    const next = new Set();
    for (const edge of edges) if (frontier.has(edge.from) && edge.type === edgeType && destinations.has(edge.to)) next.add(edge.to);
    if (next.size === 0) errors.push(`origin-path-missing:${edgeType}`);
    frontier = next;
  }

  const evidence = record.originEvidence;
  const references = [
    [evidence.reportingSourceIds, record.reportingSources.map((node) => node.reportingSourceId)],
    [evidence.originatingAssertionIds, record.originatingAssertions.map((node) => node.assertionId)],
    [evidence.reportingOriginIds, record.reportingOrigins.map((node) => node.reportingOriginId)],
    [evidence.independenceGroupIds, record.independenceGroups.map((node) => node.independenceGroupId)],
    [evidence.provenanceEdgeIds, record.provenanceEdges.map((node) => node.provenanceEdgeId)],
  ];
  if (references.some(([left, right]) => left.some((id) => !right.includes(id)))) errors.push("origin-evidence-reference-dangling");
  const assessedGroups = record.independenceGroups.filter((group) => group.assessmentStatus === "assessed").length;
  if (evidence.status === "assessed" && !evidence.conflicting && evidence.independentOriginCount !== assessedGroups) {
    errors.push("origin-independent-count-mismatch");
  }
  return errors;
}

function lifecycleErrors(record) {
  const errors = [];
  if (record.firstSeen > record.lastObservedAt) errors.push("INV-LIFE-001:firstSeen-after-lastObservedAt");
  if (record.lastMaterialChangeAt < record.firstSeen || record.lastMaterialChangeAt > record.lastObservedAt) {
    errors.push("INV-LIFE-001:material-clock-outside-observation-range");
  }
  if (!sequenceIsValid("lifecycleHistory", record.lifecycleHistory)) errors.push("INV-LIFE-001:history-not-monotonic");
  for (const transition of record.lifecycleHistory) {
    if (transition.state === "continuing" && (transition.material !== false || transition.materialTransitionProvenanceId !== undefined)) {
      errors.push("INV-LIFE-002:continuing-material");
    }
    if (["new", "escalating", "de-escalating"].includes(transition.state) && (
      transition.material !== true || !transition.materialTransitionProvenanceId
    )) errors.push("INV-LIFE-002:material-transition-missing-provenance");
  }
  const final = record.lifecycleHistory.at(-1);
  if (final?.state !== record.lifecycleStatus) errors.push("INV-LIFE-001:current-state-mismatch");
  const materialTimes = record.lifecycleHistory.filter((item) => item.material).map((item) => item.effectiveAt).sort();
  if (materialTimes.length && materialTimes.at(-1) !== record.lastMaterialChangeAt) errors.push("INV-LIFE-001:material-clock-mismatch");
  return errors;
}

function instrumentErrors(record) {
  const errors = [];
  if (record.instrumentObservationDates?.length !== record.actualWindowObservationCount) errors.push("INV-MARKET-001:actual-count");
  if (!isStrictAscending(record.instrumentObservationDates ?? [])) errors.push("INV-MARKET-001:window-dates-not-ascending");
  if (record.instrumentObservationDates?.[0] !== record.windowStart) errors.push("INV-MARKET-001:window-start");
  if (record.instrumentObservationDates?.at(-1) !== record.windowEnd || record.windowEnd !== record.asOf) errors.push("INV-MARKET-001:window-end");
  if (record.zScoreAssessment === "assessed" && (
    typeof record.zScore !== "number" || Math.abs(record.zScore) !== record.absoluteZScore
  )) errors.push("INV-MARKET-002:z-score-wrapper");
  return errors;
}

function marketChannelErrors(record, rawThreshold = 1.5) {
  const errors = [];
  if (record.status !== "assessed") return errors;
  const readings = record.includedInstrumentReadings;
  if (readings.length !== record.eligibleInstrumentCount) errors.push("INV-MARKET-003:eligible-count");
  if (readings.some((reading) => reading.asOf !== record.marketAsOf || reading.instrumentSetVersion !== record.instrumentSetVersion || reading.conditioningKey !== record.conditioningKey)) {
    errors.push("INV-MARKET-003:cohort-binding");
  }
  if (readings.some((reading) => instrumentErrors(reading).length || !reading.eligible)) errors.push("INV-MARKET-003:invalid-reading");
  const ranked = [...readings].sort((left, right) => right.absoluteZScore - left.absoluteZScore || lexicalCompare(left.instrumentId, right.instrumentId));
  const driver = ranked[0];
  const second = ranked[1] ?? null;
  if (!driver || record.marketStatistic !== driver.absoluteZScore || record.driverInstrumentId !== driver.instrumentId || record.driverZ !== driver.zScore) {
    errors.push("INV-MARKET-003:driver");
  }
  if ((second?.instrumentId ?? null) !== record.secondDriverInstrumentId || (second?.zScore ?? null) !== record.secondDriverZ) {
    errors.push("INV-MARKET-003:second-driver");
  }
  const percentileCount = readings.filter((reading) => reading.absoluteZScore > record.percentileThreshold).length;
  const rawCount = readings.filter((reading) => reading.absoluteZScore >= rawThreshold).length;
  if (percentileCount !== record.numberAbovePercentileThreshold) errors.push("INV-MARKET-003:percentile-count");
  if (rawCount !== record.numberAboveRawDiagnosticThreshold) errors.push("INV-MARKET-003:raw-count");
  if (Math.abs(record.breadthRatio - percentileCount / readings.length) > 1e-12) errors.push("INV-MARKET-003:breadth");
  if (record.elevated !== (record.marketStatistic > record.percentileThreshold)) errors.push("INV-MARKET-003:strict-threshold");
  return errors;
}

function bundleErrors(bundle, rawThreshold = 1.5) {
  const errors = [];
  const candidateIds = new Set(bundle.candidates.map((record) => record.candidateId));
  const clusterIds = new Set(bundle.registry.eventClusters.map((record) => record.eventClusterId));
  if (bundle.originProvenance.some((record) => !candidateIds.has(record.candidateId))) errors.push("INV-BUNDLE-001:origin-candidate");
  if (bundle.assignments.some((record) => !candidateIds.has(record.candidateId) || !clusterIds.has(record.eventClusterId))) errors.push("INV-BUNDLE-001:assignment-reference");
  for (const record of bundle.originProvenance) errors.push(...topologyErrors(record));
  for (const record of bundle.registry.eventClusters) errors.push(...lifecycleErrors(record));
  for (const channel of bundle.marketOutput.channels) errors.push(...marketChannelErrors(channel, rawThreshold));
  const channelSets = [bundle.signalOutput.channels, bundle.marketOutput.channels, bundle.divergenceOutput.channels]
    .map((channels) => channels.map((channel) => channel.channelId).sort().join("|"));
  if (new Set(channelSets).size !== 1) errors.push("INV-BUNDLE-001:channel-set-mismatch");
  if ([bundle.signalOutput.runId, bundle.marketOutput.runId, bundle.divergenceOutput.runId, bundle.runManifest.runId].some((runId) => runId !== bundle.signalOutput.runId)) {
    errors.push("INV-BUNDLE-001:run-id-mismatch");
  }
  return errors;
}

function fixtureEvaluation(caseRecord, context) {
  const input = caseRecord.input;
  const invalid = (reason) => ({ valid: false, reason });
  const valid = () => ({ valid: true, reason: null });
  const expectedMinimum = { 2: 2, 3: 2, 4: 3 };
  switch (caseRecord.ruleId) {
    case "syndication-origin-count":
      return input.independentOriginCount === new Set(input.originIds).size ? valid() : invalid("syndicated-counted-independent");
    case "independent-corroboration":
      return input.originStatus === "assessed" && new Set(input.originIds).size >= 2 && input.independentOriginCount === new Set(input.originIds).size && !input.conflicting && input.qualifiesE2 ? valid() : invalid("independent-corroboration-invalid");
    case "unknown-origin-conservative":
      return input.originStatus === "unknown" && input.independentOriginCount === 0 && !input.qualifiesE2 && !input.elevated ? valid() : invalid("unknown-origin-elevated");
    case "direct-mechanism-required":
      return input.elevated === input.mechanismRelations.includes("direct") ? valid() : invalid("direct-mechanism-missing");
    case "one-contribution-per-cluster-channel-run":
      return input.contributionCount <= 1 ? valid() : invalid("cluster-channel-double-count");
    case "stage-boundary": {
      const ordinal = { "rhetoric-or-threatened": 1, announced: 2, implemented: 3, "impact-observed": 4 }[input.stage];
      return input.elevated === (ordinal >= 3) ? valid() : invalid("announced-elevated");
    }
    case "material-clock":
      return input.state === "continuing" && input.lastMaterialChangeAt === input.priorLastMaterialChangeAt && input.lastObservedAt > input.priorLastObservedAt ? valid() : invalid("nonmaterial-repeat-moved-clock");
    case "material-transition":
      return ["new", "escalating", "de-escalating"].includes(input.state) && input.material && input.transitionAt === input.lastMaterialChangeAt && input.evidenceRefs.length ? valid() : invalid("material-transition-invalid");
    case "unresolved-is-not-nonevent":
      return input.observedDisposition === input.storedDisposition && input.eventTypeStatus === "unknown" && !input.scored ? valid() : invalid("unresolved-relabelled");
    case "atomic-decomposition-provenance":
      return input.parentDisposition === "decomposed-parent" && input.childCount === input.childDispositions.length && input.childDispositions.every((item) => item === "atomic-event-observation") && input.provenanceOperations.includes("decomposed") && input.rawParentRetained ? valid() : invalid("decomposition-provenance-missing");
    case "append-only-lineage":
      return input.priorAssignmentRetained && input.allOperationsHaveProvenance && !input.idsReused ? valid() : invalid("prior-assignment-not-retained");
    case "chronology-fidelity":
      return !input.pointInTimeEligible && !input.includedInThresholdHistory ? valid() : invalid("chronology-ineligible-included");
    case "own-series-window":
      return input.actualObservationDates.length === input.lookbackValidObservations + 1 && isStrictAscending(input.actualObservationDates) && !input.usesGlobalDates ? valid() : invalid("actual-window-dates-missing");
    case "per-channel-dating":
      return input.eachChannelSameDate && !input.requiresGlobalDate ? valid() : invalid("global-date-dependency");
    case "freshness-bound":
      return input.eligible === (input.businessDayAge <= 3) ? valid() : invalid("stale-reading-included");
    case "minimum-eligible-count":
      return input.minimumCount === expectedMinimum[input.mappedCount] && input.assessed === (input.eligibleCount >= input.minimumCount) ? valid() : invalid("minimum-count-mismatch");
    case "no-mixed-date-statistic":
      return input.status !== "assessed" || new Set(input.includedDates).size === 1 ? valid() : invalid("mixed-date-binary-statistic");
    case "prior-only-percentile":
      return !input.currentIncludedInHistory && input.historyDates.every((date) => date < input.currentDate) ? valid() : invalid("lookahead-history");
    case "conditioned-history":
      return !input.pooledDifferentKey && input.historyKeys.every((key) => key === `${input.currentInstrumentSetVersion}|${input.currentEligibleCount}`) ? valid() : invalid("incompatible-history-pooled");
    case "insufficient-history":
      return input.conditionedPriorCount < 126 && input.status === "insufficient-conditioned-history" && input.threshold === null && input.elevated === null && !input.fallbackUsed ? valid() : invalid("hidden-history-fallback");
    case "quantile-tie": {
      const sorted = [...input.history].sort((a, b) => a - b);
      const rank = Math.max(1, Math.ceil((1 - input.alpha) * sorted.length));
      const threshold = sorted[rank - 1];
      return input.rank === rank && input.threshold === threshold && input.elevated === (input.current > threshold) ? valid() : invalid("threshold-equality-triggered");
    }
    case "market-diagnostics": {
      const ranked = Object.entries(input.zByInstrument).sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]) || lexicalCompare(left[0], right[0]));
      const above = ranked.filter(([, z]) => Math.abs(z) >= 1.5).length;
      return input.driver === ranked[0][0] && input.secondDriver === ranked[1][0] && input.aboveThresholdCount === above && Math.abs(input.breadth - above / input.eligibleCount) < 1e-12 && !input.breadthAffectsBinary ? valid() : invalid("breadth-used-as-binary-gate");
    }
    case "after-close-pending":
      return input.signalObservedAt > input.relevantCloseAt && input.status === "pending-next-eligible-close" && input.state === null ? valid() : invalid("after-close-not-pending");
    case "unknown-timing":
      return input.timestampReliability === "unreliable" && input.status === "unknown-timing" && input.state === null ? valid() : invalid("unreliable-timing-classified");
    case "four-state-table": {
      const state = input.signalElevated ? (input.marketElevated ? "co-movement" : "signal-leading") : (input.marketElevated ? "market-only" : "calm");
      return input.state === state ? valid() : invalid("four-state-mismatch");
    }
    case "noncausal-language":
      return input.canonicalSemantics.some((text) => /\b(cause|causal|predict|confirm)\w*\b/iu.test(text)) ? invalid("causal-language") : valid();
    case "legacy-immutability":
      return input.legacyMethodologyVersion === null && input.beforeSha256 === input.afterSha256 ? valid() : invalid("legacy-restamped");
    case "v2-version-stamp":
      return input.namespace.includes("/v2/2.0.0/") && input.methodologyVersion === "2.0.0" ? valid() : invalid("v2-version-missing");
    case "canonical-reproduction": {
      const requiredVolatile = context.parameters.parameters.canonicalization.volatileFieldsExcludedFromIdentity;
      const exclusionsComplete = requiredVolatile.every((field) => input.excludedViewFields.includes(field) || !(field in input.payloadA) && !(field in input.payloadB));
      const strip = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => input.excludedViewFields.includes(key) === false));
      const same = stableJson(strip(input.payloadA)) === stableJson(strip(input.payloadB));
      return exclusionsComplete && same && input.sameCanonicalHash ? valid() : invalid("volatile-field-not-excluded");
    }
    case "normative-normalization": {
      const normalized = input.rawInputs.map(normalizeSession15);
      const hashes = normalized.map(sha256Text);
      return input.normalizationVersion === "crucix-session15-conservative-normalization/v1" && normalized.every((item) => item === input.expectedNormalized) && hashes.every((hash) => hash === input.expectedHash) && input.expectEqual ? valid() : invalid("normative-normalization-mismatch");
    }
    case "normalization-distinguishes-content": {
      const hashes = input.rawInputs.map((text) => sha256Text(normalizeSession15(text)));
      return deepEqual(hashes, input.expectedHashes) && new Set(hashes).size === hashes.length && input.expectAllDifferent ? valid() : invalid("normalization-collapsed-material-difference");
    }
    case "origin-copy-collapse":
      return input.reporterCount === 30 && input.assertionCount === 1 && input.originCount === 1 && input.independenceGroupCount === 1 && input.edgeType === "syndicated-from" && input.independentOriginCount === 1 ? valid() : invalid("origin-copy-collapse-invalid");
    case "official-quotation-collapse":
      return input.reporterCount > 1 && input.officialStatementCount === 1 && input.originCount === 1 && input.independenceGroupCount === 1 && input.edgeType === "quotes-official-statement" && input.independentOriginCount === 1 ? valid() : invalid("official-quotation-collapse-invalid");
    case "independent-direct-observation":
      return input.assessedDirectObservationCount === 2 && input.distinctOriginCount === 2 && input.distinctIndependenceGroupCount === 2 && !input.conflicting && input.independentOriginCount === 2 ? valid() : invalid("independent-direct-observation-invalid");
    case "unknown-derivation-noncorroborating":
      return input.edgeType === "unknown-derivation" && input.assessmentStatus === "unknown" && !input.countsAsIndependent && !input.qualifiesE2 ? valid() : invalid("unknown-derivation-promoted");
    case "conflicting-origin-conservative":
      return input.conflicting && input.evidenceClass === "conflicting-origin" && !input.qualifiesE2 ? valid() : invalid("conflict-increased-confidence");
    case "schema-adversarial-record": {
      const errors = schemaErrorsForDefinition(context.schema, input.schemaDefinition, input.record);
      return errors.length ? invalid(input.invariantId) : valid();
    }
    case "normalization-auto-assignment": {
      const hashPattern = /^[0-9a-f]{64}$/u;
      if (!hashPattern.test(input.leftHash) || !hashPattern.test(input.rightHash)) return invalid("malformed-normalized-content-hash");
      if (input.leftVersion !== input.rightVersion) return invalid("normalization-version-mismatch");
      return input.leftHash === input.rightHash ? valid() : invalid("normalization-hash-mismatch");
    }
    case "normalization-hash-reproduction":
      return sha256Text(normalizeSession15(input.rawInput)) === input.recordedHash ? valid() : invalid("normalized-content-hash-mismatch");
    case "ambiguous-match-adjudication":
      return input.assessedIncidentFieldConflict && (input.decisionMode !== "deterministic-automatic" || input.proposalPersisted) ? valid() : invalid("ambiguous-match-not-adjudicated");
    case "origin-topology-integrity": {
      const reason = validateSimpleTopology(input);
      return reason ? invalid(reason) : valid();
    }
    case "complete-record-mutation": {
      const source = context.positive.cases.find((item) => item.id === input.sourceFixtureId).input.record;
      const mutated = clone(getAt(source, input.recordPath));
      for (const field of input.deletePaths ?? []) deleteAt(mutated, field);
      for (const [field, value] of Object.entries(input.set ?? {})) setAt(mutated, field, value);
      const schemaErrors = schemaErrorsForDefinition(context.schema, input.schemaDefinition, mutated);
      const semanticErrors = input.schemaDefinition === "eventCluster" ? lifecycleErrors(mutated) : input.schemaDefinition === "instrumentReading" ? instrumentErrors(mutated) : [];
      return schemaErrors.length || semanticErrors.length ? invalid(input.invariantId) : valid();
    }
    case "canonical-sequence-order":
      return sequenceIsValid(input.property, input.sequence) ? valid() : invalid("canonical-sequence-order-invalid");
    case "complete-schema-record": {
      const schemaErrors = schemaErrorsForDefinition(context.schema, input.schemaDefinition, input.record);
      const semanticErrors = input.schemaDefinition === "runBundle" ? bundleErrors(input.record, context.parameters.parameters.market.diagnosticRawZThreshold) : [];
      return schemaErrors.length || semanticErrors.length ? invalid("complete-record-invalid") : valid();
    }
    case "canonical-complete-record": {
      const schemaA = schemaErrorsForDefinition(context.schema, input.schemaDefinition, input.payloadA);
      const schemaB = schemaErrorsForDefinition(context.schema, input.schemaDefinition, input.payloadB);
      const bytesA = canonicalBytes(input.payloadA, context.parameters);
      const bytesB = canonicalBytes(input.payloadB, context.parameters);
      const correct = schemaA.length === 0 && schemaB.length === 0 && bytesA.equals(bytesB) && bytesA.toString("utf8") === input.expectedCanonicalUtf8 && sha256Bytes(bytesA) === input.expectedSha256;
      return correct ? valid() : invalid("canonical-complete-record-mismatch");
    }
    default:
      throw new Error(`Unhandled fixture rule ${caseRecord.ruleId}`);
  }
}

function countSchemaReferences(schemaDocument) {
  let count = 0;
  const unresolved = [];
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(walk);
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref") {
        count += 1;
        if (resolvePointer(schemaDocument, child) === undefined) unresolved.push(child);
      } else walk(child);
    }
  }
  walk(schemaDocument);
  return { count, unresolved };
}

function arraySchemaProperties(schemaDocument) {
  const names = new Set();
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(walk);
    if (value.properties) {
      for (const [name, child] of Object.entries(value.properties)) {
        const effective = child.$ref ? resolvePointer(schemaDocument, child.$ref) : child;
        const types = Array.isArray(effective?.type) ? effective.type : [effective?.type];
        if (types.includes("array")) names.add(name);
      }
    }
    Object.values(value).forEach(walk);
  }
  walk(schemaDocument);
  return [...names].sort(lexicalCompare);
}

function weekdayAge(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T00:00:00.000Z`);
  let count = 0;
  for (let date = new Date(from.getTime() + 86_400_000); date <= to; date = new Date(date.getTime() + 86_400_000)) {
    const day = date.getUTCDay();
    if (day >= 1 && day <= 5) count += 1;
  }
  return count;
}

function calendarAge(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00.000Z`) - Date.parse(`${fromDate}T00:00:00.000Z`)) / 86_400_000);
}

function almostEqual(left, right, tolerance = 1e-12) {
  if (left === null || right === null) return left === right;
  return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right));
}

function reconstructTransforms(observations, frozenTransforms) {
  const observationsByInstrument = Map.groupBy(observations, (row) => row.instrumentId);
  const frozenByInstrument = Map.groupBy(frozenTransforms, (row) => row.instrumentId);
  const computed = [];
  const mismatches = [];
  for (const [instrumentId, rowsUnsorted] of observationsByInstrument) {
    const rows = [...rowsUnsorted].sort((left, right) => lexicalCompare(left.observationDate, right.observationDate));
    const instrumentTransforms = [];
    for (let index = 5; index < rows.length; index += 1) {
      const prior = rows[index - 5];
      const current = rows[index];
      const transformValue = current.type === "price" ? current.value / prior.value - 1 : current.value - prior.value;
      instrumentTransforms.push({ prior, current, transformValue });
    }
    const frozen = frozenByInstrument.get(instrumentId) ?? [];
    for (let index = 0; index < instrumentTransforms.length; index += 1) {
      const item = instrumentTransforms[index];
      const history = instrumentTransforms.slice(Math.max(0, index - 251), index + 1);
      const historyCount = history.length;
      let zScore = null;
      if (historyCount === 252) {
        const mean = history.reduce((sum, row) => sum + row.transformValue, 0) / historyCount;
        const variance = history.reduce((sum, row) => sum + (row.transformValue - mean) ** 2, 0) / (historyCount - 1);
        zScore = (item.transformValue - mean) / Math.sqrt(variance);
      }
      const calculated = {
        instrumentId,
        windowStart: item.prior.observationDate,
        windowEnd: item.current.observationDate,
        asOf: item.current.observationDate,
        currentValue: item.current.value,
        priorValue: item.prior.value,
        transformValue: item.transformValue,
        zScore,
        absZScore: zScore === null ? null : Math.abs(zScore),
        publishedRoundingCandidate: zScore === null ? null : Number(zScore.toFixed(3)),
        zHistoryStart: history[0].current.observationDate,
        zHistoryEnd: item.current.observationDate,
        historyCount,
        fiveObservationCalendarSpanDays: calendarAge(item.prior.observationDate, item.current.observationDate),
        fiveObservationBusinessDaySpan: weekdayAge(item.prior.observationDate, item.current.observationDate),
      };
      computed.push(calculated);
      const expected = frozen[index];
      if (!expected) {
        mismatches.push(`${instrumentId}:${calculated.asOf}:missing-frozen-row`);
        continue;
      }
      for (const key of ["windowStart", "windowEnd", "asOf", "zHistoryStart", "zHistoryEnd", "historyCount", "fiveObservationCalendarSpanDays", "fiveObservationBusinessDaySpan"]) {
        if (calculated[key] !== expected[key]) mismatches.push(`${instrumentId}:${calculated.asOf}:${key}`);
      }
      for (const key of ["currentValue", "priorValue", "transformValue", "zScore", "absZScore", "publishedRoundingCandidate"]) {
        if (!almostEqual(calculated[key], expected[key])) mismatches.push(`${instrumentId}:${calculated.asOf}:${key}`);
      }
    }
    if (frozen.length !== instrumentTransforms.length) mismatches.push(`${instrumentId}:row-count`);
  }
  return { computed, mismatches, instruments: observationsByInstrument.size };
}

async function readSelectedChannelRows(configurationIds) {
  const selected = new Map([...configurationIds].map((id) => [id, []]));
  const stream = fs.createReadStream(abs("audit/session16/channel-statistics.jsonl"), { encoding: "utf8", highWaterMark: 1024 * 1024 });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    const row = JSON.parse(line);
    if (selected.has(row.candidateConfigurationId)) selected.get(row.candidateConfigurationId).push(row);
  }
  return selected;
}

function findLatestCohort(channel, evaluationDate, transformLookup, parameters) {
  const possibleDates = new Set();
  for (const instrument of channel.instruments) {
    for (const row of transformLookup.get(instrument.instrumentId).values()) {
      if (row.zScore !== null && row.asOf <= evaluationDate && weekdayAge(row.asOf, evaluationDate) <= parameters.freshnessMaximumBusinessDays) possibleDates.add(row.asOf);
    }
  }
  for (const date of [...possibleDates].sort((left, right) => lexicalCompare(right, left))) {
    const readings = channel.instruments
      .map((instrument) => transformLookup.get(instrument.instrumentId).get(date))
      .filter((row) => row && row.zScore !== null);
    if (readings.length >= channel.minimumEligibleInstrumentCount) return readings;
  }
  return null;
}

function validateSelectedChannelRows(selectedRows, leafMap, computedTransforms, parameters) {
  const transformLookup = new Map();
  for (const row of computedTransforms) {
    if (!transformLookup.has(row.instrumentId)) transformLookup.set(row.instrumentId, new Map());
    transformLookup.get(row.instrumentId).set(row.asOf, row);
  }
  const mismatches = [];
  const results = {};
  for (const channel of leafMap.channels) {
    const rows = selectedRows.get(channel.session16SelectedConfigurationId).sort((left, right) => lexicalCompare(left.evaluationDate, right.evaluationDate));
    const assessed = [];
    for (const row of rows) {
      const cohort = findLatestCohort(channel, row.evaluationDate, transformLookup, parameters);
      if (!cohort) {
        if (row.status === "assessed") mismatches.push(`${channel.channelId}:${row.evaluationDate}:unexpected-assessed`);
        continue;
      }
      if (row.status !== "assessed") {
        mismatches.push(`${channel.channelId}:${row.evaluationDate}:unexpected-unassessed`);
        continue;
      }
      assessed.push(row);
      const ranked = [...cohort].sort((left, right) => right.absZScore - left.absZScore || lexicalCompare(left.instrumentId, right.instrumentId));
      const ids = cohort.map((item) => item.instrumentId).sort(lexicalCompare);
      if (!deepEqual(ids, [...row.includedInstrumentIds].sort(lexicalCompare))) mismatches.push(`${channel.channelId}:${row.evaluationDate}:included-ids`);
      if (row.marketAsOf !== cohort[0].asOf || row.maximumBusinessDayGapObserved !== 0 || row.mixedDates) mismatches.push(`${channel.channelId}:${row.evaluationDate}:same-date`);
      if (row.eligibleInstrumentCount !== cohort.length || row.minimumEligibleInstrumentCount !== channel.minimumEligibleInstrumentCount) mismatches.push(`${channel.channelId}:${row.evaluationDate}:quorum`);
      if (!almostEqual(row.M, ranked[0].absZScore) || row.driverInstrumentId !== ranked[0].instrumentId || !almostEqual(row.driverZ, ranked[0].zScore)) mismatches.push(`${channel.channelId}:${row.evaluationDate}:driver`);
      if ((ranked[1]?.instrumentId ?? null) !== row.secondDriverInstrumentId || !almostEqual(ranked[1]?.zScore ?? null, row.secondDriverZ)) mismatches.push(`${channel.channelId}:${row.evaluationDate}:second-driver`);
      const rawCount = cohort.filter((item) => item.absZScore >= parameters.diagnosticRawZThreshold).length;
      if (row.rawAboveThresholdCount !== rawCount || !almostEqual(row.rawBreadthRatio, rawCount / cohort.length)) mismatches.push(`${channel.channelId}:${row.evaluationDate}:raw-diagnostic`);
      for (const reading of row.includedInstrumentReadings) {
        const calculated = transformLookup.get(reading.instrumentId).get(reading.asOf);
        if (!calculated || !almostEqual(reading.zScore, calculated.zScore) || reading.windowStart !== calculated.windowStart || reading.windowEnd !== calculated.windowEnd || reading.historyCount !== calculated.historyCount || reading.businessDayAge !== weekdayAge(reading.asOf, row.evaluationDate) || reading.calendarAge !== calendarAge(reading.asOf, row.evaluationDate)) {
          mismatches.push(`${channel.channelId}:${row.evaluationDate}:${reading.instrumentId}:reading`);
        }
      }
    }

    const uniqueMarketObservations = new Map();
    for (const row of assessed) {
      const identity = `${row.marketAsOf}|${row.instrumentSetVersion}|${row.eligibleInstrumentCount}|${row.M}`;
      if (!uniqueMarketObservations.has(identity)) uniqueMarketObservations.set(identity, row);
    }
    const closes = [...uniqueMarketObservations.values()].sort((left, right) => lexicalCompare(left.marketAsOf, right.marketAsOf));
    const histories = new Map();
    let rawTriggers = 0;
    let available = 0;
    let insufficient = 0;
    let percentileTriggers = 0;
    for (const row of closes) {
      if (row.M >= parameters.diagnosticRawZThreshold) rawTriggers += 1;
      const conditioningKey = `${row.instrumentSetVersion}|${row.eligibleInstrumentCount}`;
      const fullHistory = histories.get(conditioningKey) ?? [];
      const prior = fullHistory.slice(-parameters.percentileRollingPriorObservationMaximum);
      if (prior.length < parameters.percentileMinimumConditionedPriorObservations) insufficient += 1;
      else {
        available += 1;
        const sorted = [...prior].sort((a, b) => a - b);
        const rank = Math.max(1, Math.ceil(parameters.percentileQuantile * sorted.length));
        const threshold = sorted[rank - 1];
        if (row.M > threshold) percentileTriggers += 1;
      }
      fullHistory.push(row.M);
      histories.set(conditioningKey, fullHistory);
    }
    results[channel.channelId] = { closes: closes.length, rawTriggers, thresholdAvailable: available, thresholdInsufficient: insufficient, percentileTriggers };
  }
  return { mismatches, results };
}

function renderReport(result) {
  const signal = result.signal;
  const market = result.market;
  const lines = [
    `# PA-08 round-two independent validation`,
    "",
    `Verdict: **${result.verdict}**`,
    "",
    `Corrected manifest identity: \`${result.manifestIdentity}\``,
    "",
    "This report was produced by the fresh round-two validator before the historical or expanded first-pass validators were run. The comparison field remains pending until the independent result is fixed.",
    "",
    "## Repository boundary",
    "",
    `- Branch/HEAD/origin: \`${result.repository.branch}\` / \`${result.repository.head}\` / \`${result.repository.originMaster}\``,
    `- Tracked/index clean: ${result.repository.trackedClean && result.repository.stagedClean}`,
    `- Frozen candidate trees preserved: ${result.repository.frozenTreesPreserved}`,
    "",
    "## Independently reproduced signal evidence",
    "",
    `- Fidelity B: ${signal.fidelityBObservations} observations; ${signal.exactDuplicateExcess} exact-duplicate excess.`,
    `- Manual disposition: ${signal.acceptedObservations} accepted; ${signal.unresolvedObservations}/${signal.manualObservations} unresolved; ${signal.activeClusters} active clusters.`,
    `- Origin status: ${signal.unknownOriginClusters}/${signal.activeClusters} unknown; ${signal.assessedIndependentSourceClusters}/${signal.activeClusters} assessed; corroboration ${signal.corroboration.singleOrigin}/${signal.corroboration.corroboratedIndependent}/${signal.corroboration.conflicting}/${signal.corroboration.unknownOrigin}.`,
    `- C-E2-S2: ${signal.cE2S2.qualifyingClusterRunChannelCount} contributions, ${signal.cE2S2.distinctClusters} clusters, ${signal.cE2S2.nonzeroCells}/${signal.cE2S2.totalCells} nonzero cells, ${signal.cE2S2.tieCells} ties, ${signal.cE2S2.topTieCells} top ties.`,
    "",
    "## Independently reproduced market and timing evidence",
    "",
    `- ${market.observations} observations across ${market.instruments} instruments produced ${market.transforms} transforms with ${market.transformMismatches} frozen-transform mismatches.`,
    `- Selected channel recomputation mismatches: ${market.selectedChannelMismatches}.`,
    `- Timing: ${result.timing.qualifyingCells} qualifying, ${result.timing.definitiveCells} definitive, ${result.timing.ambiguousCells} ambiguous, ${result.timing.causalClaims} causal claims.`,
    "",
    "| Channel | Closes | Raw triggers | Available | Insufficient | Percentile triggers |",
    "|---|---:|---:|---:|---:|---:|",
    ...Object.entries(market.channels).map(([channel, row]) => `| ${channel} | ${row.closes} | ${row.rawTriggers} | ${row.thresholdAvailable} | ${row.thresholdInsufficient} | ${row.percentileTriggers} |`),
    "",
    "## Corrected-defect and package results",
    "",
    ...result.checks.map((check) => `- ${check.status === "PASS" ? "PASS" : "FAIL"} — ${check.id}: ${check.summary}`),
    "",
    "## First-pass comparison",
    "",
    "Pending. It must be run only after this independent result is fixed.",
    "",
    "## Scope statement",
    "",
    "No repair, Session 18/19 implementation, publication, project-log entry, staging, commit, or push was performed.",
    "",
  ];
  return lines.join("\n");
}

async function runAudit() {
  const checks = [];
  const failures = [];
  function record(id, condition, summary, details = null) {
    const status = condition ? "PASS" : "FAIL";
    checks.push({ id, status, summary, details });
    if (!condition) failures.push({ id, summary, details });
  }

  const parsed = new Map();
  for (const file of JSON_INPUTS) parsed.set(file, readJson(file));
  const schema = parsed.get("methodology/2.0.0/schema.json");
  const parameters = parsed.get("methodology/2.0.0/parameters.json");
  const manifest = parsed.get("methodology/2.0.0/manifest.json");
  const positive = parsed.get("methodology/2.0.0/fixtures/positive.json");
  const negative = parsed.get("methodology/2.0.0/fixtures/negative.json");
  const leafMap = parsed.get("methodology/2.0.0/leaf-channel-map.json");
  const clustering = parsed.get("methodology/2.0.0/clustering-lifecycle-rules.json");
  const originRules = parsed.get("methodology/2.0.0/source-origin-rules.json");
  const deferrals = parsed.get("audit/session17/deferred-items.json");

  record("JSON-01", parsed.size === 15, `${parsed.size}/15 required JSON files parsed`);
  const references = countSchemaReferences(schema);
  record("SCHEMA-REF-01", references.count === 171 && references.unresolved.length === 0, `${references.count}/171 schema references resolved`, references);

  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const originMaster = git(["rev-parse", "origin/master"]);
  const [behindText, aheadText] = git(["rev-list", "--left-right", "--count", "origin/master...HEAD"]).split(/\s+/u);
  const staged = git(["diff", "--cached", "--name-only"]);
  const tracked = git(["diff", "--name-only"]);
  const status = git(["status", "--short", "--untracked-files=all"]);
  const statusPaths = status.split(/\r?\n/u).filter(Boolean).map((line) => line.slice(3).replaceAll("\\", "/"));
  const allowedStatus = statusPaths.every((item) => item.startsWith("audit/session16/") || item.startsWith("audit/session17/") || item.startsWith("methodology/"));
  const existingSession17TreeHash = treeHash("audit/session17", Object.keys(EXISTING_SESSION17_HASHES));
  const frozenTreesPreserved = treeHash("audit/session15") === INITIAL_CAPTURE.treeHashes["audit/session15"] &&
    treeHash("audit/session16") === INITIAL_CAPTURE.treeHashes["audit/session16"] &&
    treeHash("methodology/2.0.0") === INITIAL_CAPTURE.treeHashes["methodology/2.0.0"] &&
    existingSession17TreeHash === INITIAL_CAPTURE.treeHashes["audit/session17-existing"];
  record("BOUNDARY-01", branch === "master" && head === EXPECTED_HEAD && originMaster === EXPECTED_HEAD && Number(aheadText) === 0 && Number(behindText) === 0 && !staged && !tracked && allowedStatus && frozenTreesPreserved, "HEAD, origin, tracked/index state, untracked roots, and frozen tree identities match the initial capture", { branch, head, originMaster, ahead: Number(aheadText), behind: Number(behindText), statusPaths, frozenTreesPreserved });

  const existingHashFailures = Object.entries(EXISTING_SESSION17_HASHES).map(([file, expected]) => {
    const actual = sha256File(file);
    return { file, expected, actual };
  }).filter(({ expected, actual }) => actual !== expected);
  record("PA08-HISTORY-01", existingHashFailures.length === 0, "All ten pre-existing Session 17 files, including both earlier validation records, remain byte-identical", existingHashFailures);

  const manifestArtifactFailures = manifest.artifactIdentities.filter((item) => {
    const bytes = fs.statSync(abs(item.path)).size;
    return bytes !== item.bytes || sha256File(item.path) !== item.sha256;
  });
  record("IDENTITY-METHODOLOGY-01", manifest.artifactIdentities.length === 11 && manifestArtifactFailures.length === 0, `${manifest.artifactIdentities.length}/11 Methodology artifact identities reproduced`, manifestArtifactFailures);

  const evidenceFailures = manifest.evidenceIdentities.filter((item) => fs.statSync(abs(item.path)).size !== item.bytes || sha256File(item.path) !== item.sha256);
  record("IDENTITY-EVIDENCE-01", manifest.evidenceIdentities.length === 50 && evidenceFailures.length === 0, `${manifest.evidenceIdentities.length}/50 evidence identities reproduced`, evidenceFailures);

  const productionFailures = manifest.productionPreservationBaseline.filter((item) => sha256File(item.path) !== item.sha256);
  record("IDENTITY-PRODUCTION-01", manifest.productionPreservationBaseline.length === 12 && productionFailures.length === 0, `${manifest.productionPreservationBaseline.length}/12 production and legacy baselines reproduced`, productionFailures);

  const manifestProbe = execFileSync(process.execPath, [import.meta.filename, "--manifest-probe"], { cwd: ROOT, encoding: "utf8" }).trim();
  const manifestProbe2 = execFileSync(process.execPath, [import.meta.filename, "--manifest-probe"], { cwd: ROOT, encoding: "utf8" }).trim();
  record("IDENTITY-MANIFEST-01", manifest.selfIdentity.value === EXPECTED_MANIFEST_ID && manifestProbe === EXPECTED_MANIFEST_ID && manifestProbe2 === EXPECTED_MANIFEST_ID, "Corrected manifest self-identity reproduced twice in clean Node processes", { recorded: manifest.selfIdentity.value, probe1: manifestProbe, probe2: manifestProbe2 });
  record("IDENTITY-HISTORY-01", manifest.correction.supersedesFailedManifestIdentity === FAILED_MANIFEST_ID && manifest.correction.supersededResult.includes("FAIL") && manifest.correction.freshIndependentRevalidationRequired === true && manifest.correction.methodologySelectionsChanged === false, "Failed identity remains failed history and selections are explicitly unchanged");

  const session15Manifest = readJson("audit/session15/input-manifest.json");
  const preserved = session15Manifest.sourceEvidenceFiles.filter((item) => item.preservation?.copyPath);
  let preservationBytes = 0;
  const preservationFailures = [];
  for (const item of preserved) {
    const originalBytes = fs.readFileSync(abs(item.repositoryRelativePath));
    const copyBytes = fs.readFileSync(abs(item.preservation.copyPath));
    preservationBytes += copyBytes.length;
    if (!originalBytes.equals(copyBytes) || sha256Bytes(copyBytes) !== item.sha256 || sha256Bytes(copyBytes) !== item.preservation.copySha256) preservationFailures.push(item.repositoryRelativePath);
  }
  record("PRESERVATION-15-01", preserved.length === 11 && preservationBytes === 597000 && preservationFailures.length === 0, `${preserved.length}/11 Session 15 preservation copies and ${preservationBytes}/597000 bytes reproduced`, preservationFailures);

  const session16Manifest = readJson("audit/session16/input-manifest.json");
  const session16Self = clone(session16Manifest);
  session16Self.manifestHash.value = null;
  const session16SelfHash = sha256Text(stableJson(session16Self));
  const frozenInputFailures = [];
  for (const instrument of session16Manifest.inventory) {
    for (const entry of [instrument.rawResponse, instrument.normalizedSeries]) {
      if (fs.statSync(abs(entry.path)).size !== entry.byteCount || sha256File(entry.path) !== entry.sha256) frozenInputFailures.push(entry.path);
    }
  }
  record("PRESERVATION-16-01", session16Manifest.inventory.length === 14 && frozenInputFailures.length === 0 && session16Manifest.totals.normalizedObservationCount === 8669 && session16SelfHash === "308089d94d9b4f5825adb3204b99d3b421c85cd362c6d9e62e261037ff597d1d", "Session 16 manifest, 14 instruments, 28 frozen raw/normalized inputs, and canonical identity reproduced", { session16SelfHash, frozenInputFailures });

  const candidateRows = readJsonl("audit/session15/candidate-observations.jsonl");
  const fidelityB = candidateRows.filter((row) => row.fidelityStratum.startsWith("B-"));
  const uniqueNormalized = new Set(fidelityB.map((row) => row.content.conservativeNormalizedSha256)).size;
  const assignmentRows = readJsonl("audit/session15/assignment-ledger.jsonl");
  const finalAssignments = new Map();
  for (const row of assignmentRows) {
    const prior = finalAssignments.get(row.candidateObservationId);
    if (!prior || row.assignmentPass > prior.assignmentPass) finalAssignments.set(row.candidateObservationId, row);
  }
  const finalAssignmentValues = [...finalAssignments.values()];
  const accepted = finalAssignmentValues.filter((row) => row.assignmentDecision === "accepted");
  const unresolved = finalAssignmentValues.filter((row) => row.assignmentDecision === "unresolved-after-adjudication");
  const activeClusterIds = new Set(accepted.map((row) => row.eventClusterId.value));
  const clusterLedger = readJsonl("audit/session15/event-cluster-ledger.jsonl");
  const fieldAssessments = clusterLedger.filter((row) => row.recordType === "event-field-assessment");
  const unknownOrigin = fieldAssessments.filter((row) => row.independentSourceCount.status !== "assessed");
  const assessedOrigin = fieldAssessments.filter((row) => row.independentSourceCount.status === "assessed");
  const corroboration = { singleOrigin: 0, corroboratedIndependent: 0, conflicting: 0, unknownOrigin: 0 };
  const corroborationMap = { "single-origin": "singleOrigin", "corroborated-independent": "corroboratedIndependent", conflicting: "conflicting", "unknown-origin": "unknownOrigin" };
  for (const row of fieldAssessments) corroboration[corroborationMap[row.corroborationStatus.value]] += 1;
  const continuingRows = fieldAssessments.flatMap((row) => row.observationLifecycle.filter((item) => item.lifecycle.value === "continuing").map((item) => ({ row, item })));
  const continuingValid = continuingRows.every(({ item }) => item.materialChange.value === false) && fieldAssessments.every((row) => {
    const eligible = row.observationLifecycle.filter((item) => item.chronologyEligibility && item.observedAt.status === "assessed");
    const material = eligible.filter((item) => item.materialChange.status === "assessed" && item.materialChange.value === true);
    const lastObservedValid = row.auditLastObservedAt.status !== "assessed" || row.auditLastObservedAt.value === eligible.map((item) => item.observedAt.value).sort().at(-1);
    const lastMaterialValid = row.auditLastMaterialChangeAt.status !== "assessed" || row.auditLastMaterialChangeAt.value === material.map((item) => item.observedAt.value).sort().at(-1);
    return lastObservedValid && lastMaterialValid;
  });
  const acceptedChronologyIneligible = accepted.filter((row) => !row.chronologyEligible);

  const sensitivity = readJson("audit/session15/signal-elevation-sensitivity.json");
  const selectedVariant = sensitivity.candidateC.variants.find((row) => row.candidateId === "C-E2-S2");
  const nonzeroRankings = selectedVariant.rankings.filter((row) => row.qualifyingClusterCount > 0);
  const selectedClusterIds = new Set(nonzeroRankings.flatMap((row) => row.deterministicRankingOrder.map((item) => item.eventClusterId)));
  const selectedChannelCounts = {};
  for (const row of nonzeroRankings) selectedChannelCounts[row.channelId] = (selectedChannelCounts[row.channelId] ?? 0) + row.qualifyingClusterCount;
  const signal = {
    fidelityBObservations: fidelityB.length,
    exactDuplicateExcess: fidelityB.length - uniqueNormalized,
    manualObservations: finalAssignments.size,
    acceptedObservations: accepted.length,
    unresolvedObservations: unresolved.length,
    activeClusters: activeClusterIds.size,
    unknownOriginClusters: unknownOrigin.length,
    assessedIndependentSourceClusters: assessedOrigin.length,
    corroboration,
    continuingObservations: continuingRows.length,
    chronologyIneligibleAcceptedExcluded: acceptedChronologyIneligible.length,
    cE2S2: {
      qualifyingClusterRunChannelCount: nonzeroRankings.reduce((sum, row) => sum + row.qualifyingClusterCount, 0),
      distinctClusters: selectedClusterIds.size,
      nonzeroCells: nonzeroRankings.length,
      totalCells: selectedVariant.rankings.length,
      tieCells: selectedVariant.rankings.filter((row) => row.tieOrdinals.length > 0).length,
      topTieCells: selectedVariant.rankings.filter((row) => row.topRankTie).length,
      channelCounts: selectedChannelCounts,
    },
  };
  const signalExpected = signal.fidelityBObservations === 1153 && signal.exactDuplicateExcess === 834 && signal.manualObservations === 428 && signal.acceptedObservations === 327 && signal.unresolvedObservations === 101 && signal.activeClusters === 123 && signal.unknownOriginClusters === 21 && signal.assessedIndependentSourceClusters === 102 && deepEqual(corroboration, { singleOrigin: 97, corroboratedIndependent: 4, conflicting: 1, unknownOrigin: 21 }) && continuingRows.length === 184 && continuingValid && acceptedChronologyIneligible.length === 48 && signal.cE2S2.qualifyingClusterRunChannelCount === 82 && signal.cE2S2.distinctClusters === 62 && signal.cE2S2.nonzeroCells === 36 && signal.cE2S2.totalCells === 140 && signal.cE2S2.tieCells === 10 && signal.cE2S2.topTieCells === 9 && deepEqual(selectedChannelCounts, { "conflict-escalation": 55, "credit-stress": 2, "energy-disruption": 6, "sanctions-policy": 6, "supply-chain": 13 });
  record("SIGNAL-REGRESSION-01", signalExpected, "Session 15 counts, origin distribution, lifecycle clocks, chronology exclusion, and C-E2-S2 results reproduced", signal);

  const signalRulesValid = parameters.parameters.signal.selectedEvidenceFamily === "E2-resolved-single-or-independent" && parameters.parameters.signal.minimumIndependentOriginsForCorroboration === 2 && parameters.parameters.signal.minimumQualifyingActionStageOrdinal === 3 && deepEqual(parameters.parameters.signal.qualifyingLifecycleStates, ["new", "escalating", "de-escalating"]) && parameters.parameters.signal.maximumClusterContributionPerChannelPerRun === 1 && parameters.parameters.signal.scalarSignalScore === null && clustering.signalSelection.structuralRequirements.some((text) => text.includes("direct mechanism")) && clustering.lifecycle.signalEligibility.continuing === false && clustering.lifecycle.noDecayOrExpiry.includes("No time-based decay");
  record("SIGNAL-SELECTION-01", signalRulesValid, "Implemented/impact boundary, direct mechanisms, material transitions, E2 corroboration, one contribution, and no-decay behavior match the frozen package");

  const observations = readJsonl("audit/session16/instrument-observations.jsonl");
  const frozenTransforms = readJsonl("audit/session16/instrument-transforms.jsonl");
  const transforms = reconstructTransforms(observations, frozenTransforms);
  record("MARKET-TRANSFORM-01", observations.length === 8669 && transforms.computed.length === 8599 && transforms.instruments === 14 && transforms.mismatches.length === 0, `${transforms.computed.length}/8599 transforms independently rebuilt from ${observations.length}/8669 observations with zero mismatch`, transforms.mismatches.slice(0, 50));

  const selectedConfigurationIds = new Set(leafMap.channels.map((channel) => channel.session16SelectedConfigurationId));
  const selectedRows = await readSelectedChannelRows(selectedConfigurationIds);
  const selectedMarket = validateSelectedChannelRows(selectedRows, leafMap, transforms.computed, parameters.parameters.market);
  const expectedChannelResults = {
    "conflict-escalation": { closes: 361, rawTriggers: 158, thresholdAvailable: 224, thresholdInsufficient: 137, percentileTriggers: 56 },
    "credit-stress": { closes: 362, rawTriggers: 69, thresholdAvailable: 231, thresholdInsufficient: 131, percentileTriggers: 46 },
    "energy-disruption": { closes: 353, rawTriggers: 108, thresholdAvailable: 220, thresholdInsufficient: 133, percentileTriggers: 58 },
    "sanctions-policy": { closes: 361, rawTriggers: 117, thresholdAvailable: 231, thresholdInsufficient: 130, percentileTriggers: 69 },
    "supply-chain": { closes: 361, rawTriggers: 81, thresholdAvailable: 235, thresholdInsufficient: 126, percentileTriggers: 73 },
  };
  const marketParameters = parameters.parameters.market;
  const marketRulesValid = marketParameters.transformLookbackValidObservations === 5 && marketParameters.zHistoryValidTransformsMinimum === 252 && marketParameters.zHistoryValidTransformsMaximum === 252 && marketParameters.sampleStandardDeviationDegreesOfFreedomAdjustment === 1 && marketParameters.sameDateMaximumGapBusinessDays === 0 && marketParameters.freshnessMaximumBusinessDays === 3 && deepEqual(marketParameters.minimumEligibleInstrumentCountByMappedCount, { 2: 2, 3: 2, 4: 3 }) && marketParameters.percentileAlpha === 0.2 && marketParameters.percentileQuantile === 0.8 && marketParameters.percentileMinimumConditionedPriorObservations === 126 && marketParameters.percentileRollingPriorObservationMaximum === 252 && marketParameters.percentileComparison === "strictly-greater-than" && marketParameters.diagnosticRawZThreshold === 1.5 && marketParameters.breadthBinaryWeight === 0 && parameters.nonNumericRules.historyFallback.startsWith("No cross-set") && parameters.nonNumericRules.ties.includes("equal to the percentile threshold is not elevated");
  record("MARKET-SELECTED-01", selectedMarket.mismatches.length === 0 && deepEqual(selectedMarket.results, expectedChannelResults) && marketRulesValid, "Rule 2, age/gap/quorum, own-series z, conditioned prior-only percentile, strict comparison, no fallback, raw diagnostic, breadth, and channel outcomes reproduced", { results: selectedMarket.results, mismatches: selectedMarket.mismatches.slice(0, 50) });

  const timingRows = readJsonl("audit/session16/signal-market-timing.jsonl").filter((row) => row.signalCandidateId === "C-E2-S2" && row.qualifyingClusterCount > 0);
  const timing = {
    qualifyingCells: timingRows.length,
    definitiveCells: timingRows.filter((row) => row.timingStatus === "assessed-market-close-order-source-availability-unavailable").length,
    ambiguousCells: timingRows.filter((row) => row.timingStatus === "ambiguous-timing").length,
    causalClaims: timingRows.filter((row) => row.causalAttributionClaimed).length,
  };
  record("TIMING-01", deepEqual(timing, { qualifyingCells: 36, definitiveCells: 10, ambiguousCells: 26, causalClaims: 0 }), "C-E2-S2 timing reproduced without a causal-attribution conclusion", timing);

  const sourceNormalization = fs.readFileSync(abs("audit/session15/extract-candidate-observations.mjs"), "utf8");
  const normalizationSchema = schema.$defs.rawIdentity;
  const normalizationRules = clustering.normalizedContentIdentity;
  const normalizationHashPattern = schema.$defs.sha256.pattern;
  const automaticRules = clustering.clustering.automaticJoin;
  const normalizationValid = sourceNormalization.includes('.normalize("NFKC")') && sourceNormalization.includes('.replace(/\\r\\n?/g, "\\n")') && sourceNormalization.includes('.replace(/\\s+/gu, " ")') && normalizationRules.normalizationVersion === "crucix-session15-conservative-normalization/v1" && normalizationRules.unicodeHandling.includes("NFKC") && normalizationRules.caseHandling.startsWith("Preserve case") && normalizationRules.hashInput.includes("UTF-8") && normalizationRules.hashInput.includes("without BOM") && normalizationRules.hashInput.includes("terminal newline") && normalizationSchema.required.includes("normalizationVersion") && normalizationSchema.required.includes("normalizedContentHash") && normalizationSchema.required.includes("normalizedContentRetention") && normalizationHashPattern === "^[0-9a-f]{64}$" && automaticRules.allowedRuleIds.length === 2 && automaticRules.allowedRuleIds.includes("exact-source-incident-id") && automaticRules.allowedRuleIds.includes("exact-normalized-content-hash") && automaticRules.allowedOnlyWhen.some((text) => text.includes("normalizationVersion and normalizedContentHash exactly match")) && automaticRules.prohibitedMethods.some((text) => text.includes("fuzzy")) && automaticRules.prohibitedMethods.some((text) => text.includes("embedding")) && automaticRules.prohibitedMethods.some((text) => text.includes("token")) && automaticRules.prohibitedMethods.some((text) => text.includes("semantic")) && normalizeSession15("Ａlpha\r\n  alert") === "Alpha alert" && normalizeSession15("HTTP://Example.com/A?Q=1") === "HTTP://Example.com/A?Q=1" && sha256Text(normalizeSession15("Alpha alert")) !== sha256Text(normalizeSession15("Alpha ALERT"));
  record("DEFECT-A-NORMALIZATION", normalizationValid, "Exact Session 15 NFKC/line-ending/whitespace behavior, persisted version/hash, byte input, retention, exact paths, and prohibited fuzzy paths verified");

  const context = { schema, parameters, positive, negative };
  const positiveOutcomes = positive.cases.map((caseRecord) => ({ id: caseRecord.id, ...fixtureEvaluation(caseRecord, context) }));
  const negativeOutcomes = negative.cases.map((caseRecord) => ({ id: caseRecord.id, expectedReasonCode: caseRecord.expectedReasonCode, ...fixtureEvaluation(caseRecord, context) }));
  const positiveFailures = positiveOutcomes.filter((outcome) => !outcome.valid);
  const negativeFailures = negativeOutcomes.filter((outcome) => outcome.valid || outcome.reason !== outcome.expectedReasonCode);
  record("FIXTURES-01", positive.cases.length === 46 && negative.cases.length === 48 && positiveFailures.length === 0 && negativeFailures.length === 0, `${positive.cases.length}/46 positive and ${negative.cases.length}/48 negative fixtures produced the intended semantic outcomes`, { positiveFailures, negativeFailures });

  const adversarialIds = [
    "adversarial-assessed-enum-without-value",
    "adversarial-unknown-enum-with-value",
    "adversarial-independent-class-with-zero-origins",
    "adversarial-unknown-status-with-resolved-origin",
    "adversarial-automatic-assignment-without-rule-or-cluster",
    "adversarial-continuing-transition-marked-material",
    "adversarial-escalating-transition-marked-nonmaterial",
    "adversarial-eligible-reading-with-exclusion-and-no-window",
    "adversarial-assessed-market-with-null-statistic-and-empty-cohort",
    "adversarial-assessed-divergence-with-inconsistent-state",
  ];
  const adversarial = negativeOutcomes.filter((outcome) => adversarialIds.includes(outcome.id));
  record("DEFECT-B-ADVERSARIAL", adversarial.length === 10 && adversarial.every((outcome) => !outcome.valid && outcome.reason === outcome.expectedReasonCode), "All ten adversarial records were recreated and rejected at their intended invariant", adversarial);

  const bundle = positive.cases.find((item) => item.id === "complete-end-to-end-v2-bundle").input.record;
  const completeRecords = {
    candidate: bundle.candidates[0],
    originProvenance: bundle.originProvenance[0],
    assignment: bundle.assignments[0],
    eventCluster: bundle.registry.eventClusters[0],
    registry: bundle.registry,
    signalOutput: bundle.signalOutput,
    instrumentReading: bundle.marketOutput.channels[0].includedInstrumentReadings[0],
    marketChannelOutput: bundle.marketOutput.channels[0],
    marketOutput: bundle.marketOutput,
    divergenceOutput: bundle.divergenceOutput,
    runManifest: bundle.runManifest,
  };
  const completeSchemaFailures = PRODUCTION_DEFINITIONS.filter((definition) => schemaErrorsForDefinition(schema, definition, completeRecords[definition]).length > 0);
  const bundleSchemaErrors = schemaErrorsForDefinition(schema, "runBundle", bundle);
  const bundleSemanticErrors = bundleErrors(bundle, marketParameters.diagnosticRawZThreshold);
  record("COMPLETE-RECORDS-01", completeSchemaFailures.length === 0 && bundleSchemaErrors.length === 0 && bundleSemanticErrors.length === 0, "All 11 production definitions and the connected end-to-end run bundle are schema-valid and semantically connected", { completeSchemaFailures, bundleSchemaErrors, bundleSemanticErrors });

  const lifecycleRequired = ["firstSeen", "lastObservedAt", "lastMaterialChangeAt", "lifecycleStatus", "lifecycleAssessmentStatus", "assignmentVersion", "provenanceVersion", "parentSeriesIds", "lifecycleHistory", "provenanceIds"];
  const readingRequired = ["windowStart", "windowEnd", "asOf", "instrumentObservationDates", "actualWindowObservationCount", "historyCount", "instrumentSetVersion", "conditioningKey", "observationAgeCalendarDays", "businessDayAge", "freshnessStatus", "eligibilityStatus", "eligible", "exclusionReason", "zScoreAssessment"];
  const channelRequired = ["eligibleInstrumentCount", "includedInstrumentReadings", "driverInstrumentId", "driverZ", "secondDriverInstrumentId", "secondDriverZ", "numberAbovePercentileThreshold", "numberAboveRawDiagnosticThreshold", "breadthRatio"];
  const operationalRequired = lifecycleRequired.every((field) => schema.$defs.eventCluster.required.includes(field)) && readingRequired.every((field) => schema.$defs.instrumentReading.required.includes(field)) && channelRequired.every((field) => schema.$defs.marketChannelOutput.required.includes(field));
  const missingFieldFailures = [];
  for (const field of lifecycleRequired) {
    const recordValue = clone(completeRecords.eventCluster);
    delete recordValue[field];
    if (schemaErrorsForDefinition(schema, "eventCluster", recordValue).length === 0) missingFieldFailures.push(`eventCluster.${field}`);
  }
  for (const field of readingRequired) {
    const recordValue = clone(completeRecords.instrumentReading);
    delete recordValue[field];
    if (schemaErrorsForDefinition(schema, "instrumentReading", recordValue).length === 0) missingFieldFailures.push(`instrumentReading.${field}`);
  }
  for (const field of channelRequired) {
    const recordValue = clone(completeRecords.marketChannelOutput);
    delete recordValue[field];
    if (schemaErrorsForDefinition(schema, "marketChannelOutput", recordValue).length === 0) missingFieldFailures.push(`marketChannelOutput.${field}`);
  }
  const badLifecycle = clone(completeRecords.eventCluster);
  badLifecycle.firstSeen = "2026-08-02T12:00:00.000Z";
  const badReading = clone(completeRecords.instrumentReading);
  [badReading.instrumentObservationDates[1], badReading.instrumentObservationDates[2]] = [badReading.instrumentObservationDates[2], badReading.instrumentObservationDates[1]];
  record("DEFECT-C-OPERATIONAL", operationalRequired && missingFieldFailures.length === 0 && lifecycleErrors(badLifecycle).some((error) => error.startsWith("INV-LIFE-001")) && instrumentErrors(badReading).some((error) => error.startsWith("INV-MARKET-001")), "Lifecycle and market audit fields are required; independent missing-field and chronology mutations fail", missingFieldFailures);

  const provenance = completeRecords.originProvenance;
  const dangling = clone(provenance);
  dangling.provenanceEdges[0].toNodeId = "missing-origin";
  const selfEdge = clone(provenance);
  selfEdge.provenanceEdges[0].toNodeId = selfEdge.provenanceEdges[0].fromNodeId;
  const circular = clone(provenance);
  circular.provenanceEdges.push(
    { provenanceEdgeId: "origin-edge-cycle-a", fromNodeId: "assertion-direct-a", toNodeId: "origin-source-a", edgeType: "derived-from", assessmentStatus: "assessed", evidenceRefs: ["evidence-candidate-1"], assessmentVersion: 1 },
    { provenanceEdgeId: "origin-edge-cycle-b", fromNodeId: "origin-source-a", toNodeId: "assertion-direct-a", edgeType: "repeats", assessmentStatus: "assessed", evidenceRefs: ["evidence-candidate-1"], assessmentVersion: 1 },
  );
  circular.originEvidence.provenanceEdgeIds.push("origin-edge-cycle-a", "origin-edge-cycle-b");
  const topologyFixtureIds = ["thirty-syndicated-copies-one-group", "official-statement-quotations-one-group", "independent-direct-observation-second-group", "unknown-derivation-remains-noncorroborating", "conflicting-origins-do-not-increase-confidence"];
  const topologyFixturesValid = positiveOutcomes.filter((outcome) => topologyFixtureIds.includes(outcome.id)).every((outcome) => outcome.valid);
  record("DEFECT-D-TOPOLOGY", topologyErrors(provenance).length === 0 && topologyErrors(dangling).includes("origin-edge-dangling") && topologyErrors(selfEdge).includes("origin-edge-self-reference") && topologyErrors(circular).includes("origin-edge-cycle") && topologyFixturesValid && deepEqual(originRules.recoverableTopology.path, ["candidateId", "reportingSourceId", "assertionId", "reportingOriginId", "independenceGroupId"]), "Complete topology is recoverable; syndication/quotation/independence/unknown/conflict rules hold; dangling, self, broken, and circular edges fail");

  const arrayProperties = arraySchemaProperties(schema);
  const missingArrayPolicies = arrayProperties.filter((property) => !parameters.parameters.canonicalization.arrayPoliciesByProperty[property]);
  const canonicalFixture = positive.cases.find((item) => item.id === "canonical-complete-run-manifest-bytes").input;
  const bytesA = canonicalBytes(canonicalFixture.payloadA, parameters);
  const bytesB = canonicalBytes(canonicalFixture.payloadB, parameters);
  const canonicalProbe1 = JSON.parse(execFileSync(process.execPath, [import.meta.filename, "--canonical-probe"], { cwd: ROOT, encoding: "utf8" }));
  const canonicalProbe2 = JSON.parse(execFileSync(process.execPath, [import.meta.filename, "--canonical-probe"], { cwd: ROOT, encoding: "utf8" }));
  let sequenceRejected = false;
  try {
    canonicalize(negative.cases.find((item) => item.id === "canonical-sequence-history-out-of-order").input.sequence, parameters, "lifecycleHistory");
  } catch {
    sequenceRejected = true;
  }
  const canonicalProbePayload = { generatedAt: "2026-01-01T00:00:00.000Z", z: -0, rounded: 1.1234567890129, nullValue: null, unknown: { status: "unknown", reason: "unavailable", evidenceRefs: [] } };
  const deterministicProbe = canonicalBytes(canonicalProbePayload, parameters).toString("utf8");
  const canonicalValid = arrayProperties.length === 47 && missingArrayPolicies.length === 0 && bytesA.length === 924 && bytesA.at(-1) === 10 && bytesA.equals(bytesB) && bytesA.toString("utf8") === canonicalFixture.expectedCanonicalUtf8 && sha256Bytes(bytesA) === EXPECTED_CANONICAL_FIXTURE_HASH && deepEqual(canonicalProbe1, canonicalProbe2) && canonicalProbe1.bytes === 924 && canonicalProbe1.sha256 === EXPECTED_CANONICAL_FIXTURE_HASH && sequenceRejected && deterministicProbe.includes('"rounded":1.123456789013') && deterministicProbe.includes('"z":0') && deterministicProbe.includes('"nullValue":null') && !deterministicProbe.includes("generatedAt") && deterministicProbe.includes('"status":"unknown"');
  record("DEFECT-E-CANONICAL", canonicalValid, "All 47 schema arrays have policies; complete canonical bytes are 924 LF-terminated bytes with the expected hash in two clean processes; sequence errors reject; numbers/null/unknown/volatile handling is deterministic", { arrayProperties: arrayProperties.length, missingArrayPolicies, canonicalProbe1, canonicalProbe2 });

  const mutableTraceFiles = [
    ...listFiles("methodology/2.0.0").map((file) => path.relative(ROOT, file).replaceAll("\\", "/")),
    "audit/session17/correction-report.md",
    "audit/session17/decision-register.json",
    "audit/session17/deferred-items.json",
    "audit/session17/freeze-report.md",
    "audit/session17/parameter-traceability.json",
    "audit/session17/validation-report.md",
  ];
  const conflatedTraceClaim = `${signal.unresolvedObservations}/${signal.activeClusters}`;
  const badClaims = mutableTraceFiles.filter((file) => fs.readFileSync(abs(file), "utf8").includes(conflatedTraceClaim));
  const traceText = mutableTraceFiles.map((file) => fs.readFileSync(abs(file), "utf8")).join("\n");
  const correctTracePhrases = ["101/428", "21/123", "102/123"].every((phrase) => traceText.includes(phrase));
  record("DEFECT-F-TRACEABILITY", badClaims.length === 0 && correctTracePhrases && signal.unresolvedObservations === 101 && signal.manualObservations === 428 && signal.unknownOriginClusters === 21 && signal.assessedIndependentSourceClusters === 102, "Observation and cluster denominators are separated throughout the corrected package and mutable reports", { badClaims });

  const deferralFields = ["whyEvidenceIsInsufficient", "safeSession18Or19Behavior", "blockEffect", "evidenceNeeded", "futureGate"];
  const deferralsValid = deferrals.items.length === 6 && deferrals.items.every((item) => deferralFields.every((field) => typeof item[field] === "string" && item[field].length > 0)) && sha256File("audit/session17/deferred-items.json") === EXPECTED_DEFERRAL_HASH;
  const pa09 = deferrals.items.find((item) => item.deferredItemId === "DEF-003");
  record("DEFERRALS-01", deferralsValid && pa09.blockEffect.includes("does not block isolated parallel implementation") && pa09.blockEffect.includes("blocks public cutover"), "All six bounded deferrals are byte-identical and carry safe behavior, blocking effect, evidence, and future gate; PA-09 remains the cutover blocker");

  const selectedConstants = {
    signalEvidence: parameters.parameters.signal.selectedEvidenceFamily,
    stageOrdinal: parameters.parameters.signal.minimumQualifyingActionStageOrdinal,
    lookback: marketParameters.transformLookbackValidObservations,
    zHistory: marketParameters.zHistoryValidTransformsMaximum,
    gap: marketParameters.sameDateMaximumGapBusinessDays,
    age: marketParameters.freshnessMaximumBusinessDays,
    quorums: marketParameters.minimumEligibleInstrumentCountByMappedCount,
    alpha: marketParameters.percentileAlpha,
    historyMinimum: marketParameters.percentileMinimumConditionedPriorObservations,
    historyMaximum: marketParameters.percentileRollingPriorObservationMaximum,
    breadthWeight: marketParameters.breadthBinaryWeight,
  };
  const decisions = parsed.get("audit/session17/decision-register.json");
  const decisionRefsPresent = decisions.decisions.filter((item) => item.status === "frozen").every((item) => item.contractRefs?.length > 0);
  const noSelectedSimilarity = clustering.clustering.automaticJoin.confidenceScalar === null && clustering.clustering.automaticJoin.similarityThreshold === null && clustering.clustering.automaticJoin.timeWindow === null && clustering.clustering.automaticJoin.locationWindow === null;
  record("CONSTANTS-01", decisionRefsPresent && noSelectedSimilarity && selectedConstants.signalEvidence === "E2-resolved-single-or-independent" && selectedConstants.stageOrdinal === 3 && selectedConstants.lookback === 5 && selectedConstants.zHistory === 252 && selectedConstants.gap === 0 && selectedConstants.age === 3 && deepEqual(selectedConstants.quorums, { 2: 2, 3: 2, 4: 3 }) && selectedConstants.alpha === 0.2 && selectedConstants.historyMinimum === 126 && selectedConstants.historyMaximum === 252 && selectedConstants.breadthWeight === 0, "All selected domain constants resolve to parameters.json; deferred similarity/decay/storage choices remain unselected", selectedConstants);

  const diffCheck = execFileSync("git", ["diff", "--check"], { cwd: ROOT, encoding: "utf8" }).trim();
  record("SCOPE-01", !diffCheck && !staged && !tracked && allowedStatus && sha256File("CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md") === "4c67b4220f7ec3e30e0b878c22c24ed9656d86be595df659255bd47325f8939d", "No forbidden path, legacy output, project log, index, or tracked file changed; git diff --check passed; no Session 18/19 implementation or publication exists");

  const verdict = failures.length === 0 ? "PA-08 R2 PASS" : "PA-08 R2 FAIL";
  const result = {
    recordType: "pa-08-round-two-independent-validation",
    schemaVersion: "crucix-pa08-independent-r2/v1",
    verdict,
    manifestIdentity: manifest.selfIdentity.value,
    failedManifestIdentity: manifest.correction.supersedesFailedManifestIdentity,
    independentResultFixedBeforeFirstPassComparison: true,
    firstPassComparison: { status: "pending-after-independent-result-fixed", command: "node audit/session17/validate-freeze.mjs" },
    repository: {
      initialCapture: INITIAL_CAPTURE,
      branch,
      head,
      originMaster,
      ahead: Number(aheadText),
      behind: Number(behindText),
      trackedClean: !tracked,
      stagedClean: !staged,
      statusPathsAtIndependentExecution: statusPaths,
      frozenTreesPreserved,
      existingSession17TreeHash,
    },
    signal,
    market: {
      observations: observations.length,
      instruments: transforms.instruments,
      transforms: transforms.computed.length,
      transformMismatches: transforms.mismatches.length,
      selectedChannelMismatches: selectedMarket.mismatches.length,
      channels: selectedMarket.results,
    },
    timing,
    fixtures: {
      positive: positive.cases.length,
      negative: negative.cases.length,
      total: positive.cases.length + negative.cases.length,
      positiveFailures,
      negativeFailures,
      adversarial,
    },
    schema: { jsonFilesParsed: parsed.size, references: references.count, unresolvedReferences: references.unresolved, productionDefinitions: PRODUCTION_DEFINITIONS.length, arrayProperties: arrayProperties.length, missingArrayPolicies },
    canonical: { bytes: bytesA.length, sha256: sha256Bytes(bytesA), cleanProcessProbe1: canonicalProbe1, cleanProcessProbe2: canonicalProbe2 },
    identities: { methodologyArtifacts: manifest.artifactIdentities.length, evidenceArtifacts: manifest.evidenceIdentities.length, productionBaselines: manifest.productionPreservationBaseline.length, session15PreservationCopies: preserved.length, session15PreservationBytes: preservationBytes, session16FrozenRawAndNormalizedInputs: session16Manifest.inventory.length * 2 },
    checks,
    failures,
    materialDefects: failures,
    nonBlockingObservations: ["PA-09 durable storage/retention remains a public-cutover blocker but does not block isolated parallel implementation."],
    scopeConfirmation: "Nothing was repaired, staged, committed, pushed, implemented, published, or entered into the project log.",
  };
  fs.writeFileSync(RESULTS_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(REPORT_PATH, renderReport(result), "utf8");
  console.log(`${verdict}: ${checks.filter((check) => check.status === "PASS").length}/${checks.length} independent groups passed.`);
  if (failures.length) for (const failure of failures) console.error(`FAIL ${failure.id}: ${failure.summary}`);
  process.exitCode = failures.length ? 1 : 0;
}

if (process.argv[2] === "--manifest-probe") {
  const manifest = readJson("methodology/2.0.0/manifest.json");
  manifest.selfIdentity.value = null;
  process.stdout.write(sha256Text(stableJson(manifest)));
} else if (process.argv[2] === "--canonical-probe") {
  const parameters = readJson("methodology/2.0.0/parameters.json");
  const positive = readJson("methodology/2.0.0/fixtures/positive.json");
  const fixture = positive.cases.find((item) => item.id === "canonical-complete-run-manifest-bytes").input;
  const bytes = canonicalBytes(fixture.payloadA, parameters);
  process.stdout.write(JSON.stringify({ bytes: bytes.length, sha256: sha256Bytes(bytes), exact: bytes.toString("utf8") === fixture.expectedCanonicalUtf8 }));
} else {
  await runAudit();
}
