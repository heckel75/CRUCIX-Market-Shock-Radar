/**
 * Session 15 Step-B audit-only candidate extractor.
 *
 * This file intentionally reproduces, rather than improves, the current
 * production behavior in scripts/market-shock-radar.mjs:
 *
 * - MAX_CANDIDATES default 400 and MAX_RESULTS default 15;
 * - SHOCK_RULES and TEXT_KEYS in production source order;
 * - normalizeText, isUsefulText, collectObjectText, extractCandidates;
 * - the legacy lowercase/punctuation-stripped/220-character canonical key;
 * - keywordRegex, sourcePriority, scoreCandidate, and confidence thresholds;
 * - isDashboardReadySignal filters in production order;
 * - stable descending score sort followed by top-15 truncation.
 *
 * Audit additions collect provenance/metadata from the already-selected object
 * node, apply the Session 14 conservative normalization, and generate stable
 * hash-based audit IDs. They do not change legacy extraction or selection.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const REPO = process.cwd();
const INPUT_MANIFEST_PATH = "audit/session15/input-manifest.json";
const INVENTORY_PATH = "audit/session15/inventory.json";
const OUTPUT_PATH = "audit/session15/candidate-observations.jsonl";
const PRODUCTION_SCRIPT_PATH = "scripts/market-shock-radar.mjs";
const HELPER_PATH = "audit/session15/extract-candidate-observations.mjs";
const EXPECTED_INPUT_MANIFEST_HASH =
  "3a864319add335d4f2fb3550fa8b865a6282d29f4a37819200e516106cdf3651";
const EXPECTED_AUDIT_PROTOCOL_HASH =
  "6d29f97737a3b9d589c826846613863699cdbc5e4e90e88aba65d815dfd9d670";
const MAX_CANDIDATES = 400;
const MAX_RESULTS = 15;

const SHOCK_RULES = [
  {
    category: "Energy Shock",
    weight: 4,
    channels: ["Oil", "Natural Gas", "Inflation Expectations", "Energy Equities", "FX"],
    keywords: [
      "oil", "brent", "wti", "crude", "gas", "lng", "pipeline", "refinery",
      "opec", "hormuz", "red sea", "energy", "diesel", "fuel", "uranium",
    ],
  },
  {
    category: "Geopolitical Escalation",
    weight: 5,
    channels: ["Gold", "VIX", "Oil", "Defense Equities", "Safe-haven FX"],
    keywords: [
      "war", "strike", "missile", "attack", "invasion", "escalation", "conflict",
      "military", "troops", "border", "drone", "airstrike", "naval", "nuclear",
      "iran", "israel", "russia", "ukraine", "china", "taiwan", "gaza",
    ],
  },
  {
    category: "Sanctions / Policy Shock",
    weight: 4,
    channels: ["FX", "Commodities", "Emerging Markets", "Credit", "Equities"],
    keywords: [
      "sanction", "tariff", "export control", "ban", "embargo", "policy",
      "regulation", "freeze", "blacklist", "trade restriction", "customs",
      "quota", "subsidy", "election", "legislation",
    ],
  },
  {
    category: "Credit Stress",
    weight: 5,
    channels: ["High Yield Credit", "Banks", "Treasuries", "Dollar Funding", "Equities"],
    keywords: [
      "default", "bankruptcy", "debt", "liquidity", "credit", "spread",
      "bank", "deposit", "solvency", "downgrade", "restructuring", "bailout",
      "contagion", "funding stress",
    ],
  },
  {
    category: "Supply Chain Disruption",
    weight: 4,
    channels: ["Industrials", "Semiconductors", "Shipping", "Commodities", "Margins"],
    keywords: [
      "supply chain", "port", "shipping", "freight", "container", "blockade",
      "chokepoint", "canal", "factory", "shortage", "semiconductor", "chips",
      "logistics", "rail", "strike", "disruption",
    ],
  },
  {
    category: "Macro / Inflation Shock",
    weight: 3,
    channels: ["Rates", "Treasuries", "FX", "Equities", "Gold"],
    keywords: [
      "inflation", "cpi", "ppi", "rates", "fed", "ecb", "central bank",
      "yield", "treasury", "recession", "growth", "gdp", "unemployment",
      "jobs", "wages", "pce", "stagflation",
    ],
  },
  {
    category: "Weather / Climate Shock",
    weight: 3,
    channels: ["Agriculture", "Insurance", "Utilities", "Energy", "Commodities"],
    keywords: [
      "hurricane", "storm", "flood", "drought", "wildfire", "heatwave",
      "cold snap", "earthquake", "weather", "climate", "crop", "harvest",
      "el nino", "la nina",
    ],
  },
  {
    category: "Market Volatility Signal",
    weight: 3,
    channels: ["VIX", "Equities", "Credit", "FX", "Rates"],
    keywords: [
      "volatility", "selloff", "risk-off", "panic", "drawdown", "crash",
      "rally", "equities", "stocks", "market", "futures", "vix",
      "safe haven", "liquidation",
    ],
  },
];

const TEXT_KEYS = new Set([
  "title",
  "headline",
  "name",
  "summary",
  "description",
  "text",
  "body",
  "content",
  "message",
  "event",
  "signal",
  "note",
  "reason",
  "label",
  "country",
  "region",
  "sector",
  "source",
]);

const LEGACY_REPRODUCTION_SPEC = {
  ruleId: "crucix-legacy-candidate-reproduction/session15-step-b/v1",
  productionScriptPath: PRODUCTION_SCRIPT_PATH,
  defaults: { maxCandidates: MAX_CANDIDATES, maxResults: MAX_RESULTS },
  functions: [
    "normalizeText",
    "isUsefulText",
    "collectObjectText",
    "extractCandidates",
    "keywordRegex",
    "sourcePriority",
    "scoreCandidate",
    "isDashboardReadySignal",
  ],
  textKeys: [...TEXT_KEYS],
  shockRules: SHOCK_RULES,
  candidateTraversal:
    "Depth-first object/array traversal in JavaScript property order; stop once 400 retained candidates exist.",
  usefulText:
    "Direct scalar values only; normalize whitespace; require at least 8 characters; reject URL-only and numeric-only values; join unique eligible values with ' | '.",
  legacyCanonicalText:
    "Lowercase; remove optional ' | new urgent osint post'; collapse whitespace; remove non-letter/non-number/non-space characters; truncate to 220 characters.",
  scoringAndSelection:
    "Apply production keyword rules and confidence thresholds, discard unmatched candidates, apply production dashboard filters, stable-sort by descending score, retain first 15.",
};

const AUDIT_RULES_SPEC = {
  ruleId: "crucix-session15-step-b-normalization-and-ids/v1",
  conservativeNormalization: [
    "Preserve the extracted legacy candidate string and its UTF-8 SHA-256.",
    "Unicode-normalize to NFKC.",
    "Normalize CRLF and CR line endings to LF.",
    "Trim and collapse Unicode whitespace to a single ASCII space.",
    "Retain punctuation, numbers, negation, named entities, and attribution.",
    "Create a lowercase comparison copy only for exact/canonical duplicate comparison.",
    "Do not translate, summarize, complete, de-attribute, or repair content.",
  ],
  candidateObservationId:
    "cand_sha256_<SHA-256 of UTF-8 canonical JSON containing scheme, runId, sourceInputPath, sourceRecordLocator, legacyObjectPath, sourceProvidedIds, and rawContentSha256>.",
  normalizedContentId:
    "norm_sha256_<the conservative normalized UTF-8 content SHA-256>.",
  reportingSourceId:
    "reporting_source_sha256_<SHA-256 of UTF-8 canonical JSON containing scheme, derivation, and observed reporting-source values>.",
  canonicalJson:
    "Recursively sort object keys lexicographically by JavaScript UTF-16 code units; preserve array order; JSON-encode primitives; omit insignificant whitespace.",
  bRunId:
    "audit_b_run_sha256_<SHA-256 of canonical JSON containing input-manifest hash, retained payload ID, internal run timestamp, and canonical payload hash>.",
  cRunId:
    "audit_c_evidence_sha256_<SHA-256 of canonical JSON containing input-manifest hash, source input path, and frozen source file hash>.",
};

const SOURCE_ID_KEY = /^(?:id|_id|uuid|guid|uri|url|link|slug|code|symbol|callsign|icao24|catalogVersion)$|(?:Id|ID|_id|_url|Url|URL|_uri|Uri|URI|_link|Link)$/;
const REPORTING_SOURCE_KEY = /^(?:channel|channelName|outlet|publisher|source|feed|provider|author|site|domain)$/i;
const EXPLICIT_PUBLICATION_EVENT_TIME_KEY = /^(?:publishedAt|published_at|published|pubDate|publicationDate|datePublished|eventDate|event_date|eventTime|event_time|occurredAt|occurred_at|occurrenceTime|occurrence_time|startTime|start_time|endTime|end_time)$/i;
const OTHER_TIME_KEY = /(?:timestamp|date|time|At)$/i;

function absolute(relativePath) {
  return path.resolve(REPO, relativePath);
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Text(value) {
  return sha256Buffer(Buffer.from(value, "utf8"));
}

function sha256File(relativePath) {
  return sha256Buffer(fs.readFileSync(absolute(relativePath)));
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return JSON.stringify(value);
    case "object":
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
        .join(",")}}`;
    default:
      throw new Error(`Unsupported canonical JSON type: ${typeof value}`);
  }
}

function canonicalSha256(value) {
  return sha256Text(canonicalJson(value));
}

function assessed(value, evidence = undefined) {
  const result = { status: "assessed", value, reasonCode: null };
  if (evidence !== undefined) result.evidence = evidence;
  return result;
}

function unknown(reasonCode, evidence = undefined) {
  const result = { status: "unknown", value: null, reasonCode };
  if (evidence !== undefined) result.evidence = evidence;
  return result;
}

function unassessed(reasonCode) {
  return { status: "unassessed", value: null, reasonCode };
}

function notApplicable(reasonCode) {
  return { status: "not-applicable", value: null, reasonCode };
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulText(value) {
  const text = normalizeText(value);
  if (text.length < 8) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^\d+(\.\d+)?$/.test(text)) return false;
  return true;
}

function collectObjectText(obj) {
  const parts = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;

    const lowerKey = key.toLowerCase();

    if (typeof value === "string" || typeof value === "number") {
      if (TEXT_KEYS.has(lowerKey) && isUsefulText(value)) {
        parts.push(normalizeText(value));
      }
    }
  }

  return [...new Set(parts)].join(" | ");
}

function legacyCanonicalText(objectText) {
  return objectText
    .toLowerCase()
    .replace(/\s*\|\s*new urgent osint post\s*/gi, "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .slice(0, 220);
}

function extractCandidates(data) {
  const candidates = [];
  const seen = new Set();

  function visit(node, pathName = "root") {
    if (candidates.length >= MAX_CANDIDATES) return;

    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${pathName}[${index}]`));
      return;
    }

    if (!node || typeof node !== "object") return;

    const objectText = collectObjectText(node);

    if (objectText) {
      const canonicalText = legacyCanonicalText(objectText);

      if (!seen.has(canonicalText)) {
        seen.add(canonicalText);
        candidates.push({
          path: pathName,
          text: objectText,
          sourceNode: node,
          legacyCanonicalText: canonicalText,
          legacyCandidateIndex: candidates.length,
        });
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === "object") {
        visit(value, `${pathName}.${key}`);
      }
    }
  }

  visit(data);
  return candidates;
}

function keywordRegex(keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

function sourcePriority(pathName) {
  if (/tg\.urgent|chokepoints|nuke|nukeSignals|energy|markets|treasury|metals|defense/i.test(pathName)) {
    return "High";
  }

  if (/news|newsFeed|gdelt|air|health/i.test(pathName)) {
    return "Medium";
  }

  return "Low";
}

function scoreCandidate(candidate) {
  const text = candidate.text;
  const categoryHits = [];

  for (const rule of SHOCK_RULES) {
    const matchedKeywords = rule.keywords.filter((keyword) => keywordRegex(keyword).test(text));

    if (matchedKeywords.length > 0) {
      const rawScore = matchedKeywords.length * rule.weight;
      categoryHits.push({
        category: rule.category,
        rawScore,
        matchedKeywords,
        channels: rule.channels,
      });
    }
  }

  if (categoryHits.length === 0) return null;

  categoryHits.sort((a, b) => b.rawScore - a.rawScore);

  const totalRawScore = categoryHits.reduce((sum, hit) => sum + hit.rawScore, 0);
  const primary = categoryHits[0];

  let confidence = "Low";
  if (totalRawScore >= 18 || primary.matchedKeywords.length >= 4) confidence = "High";
  else if (totalRawScore >= 8 || primary.matchedKeywords.length >= 2) confidence = "Medium";

  return {
    path: candidate.path,
    sourcePriority: sourcePriority(candidate.path),
    category: primary.category,
    score: totalRawScore,
    confidence,
    channels: [...new Set(categoryHits.flatMap((hit) => hit.channels))],
    matchedKeywords: [...new Set(categoryHits.flatMap((hit) => hit.matchedKeywords))],
    otherCategories: categoryHits.slice(1).map((hit) => hit.category),
    text,
  };
}

function isDashboardReadySignal(item) {
  const text = item.text.trim();

  if (/^root\.chokepoints/i.test(item.path)) return true;
  if (/^root\.markets\./i.test(item.path)) return false;
  if (/^root\.(bls|fred|treasury|metals)\b/i.test(item.path) && text.length < 80) return false;
  if (text.length < 35 && !/^root\.(chokepoints|nuke|nukeSignals|energy|defense)\b/i.test(item.path)) {
    return false;
  }
  if (/^root\.sdr\./i.test(item.path)) return false;
  if (item.confidence === "Low" && item.sourcePriority !== "High") return false;

  return true;
}

function conservativeNormalize(rawText) {
  return rawText
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/\s+/gu, " ");
}

function directScalarEntries(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return [];
  return Object.entries(node).filter(
    ([, value]) => value != null && ["string", "number", "boolean"].includes(typeof value),
  );
}

function collectSourceProvidedIds(node) {
  return directScalarEntries(node)
    .filter(([key]) => SOURCE_ID_KEY.test(key))
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key, "en") || String(a.value).localeCompare(String(b.value), "en"));
}

function collectExplicitPublicationEventTimes(node) {
  return directScalarEntries(node)
    .filter(([key]) => EXPLICIT_PUBLICATION_EVENT_TIME_KEY.test(key))
    .map(([key, value]) => ({ key, value }));
}

function collectOtherTimeFields(node) {
  return directScalarEntries(node)
    .filter(
      ([key]) =>
        OTHER_TIME_KEY.test(key) && !EXPLICIT_PUBLICATION_EVENT_TIME_KEY.test(key),
    )
    .map(([key, value]) => ({ key, value, semantics: "not-promoted-to-publication-or-event-time" }));
}

function collectorFromLegacyPath(legacyPath) {
  const sourceMatch = /^root\.sources\.([^.[\]]+)/.exec(legacyPath);
  if (sourceMatch) return `collector:${sourceMatch[1]}`;
  const rootMatch = /^root\.([^.[\]]+)/.exec(legacyPath);
  if (rootMatch && rootMatch[1] !== "items" && rootMatch[1] !== "rows" && rootMatch[1] !== "signalOnly") {
    return `collector:${rootMatch[1]}`;
  }
  return null;
}

function reportingSourceAssessment(node, legacyPath) {
  const direct = directScalarEntries(node)
    .filter(([key]) => REPORTING_SOURCE_KEY.test(key))
    .map(([key, value]) => ({ key, value: String(value) }))
    .sort((a, b) => a.key.localeCompare(b.key, "en") || a.value.localeCompare(b.value, "en"));
  const collector = collectorFromLegacyPath(legacyPath);
  let derivation;
  let observedValues;

  if (direct.length > 0) {
    derivation = "source-record-direct-field";
    observedValues = direct;
  } else if (collector) {
    derivation = "legacy-path-collector-namespace";
    observedValues = [{ key: "collectorPath", value: collector }];
  } else {
    return {
      reportingSource: unknown("no-reporting-source-field-or-collector-namespace"),
      reportingSourceId: unknown("no-reporting-source-identity-available"),
    };
  }

  const idHash = canonicalSha256({
    scheme: "crucix-session15-reporting-source-id/v1",
    derivation,
    observedValues,
  });
  return {
    reportingSource: assessed({ derivation, observedValues }),
    reportingSourceId: assessed(`reporting_source_sha256_${idHash}`),
  };
}

function getByLocator(root, locator) {
  if (locator === "root") return root;
  const tokens = [];
  const suffix = locator.replace(/^root/, "");
  const pattern = /\.([^.[\]]+)|\[(\d+)\]/g;
  let match;
  while ((match = pattern.exec(suffix)) !== null) {
    tokens.push(match[1] !== undefined ? match[1] : Number(match[2]));
  }
  let value = root;
  for (const token of tokens) value = value?.[token];
  return value;
}

function bRunId(payload) {
  return `audit_b_run_sha256_${canonicalSha256({
    scheme: "crucix-session15-b-run-id/v1",
    inputManifestHash: EXPECTED_INPUT_MANIFEST_HASH,
    retainedPayloadId: payload.retainedPayloadId,
    internalRunTimestamp: payload.internalRunTimestamp,
    canonicalPayloadSha256: payload.canonicalPayloadSha256,
  })}`;
}

function cRunId(sourceInputPath, sourceInputSha256) {
  return `audit_c_evidence_sha256_${canonicalSha256({
    scheme: "crucix-session15-c-evidence-id/v1",
    inputManifestHash: EXPECTED_INPUT_MANIFEST_HASH,
    sourceInputPath,
    sourceInputSha256,
  })}`;
}

function candidateId({
  runId,
  sourceInputPath,
  sourceRecordLocator,
  legacyObjectPath,
  sourceProvidedIds,
  rawContentSha256,
}) {
  return `cand_sha256_${canonicalSha256({
    scheme: "crucix-session15-candidate-observation-id/v1",
    runId,
    sourceInputPath,
    sourceRecordLocator,
    legacyObjectPath,
    sourceProvidedIds,
    rawContentSha256,
  })}`;
}

function contentFields(rawText) {
  const normalizedText = conservativeNormalize(rawText);
  const normalizedContentSha256 = sha256Text(normalizedText);
  const comparisonLowercaseText = normalizedText.toLowerCase();
  const canonicalText = legacyCanonicalText(rawText);
  return {
    rawText,
    retentionStatus: "full-local-audit-only-license-and-privacy-review-required-before-commit",
    rawContentSha256: sha256Text(rawText),
    conservativeNormalizedText: normalizedText,
    conservativeNormalizedSha256: normalizedContentSha256,
    lowercaseComparisonSha256: sha256Text(comparisonLowercaseText),
    legacyCanonicalTextKey: canonicalText,
    legacyCanonicalTextSha256: sha256Text(canonicalText),
    normalizedContentId: `norm_sha256_${normalizedContentSha256}`,
  };
}

function sourceRecordAssessment(node, legacyPath) {
  const ids = collectSourceProvidedIds(node);
  const explicitTimes = collectExplicitPublicationEventTimes(node);
  const otherTimes = collectOtherTimeFields(node);
  const reporting = reportingSourceAssessment(node, legacyPath);
  return {
    sourceProvidedIds:
      ids.length > 0
        ? assessed(ids)
        : unknown("source-record-has-no-recognized-direct-identifier-field"),
    publicationOrEventTimestamps:
      explicitTimes.length > 0
        ? assessed(explicitTimes)
        : unknown("source-record-has-no-explicit-publication-or-event-time-field"),
    otherSourceProvidedTimeFields:
      otherTimes.length > 0
        ? assessed(otherTimes)
        : unknown("source-record-has-no-other-direct-time-like-field"),
    ...reporting,
  };
}

function legacyAssessmentFromB(candidate, score, dashboardReady, selectedRank) {
  const selected = selectedRank != null;
  return {
    reproductionStatus: assessed("reproduced-from-frozen-payload-with-current-production-code-defaults"),
    sourcePriority: assessed(sourcePriority(candidate.path)),
    keywordMatched: assessed(score != null),
    category: score ? assessed(score.category) : notApplicable("legacy-keyword-classifier-did-not-match"),
    score: score ? assessed(score.score) : notApplicable("legacy-keyword-classifier-did-not-match"),
    confidence: score ? assessed(score.confidence) : notApplicable("legacy-keyword-classifier-did-not-match"),
    channels: score ? assessed(score.channels) : notApplicable("legacy-keyword-classifier-did-not-match"),
    matchedKeywords: score
      ? assessed(score.matchedKeywords)
      : notApplicable("legacy-keyword-classifier-did-not-match"),
    otherCategories: score
      ? assessed(score.otherCategories)
      : notApplicable("legacy-keyword-classifier-did-not-match"),
    dashboardReadyAfterLegacyFilters: assessed(Boolean(score && dashboardReady)),
    enteredLegacyTop15: assessed(selected),
    legacyTop15Rank: selected ? assessed(selectedRank) : notApplicable("not-in-reproduced-top-15"),
    legacyPath: assessed(candidate.path),
    caveats: [
      "Reproduction uses the frozen current production script and its default 400/15 limits.",
      "Historical script revision and historical environment-variable overrides are not retained by the B payload.",
    ],
  };
}

function commonRecord({
  candidateIdValue,
  runId,
  fidelityStratum,
  sampleRole,
  extractionTimestampUtc,
  sourceInputPath,
  sourceInputSha256,
  sourceRecordLocator,
  legacyObjectPath,
  sourceAssessment,
  content,
  fullCandidateContext,
  retainedPayloadIdentity,
  internalRunTimestamp,
  observedAt,
  legacyAssessment,
  warnings,
  productionScriptSha256,
  helperSha256,
  legacyRulesSha256,
  auditRulesSha256,
}) {
  return {
    recordType: "candidate-observation",
    schemaVersion: "crucix-session15-candidate-observation/v1",
    auditSession: 15,
    checkpoint: "Step B — extract and normalize candidate observations",
    auditProtocol: {
      path: "audit/session14-signal-audit-protocol.md",
      version: "session14-executable-signal-audit-protocol",
      sha256: EXPECTED_AUDIT_PROTOCOL_HASH,
    },
    inputManifest: {
      path: INPUT_MANIFEST_PATH,
      canonicalSelfHashSha256: EXPECTED_INPUT_MANIFEST_HASH,
      frozenHistoricalInput: true,
    },
    candidateId: candidateIdValue,
    runId,
    normalizedContentId: content.normalizedContentId,
    fidelityStratum,
    sampleRole,
    selectionContext: {
      fullCandidateContext,
      completeRunCandidateDenominatorEligible: assessed(
        fidelityStratum === "A-canonical-candidate-archive" ||
          fidelityStratum === "B-reconstructable-run-input",
      ),
      stepCSelectionStatus: unassessed("step-c-not-executed"),
    },
    inputEvidence: {
      sourceInputPath,
      sourceInputSha256,
      sourceRecordLocator,
      retainedPayloadIdentity,
      internalRunTimestamp,
      observedAt,
    },
    sourceRecord: {
      legacyObjectPath,
      ...sourceAssessment,
      sourceOriginId: unassessed("source-origin-normalization-belongs-to-step-d"),
    },
    content,
    legacyAssessment,
    extractionProvenance: {
      auditExtractionTimestampUtc: extractionTimestampUtc,
      reviewerOrExecutor: "OpenAI Codex primary agent",
      automationRole: "audit-only deterministic extraction and normalization",
      helperPath: HELPER_PATH,
      helperSha256,
      productionScriptPath: PRODUCTION_SCRIPT_PATH,
      productionScriptSha256,
      legacyReproductionRuleId: LEGACY_REPRODUCTION_SPEC.ruleId,
      legacyReproductionRulesSha256: legacyRulesSha256,
      auditNormalizationAndIdRuleId: AUDIT_RULES_SPEC.ruleId,
      auditNormalizationAndIdRulesSha256: auditRulesSha256,
      idGenerationDocumentation: AUDIT_RULES_SPEC,
      rawTextPublicationStatus:
        "Local audit-only retention; do not stage or commit before source-terms, licensing, and privacy review.",
      warnings,
    },
  };
}

function enumerateSelectedOutputRecords(parsed, sourceInputPath) {
  if (sourceInputPath === "dashboard/public/market-shock.json") {
    return (parsed.items ?? []).map((record, index) => ({
      record,
      locator: `root.items[${index}]`,
      legacyObjectPath: record.path ?? null,
      selectedRank: index + 1,
      selectedOutputGeneratedAt: parsed.generatedAt ?? null,
      closeDate: null,
      selectedContext: "dashboard-ranked-item",
    }));
  }

  const records = [];
  function visit(node, locator = "root") {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${locator}[${index}]`));
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      const childLocator = `${locator}.${key}`;
      if (key === "top_signal" && value && typeof value === "object") {
        records.push({
          record: value,
          locator: childLocator,
          legacyObjectPath: value.path ?? null,
          selectedRank: null,
          selectedOutputGeneratedAt: parsed.generatedAt ?? null,
          closeDate: parsed.asOfClose ?? parsed.date ?? null,
          selectedContext: childLocator.includes(".signalOnly[")
            ? "close-snapshot-signal-only-top-signal"
            : "close-snapshot-channel-top-signal",
        });
      } else if (value && typeof value === "object") {
        visit(value, childLocator);
      }
    }
  }
  visit(parsed);
  return records;
}

function legacyAssessmentFromC(selected) {
  const record = selected.record;
  const retainedScore = record.score ?? record.rawScore;
  return {
    reproductionStatus: assessed("retained-selected-output-fields-copied-without-reclassification"),
    sourcePriority:
      typeof record.sourcePriority === "string"
        ? assessed(record.sourcePriority)
        : unknown("selected-output-record-lacks-source-priority"),
    keywordMatched: assessed(true, "Record is retained selected legacy output with matchedKeywords/category fields."),
    category:
      typeof record.category === "string"
        ? assessed(record.category)
        : unknown("selected-output-record-lacks-category"),
    primaryCategory:
      typeof record.primaryCategory === "string"
        ? assessed(record.primaryCategory)
        : unknown("selected-output-record-lacks-primary-category"),
    score:
      typeof retainedScore === "number"
        ? assessed(retainedScore)
        : unknown("selected-output-record-lacks-numeric-score"),
    confidence:
      typeof record.confidence === "string"
        ? assessed(record.confidence)
        : unknown("selected-output-record-lacks-confidence"),
    channels: Array.isArray(record.channels)
      ? assessed(record.channels)
      : unassessed("selected-output-record-does-not-retain-channel-array"),
    matchedKeywords: Array.isArray(record.matchedKeywords)
      ? assessed(record.matchedKeywords)
      : unknown("selected-output-record-lacks-matched-keyword-array"),
    otherCategories: Array.isArray(record.otherCategories)
      ? assessed(record.otherCategories)
      : unassessed("selected-output-record-does-not-retain-other-category-array"),
    dashboardReadyAfterLegacyFilters: assessed(true, "Presence in retained selected output."),
    enteredLegacyTop15: assessed(true, "Presence in retained selected output."),
    legacyTop15Rank:
      selected.selectedRank != null
        ? assessed(selected.selectedRank)
        : unknown("close-snapshot-does-not-retain-original-top-15-rank"),
    legacyPath:
      typeof selected.legacyObjectPath === "string"
        ? assessed(selected.legacyObjectPath)
        : unknown("selected-output-record-lacks-legacy-path"),
    selectedOutputContext: assessed({
      kind: selected.selectedContext,
      generatedAt: selected.selectedOutputGeneratedAt,
      closeDate: selected.closeDate,
      generatedAtSemanticBoundary:
        "Retained as selected-output metadata only; not substituted for source publication/event time or raw-candidate observation time.",
    }),
    caveats: [
      "Full candidate population and raw source node are unavailable.",
      "Retained legacy fields are not reclassified with the current production rules.",
    ],
  };
}

function validateManifest(manifest) {
  if (manifest.manifestHash?.value !== EXPECTED_INPUT_MANIFEST_HASH) {
    throw new Error(`Unexpected stored input-manifest hash: ${manifest.manifestHash?.value}`);
  }
  const clone = structuredClone(manifest);
  clone.manifestHash.value = null;
  const recomputed = canonicalSha256(clone);
  if (recomputed !== EXPECTED_INPUT_MANIFEST_HASH) {
    throw new Error(`Input-manifest self-hash mismatch: ${recomputed}`);
  }
  if (manifest.freezeBoundary?.status !== "frozen") {
    throw new Error("Input manifest is not marked frozen.");
  }
  if (manifest.auditProtocol?.sha256 !== EXPECTED_AUDIT_PROTOCOL_HASH) {
    throw new Error(`Unexpected audit protocol hash in manifest: ${manifest.auditProtocol?.sha256}`);
  }
}

function validateFrozenSourceFile(manifestEntry) {
  const actualSha256 = sha256File(manifestEntry.repositoryRelativePath);
  if (actualSha256 !== manifestEntry.sha256) {
    throw new Error(
      `Frozen source hash mismatch for ${manifestEntry.repositoryRelativePath}: ${actualSha256}`,
    );
  }
}

function generateRecords(extractionTimestampUtc) {
  const manifest = JSON.parse(fs.readFileSync(absolute(INPUT_MANIFEST_PATH), "utf8"));
  const inventory = JSON.parse(fs.readFileSync(absolute(INVENTORY_PATH), "utf8"));
  validateManifest(manifest);
  if (inventory.inputManifest?.sha256 !== EXPECTED_INPUT_MANIFEST_HASH) {
    throw new Error("Inventory does not reference the expected frozen input-manifest hash.");
  }

  const productionScriptSha256 = sha256File(PRODUCTION_SCRIPT_PATH);
  const helperSha256 = sha256File(HELPER_PATH);
  const legacyRulesSha256 = canonicalSha256({
    ...LEGACY_REPRODUCTION_SPEC,
    productionScriptSha256,
  });
  const auditRulesSha256 = canonicalSha256(AUDIT_RULES_SPEC);
  const bEntries = manifest.sourceEvidenceFiles.filter(
    (entry) => entry.fidelityStratum === "B-reconstructable-run-input",
  );
  const cEntries = manifest.sourceEvidenceFiles.filter(
    (entry) => entry.fidelityStratum === "C-selected-output-only",
  );
  const records = [];
  const bExtractionFailures = [];
  const processedPayloadIds = new Set();

  for (const manifestEntry of bEntries) {
    validateFrozenSourceFile(manifestEntry);
    const fileParsed = JSON.parse(
      fs.readFileSync(absolute(manifestEntry.repositoryRelativePath), "utf8"),
    );
    for (const payload of manifestEntry.retainedRunDeduplicationIdentities) {
      try {
        const inventoryFile = inventory.files.find(
          (file) => file.repositoryRelativePath === manifestEntry.repositoryRelativePath,
        );
        const inventoryPayload = inventoryFile?.retainedRunPayloads.find(
          (candidate) => candidate.retainedPayloadId === payload.retainedPayloadId,
        );
        if (!inventoryPayload) throw new Error("Retained payload is absent from inventory.");
        const payloadData = getByLocator(fileParsed, inventoryPayload.payloadLocator);
        if (!payloadData || typeof payloadData !== "object") {
          throw new Error(`Payload locator did not resolve to an object: ${inventoryPayload.payloadLocator}`);
        }
        const payloadHash = canonicalSha256(payloadData);
        if (payloadHash !== payload.canonicalPayloadSha256) {
          throw new Error(`Canonical payload hash mismatch: ${payloadHash}`);
        }

        const runId = bRunId(payload);
        const candidates = extractCandidates(payloadData);
        const scores = candidates.map(scoreCandidate);
        const dashboardReady = scores.map((score) => Boolean(score && isDashboardReadySignal(score)));
        const selected = scores
          .map((score, index) => ({ score, index }))
          .filter(({ score, index }) => Boolean(score && dashboardReady[index]))
          .sort((a, b) => b.score.score - a.score.score)
          .slice(0, MAX_RESULTS);
        const selectedRankByCandidateIndex = new Map(
          selected.map(({ index }, rank) => [index, rank + 1]),
        );

        candidates.forEach((candidate, index) => {
          const content = contentFields(candidate.text);
          const sourceAssessment = sourceRecordAssessment(candidate.sourceNode, candidate.path);
          const ids =
            sourceAssessment.sourceProvidedIds.status === "assessed"
              ? sourceAssessment.sourceProvidedIds.value
              : [];
          const recordLocator = `${inventoryPayload.payloadLocator}:${candidate.path}`;
          const candidateIdValue = candidateId({
            runId,
            sourceInputPath: manifestEntry.repositoryRelativePath,
            sourceRecordLocator: recordLocator,
            legacyObjectPath: candidate.path,
            sourceProvidedIds: ids,
            rawContentSha256: content.rawContentSha256,
          });
          const warnings = [
            "Fidelity-B observation reconstructed from a retained legacy payload, not copied from a canonical candidate archive.",
          ];
          if (payload.relationship.includes("conflict")) {
            warnings.push(
              "Retained payload belongs to the same-timestamp/different-canonical-hash conflict; it remains a distinct audit input.",
            );
          }
          if (sourceAssessment.publicationOrEventTimestamps.status !== "assessed") {
            warnings.push("No explicit source-provided publication/event timestamp is available on the candidate object.");
          }
          if (sourceAssessment.reportingSourceId.status !== "assessed") {
            warnings.push("Reporting-source identity is unavailable.");
          }
          records.push(
            commonRecord({
              candidateIdValue,
              runId,
              fidelityStratum: "B-reconstructable-run-input",
              sampleRole: "historical-reconstructable-run-census",
              extractionTimestampUtc,
              sourceInputPath: manifestEntry.repositoryRelativePath,
              sourceInputSha256: manifestEntry.sha256,
              sourceRecordLocator: recordLocator,
              legacyObjectPath: assessed(candidate.path),
              sourceAssessment,
              content,
              fullCandidateContext: assessed(true),
              retainedPayloadIdentity: assessed({
                retainedPayloadId: payload.retainedPayloadId,
                payloadLocator: inventoryPayload.payloadLocator,
                internalRunTimestamp: payload.internalRunTimestamp,
                canonicalPayloadSha256: payload.canonicalPayloadSha256,
                relationship: payload.relationship,
              }),
              internalRunTimestamp: assessed(payload.internalRunTimestamp),
              observedAt: assessed(payload.internalRunTimestamp, {
                basis: "actually-present-internal-run-timestamp",
                semanticBoundary: "Acquisition/run observation time only; not publication/event time.",
              }),
              legacyAssessment: legacyAssessmentFromB(
                candidate,
                scores[index],
                dashboardReady[index],
                selectedRankByCandidateIndex.get(index) ?? null,
              ),
              warnings,
              productionScriptSha256,
              helperSha256,
              legacyRulesSha256,
              auditRulesSha256,
            }),
          );
        });
        processedPayloadIds.add(payload.retainedPayloadId);
      } catch (error) {
        bExtractionFailures.push({
          retainedPayloadId: payload.retainedPayloadId,
          sourceInputPath: manifestEntry.repositoryRelativePath,
          error: error.message,
        });
      }
    }
  }

  for (const manifestEntry of cEntries) {
    validateFrozenSourceFile(manifestEntry);
    const parsed = JSON.parse(
      fs.readFileSync(absolute(manifestEntry.repositoryRelativePath), "utf8"),
    );
    const runId = cRunId(manifestEntry.repositoryRelativePath, manifestEntry.sha256);
    const selectedRecords = enumerateSelectedOutputRecords(
      parsed,
      manifestEntry.repositoryRelativePath,
    );
    for (const selected of selectedRecords) {
      if (typeof selected.record.text !== "string") {
        throw new Error(
          `Selected-output record lacks retained text: ${manifestEntry.repositoryRelativePath}:${selected.locator}`,
        );
      }
      const content = contentFields(selected.record.text);
      const legacyPath = selected.legacyObjectPath ?? selected.locator;
      const sourceAssessment = {
        sourceProvidedIds: unassessed("raw-source-record-unavailable-in-selected-output"),
        publicationOrEventTimestamps: unknown(
          "selected-output-record-does-not-retain-source-publication-or-event-time",
        ),
        otherSourceProvidedTimeFields: unassessed(
          "raw-source-record-unavailable-in-selected-output",
        ),
        ...reportingSourceAssessment({}, legacyPath),
      };
      const candidateIdValue = candidateId({
        runId,
        sourceInputPath: manifestEntry.repositoryRelativePath,
        sourceRecordLocator: selected.locator,
        legacyObjectPath: legacyPath,
        sourceProvidedIds: [],
        rawContentSha256: content.rawContentSha256,
      });
      const warnings = [
        "Fidelity-C selected-output supplement; full candidate population and raw source record are unavailable.",
        "Excluded from complete-run candidate denominators.",
        "Selected-output generatedAt and close date are not substituted for source publication/event time or raw-candidate observation time.",
      ];
      if (sourceAssessment.reportingSourceId.status !== "assessed") {
        warnings.push("Reporting-source identity is unavailable.");
      }
      records.push(
        commonRecord({
          candidateIdValue,
          runId,
          fidelityStratum: "C-selected-output-only",
          sampleRole: "selected-output-supplement",
          extractionTimestampUtc,
          sourceInputPath: manifestEntry.repositoryRelativePath,
          sourceInputSha256: manifestEntry.sha256,
          sourceRecordLocator: selected.locator,
          legacyObjectPath:
            typeof selected.legacyObjectPath === "string"
              ? assessed(selected.legacyObjectPath)
              : unknown("selected-output-record-lacks-legacy-path"),
          sourceAssessment,
          content,
          fullCandidateContext: unassessed(
            "selected-output-only-evidence-does-not-retain-complete-candidate-population",
          ),
          retainedPayloadIdentity: notApplicable("not-a-fidelity-b-retained-payload"),
          internalRunTimestamp: unknown(
            "selected-output-record-does-not-retain-raw-input-internal-run-timestamp",
          ),
          observedAt: unknown(
            "raw-candidate-acquisition-time-unavailable-in-selected-output",
          ),
          legacyAssessment: legacyAssessmentFromC(selected),
          warnings,
          productionScriptSha256,
          helperSha256,
          legacyRulesSha256,
          auditRulesSha256,
        }),
      );
    }
  }

  return {
    records,
    bExtractionFailures,
    processedPayloadIds,
    expectedBPayloadIds: new Set(
      bEntries.flatMap((entry) =>
        entry.retainedRunDeduplicationIdentities.map((payload) => payload.retainedPayloadId),
      ),
    ),
    frozenInputPaths: new Set(
      manifest.sourceEvidenceFiles.map((entry) => entry.repositoryRelativePath),
    ),
  };
}

function duplicateMetrics(records, hashSelector) {
  const hashes = records.map(hashSelector);
  const unique = new Set(hashes).size;
  const duplicateExcess = hashes.length - unique;
  return {
    observations: hashes.length,
    unique,
    duplicateExcess,
    duplicateRate: hashes.length === 0 ? 0 : duplicateExcess / hashes.length,
    numerator: duplicateExcess,
    denominator: hashes.length,
  };
}

function countBy(records, selector) {
  const counts = new Map();
  for (const record of records) {
    const key = selector(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b, "en")));
}

function validateRecords(result) {
  const { records, bExtractionFailures, processedPayloadIds, expectedBPayloadIds, frozenInputPaths } = result;
  const allowedFidelity = new Set([
    "A-canonical-candidate-archive",
    "B-reconstructable-run-input",
    "C-selected-output-only",
  ]);
  const candidateIds = new Set();
  const failures = [];

  for (const record of records) {
    if (!allowedFidelity.has(record.fidelityStratum)) {
      failures.push(`Invalid fidelity: ${record.candidateId}`);
    }
    if (!frozenInputPaths.has(record.inputEvidence.sourceInputPath)) {
      failures.push(`Non-frozen input reference: ${record.candidateId}`);
    }
    if (candidateIds.has(record.candidateId)) failures.push(`Duplicate candidate ID: ${record.candidateId}`);
    candidateIds.add(record.candidateId);
    if (sha256Text(record.content.rawText) !== record.content.rawContentSha256) {
      failures.push(`Raw hash mismatch: ${record.candidateId}`);
    }
    const normalized = conservativeNormalize(record.content.rawText);
    if (
      normalized !== record.content.conservativeNormalizedText ||
      sha256Text(normalized) !== record.content.conservativeNormalizedSha256 ||
      record.normalizedContentId !== `norm_sha256_${sha256Text(normalized)}`
    ) {
      failures.push(`Normalized content mismatch: ${record.candidateId}`);
    }
    if (
      legacyCanonicalText(record.content.rawText) !== record.content.legacyCanonicalTextKey ||
      sha256Text(record.content.legacyCanonicalTextKey) !==
        record.content.legacyCanonicalTextSha256
    ) {
      failures.push(`Legacy canonical mismatch: ${record.candidateId}`);
    }
    const ids =
      record.sourceRecord.sourceProvidedIds.status === "assessed"
        ? record.sourceRecord.sourceProvidedIds.value
        : [];
    const recomputedCandidateId = candidateId({
      runId: record.runId,
      sourceInputPath: record.inputEvidence.sourceInputPath,
      sourceRecordLocator: record.inputEvidence.sourceRecordLocator,
      legacyObjectPath:
        record.sourceRecord.legacyObjectPath.status === "assessed"
          ? record.sourceRecord.legacyObjectPath.value
          : record.inputEvidence.sourceRecordLocator,
      sourceProvidedIds: ids,
      rawContentSha256: record.content.rawContentSha256,
    });
    if (recomputedCandidateId !== record.candidateId) {
      failures.push(`Candidate ID mismatch: ${record.candidateId}`);
    }
    if (record.sourceRecord.reportingSourceId.status === "assessed") {
      const value = record.sourceRecord.reportingSource.value;
      const expected = `reporting_source_sha256_${canonicalSha256({
        scheme: "crucix-session15-reporting-source-id/v1",
        derivation: value.derivation,
        observedValues: value.observedValues,
      })}`;
      if (expected !== record.sourceRecord.reportingSourceId.value) {
        failures.push(`Reporting-source ID mismatch: ${record.candidateId}`);
      }
    }
  }

  const missingPayloads = [...expectedBPayloadIds].filter((id) => !processedPayloadIds.has(id));
  if (missingPayloads.length > 0) failures.push(`Unprocessed B payload IDs: ${missingPayloads.join(", ")}`);
  if (bExtractionFailures.length > 0) {
    failures.push(`B extraction failures: ${JSON.stringify(bExtractionFailures)}`);
  }

  const conflictRecords = records.filter(
    (record) =>
      record.fidelityStratum === "B-reconstructable-run-input" &&
      record.inputEvidence.internalRunTimestamp.value === "2026-06-23T15:57:42.421Z",
  );
  const conflictPayloadIds = new Set(
    conflictRecords.map(
      (record) => record.inputEvidence.retainedPayloadIdentity.value.retainedPayloadId,
    ),
  );
  const conflictRunIds = new Set(conflictRecords.map((record) => record.runId));
  if (conflictPayloadIds.size !== 2 || conflictRunIds.size !== 2) {
    failures.push("Conflicting same-timestamp B payloads are not distinguishable.");
  }

  return { pass: failures.length === 0, failures };
}

function metrics(result, outputSha256) {
  const records = result.records;
  const b = records.filter((record) => record.fidelityStratum === "B-reconstructable-run-input");
  const c = records.filter((record) => record.fidelityStratum === "C-selected-output-only");
  const conflict = b.filter(
    (record) => record.inputEvidence.internalRunTimestamp.value === "2026-06-23T15:57:42.421Z",
  );
  return {
    outputPath: OUTPUT_PATH,
    outputSha256,
    totalObservations: records.length,
    b: {
      retainedPayloadIdentitiesExpected: result.expectedBPayloadIds.size,
      retainedPayloadIdentitiesProcessed: result.processedPayloadIds.size,
      extractionFailures: result.bExtractionFailures,
      observations: b.length,
      uniqueConservativeNormalizedContents: new Set(
        b.map((record) => record.content.conservativeNormalizedSha256),
      ).size,
      conservativeExactDuplicates: duplicateMetrics(
        b,
        (record) => record.content.conservativeNormalizedSha256,
      ),
      lowercaseComparisonDuplicates: duplicateMetrics(
        b,
        (record) => record.content.lowercaseComparisonSha256,
      ),
      legacyCanonicalDuplicates: duplicateMetrics(
        b,
        (record) => record.content.legacyCanonicalTextSha256,
      ),
      byInternalRunTimestamp: countBy(
        b,
        (record) => record.inputEvidence.internalRunTimestamp.value,
      ),
      bySourcePriority: countBy(
        b,
        (record) => record.legacyAssessment.sourcePriority.value,
      ),
      legacyRuleMatched: b.filter((record) => record.legacyAssessment.keywordMatched.value).length,
      legacyTop15Selected: b.filter((record) => record.legacyAssessment.enteredLegacyTop15.value)
        .length,
      missingPublicationOrEventTimestamp: b.filter(
        (record) => record.sourceRecord.publicationOrEventTimestamps.status !== "assessed",
      ).length,
      missingReportingSourceIdentity: b.filter(
        (record) => record.sourceRecord.reportingSourceId.status !== "assessed",
      ).length,
      withWarnings: b.filter((record) => record.extractionProvenance.warnings.length > 0).length,
    },
    c: {
      observations: c.length,
      sourceFiles: new Set(c.map((record) => record.inputEvidence.sourceInputPath)).size,
      unavailableFullCandidateContext: c.filter(
        (record) => record.selectionContext.fullCandidateContext.status === "unassessed",
      ).length,
      missingPublicationOrEventTimestamp: c.filter(
        (record) => record.sourceRecord.publicationOrEventTimestamps.status !== "assessed",
      ).length,
      missingReportingSourceIdentity: c.filter(
        (record) => record.sourceRecord.reportingSourceId.status !== "assessed",
      ).length,
      withWarnings: c.filter((record) => record.extractionProvenance.warnings.length > 0).length,
    },
    conflictTimestamp: {
      timestamp: "2026-06-23T15:57:42.421Z",
      payloads: Object.entries(
        countBy(
          conflict,
          (record) =>
            `${record.inputEvidence.retainedPayloadIdentity.value.retainedPayloadId}|${record.inputEvidence.retainedPayloadIdentity.value.canonicalPayloadSha256}`,
        ),
      ).map(([identity, observations]) => ({ identity, observations })),
      distinctRunIds: new Set(conflict.map((record) => record.runId)).size,
      exactSharedLegacyPathAndRawHashPairs: (() => {
        const byPayload = new Map();
        for (const record of conflict) {
          const payloadId = record.inputEvidence.retainedPayloadIdentity.value.retainedPayloadId;
          if (!byPayload.has(payloadId)) byPayload.set(payloadId, new Set());
          byPayload
            .get(payloadId)
            .add(`${record.sourceRecord.legacyObjectPath.value}|${record.content.rawContentSha256}`);
        }
        const sets = [...byPayload.values()];
        return sets.length === 2 ? [...sets[0]].filter((value) => sets[1].has(value)).length : 0;
      })(),
    },
  };
}

function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes("--validate-existing");
  let extractionTimestampUtc = new Date().toISOString();
  if (validateOnly) {
    if (!fs.existsSync(absolute(OUTPUT_PATH))) {
      throw new Error(`Cannot validate missing output: ${OUTPUT_PATH}`);
    }
    const firstLine = fs.readFileSync(absolute(OUTPUT_PATH), "utf8").split(/\r?\n/, 1)[0];
    extractionTimestampUtc = JSON.parse(firstLine).extractionProvenance.auditExtractionTimestampUtc;
  }

  const result = generateRecords(extractionTimestampUtc);
  const validation = validateRecords(result);
  if (!validation.pass) throw new Error(`Record validation failed: ${validation.failures.join("; ")}`);
  const serialized = `${result.records.map((record) => JSON.stringify(record)).join("\n")}\n`;

  if (validateOnly) {
    const existing = fs.readFileSync(absolute(OUTPUT_PATH), "utf8");
    if (existing !== serialized) {
      throw new Error("Existing JSONL is not byte-identical to deterministic regeneration.");
    }
  } else {
    fs.writeFileSync(absolute(OUTPUT_PATH), serialized, "utf8");
  }

  const outputSha256 = sha256Text(serialized);
  process.stdout.write(
    `${JSON.stringify(
      {
        mode: validateOnly ? "validate-existing" : "generate",
        validation,
        metrics: metrics(result, outputSha256),
      },
      null,
      2,
    )}\n`,
  );
}

main();
