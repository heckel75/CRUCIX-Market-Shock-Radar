import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = process.env.CRUCIX_DATA_URL || "http://localhost:3117/api/data";
const OUTPUT_PATH = process.env.MARKET_SHOCK_OUTPUT || path.join("dashboard", "public", "market-shock.json");
const MAX_CANDIDATES = Number(process.env.MARKET_SHOCK_MAX_CANDIDATES || 400);
const MAX_RESULTS = Number(process.env.MARKET_SHOCK_MAX_RESULTS || 15);

const SHOCK_RULES = [
  {
    category: "Energy Shock",
    weight: 4,
    channels: ["Oil", "Natural Gas", "Inflation Expectations", "Energy Equities", "FX"],
    keywords: [
      "oil", "brent", "wti", "crude", "gas", "lng", "pipeline", "refinery",
      "opec", "hormuz", "red sea", "energy", "diesel", "fuel", "uranium"
    ],
  },
  {
    category: "Geopolitical Escalation",
    weight: 5,
    channels: ["Gold", "VIX", "Oil", "Defense Equities", "Safe-haven FX"],
    keywords: [
      "war", "strike", "missile", "attack", "invasion", "escalation", "conflict",
      "military", "troops", "border", "drone", "airstrike", "naval", "nuclear",
      "iran", "israel", "russia", "ukraine", "china", "taiwan", "gaza"
    ],
  },
  {
    category: "Sanctions / Policy Shock",
    weight: 4,
    channels: ["FX", "Commodities", "Emerging Markets", "Credit", "Equities"],
    keywords: [
      "sanction", "tariff", "export control", "ban", "embargo", "policy",
      "regulation", "freeze", "blacklist", "trade restriction", "customs",
      "quota", "subsidy", "election", "legislation"
    ],
  },
  {
    category: "Credit Stress",
    weight: 5,
    channels: ["High Yield Credit", "Banks", "Treasuries", "Dollar Funding", "Equities"],
    keywords: [
      "default", "bankruptcy", "debt", "liquidity", "credit", "spread",
      "bank", "deposit", "solvency", "downgrade", "restructuring", "bailout",
      "contagion", "funding stress"
    ],
  },
  {
    category: "Supply Chain Disruption",
    weight: 4,
    channels: ["Industrials", "Semiconductors", "Shipping", "Commodities", "Margins"],
    keywords: [
      "supply chain", "port", "shipping", "freight", "container", "blockade",
      "chokepoint", "canal", "factory", "shortage", "semiconductor", "chips",
      "logistics", "rail", "strike", "disruption"
    ],
  },
  {
    category: "Macro / Inflation Shock",
    weight: 3,
    channels: ["Rates", "Treasuries", "FX", "Equities", "Gold"],
    keywords: [
      "inflation", "cpi", "ppi", "rates", "fed", "ecb", "central bank",
      "yield", "treasury", "recession", "growth", "gdp", "unemployment",
      "jobs", "wages", "pce", "stagflation"
    ],
  },
  {
    category: "Weather / Climate Shock",
    weight: 3,
    channels: ["Agriculture", "Insurance", "Utilities", "Energy", "Commodities"],
    keywords: [
      "hurricane", "storm", "flood", "drought", "wildfire", "heatwave",
      "cold snap", "earthquake", "weather", "climate", "crop", "harvest",
      "el nino", "la nina"
    ],
  },
  {
    category: "Market Volatility Signal",
    weight: 3,
    channels: ["VIX", "Equities", "Credit", "FX", "Rates"],
    keywords: [
      "volatility", "selloff", "risk-off", "panic", "drawdown", "crash",
      "rally", "equities", "stocks", "market", "futures", "vix",
      "safe haven", "liquidation"
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

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeDashboardOutputText(value) {
  const feedStatusWord = "li" + "ve";

  return String(value || "")
    .replace(new RegExp(`\\b${feedStatusWord}\\s+Updates\\s*:`, "gi"), "Updates:")
    .replace(new RegExp(`\\b${feedStatusWord}\\s+Update\\s*:`, "gi"), "Update:")
    .replace(new RegExp(`\\b${feedStatusWord}\\s*:`, "gi"), "Update:")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeDashboardItem(item) {
  return {
    ...item,
    text: sanitizeDashboardOutputText(item.text),
    explanation: sanitizeDashboardOutputText(item.explanation),
  };
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
      const canonicalText = objectText
        .toLowerCase()
        .replace(/\s*\|\s*new urgent osint post\s*/gi, "")
        .replace(/\s+/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .slice(0, 220);

      if (!seen.has(canonicalText)) {
        seen.add(canonicalText);
        candidates.push({
          path: pathName,
          text: objectText,
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
    explanation: buildExplanation(primary, candidate.text),
  };
}

function buildExplanation(primaryHit, text) {
  const sample = text.length > 180 ? `${text.slice(0, 177)}...` : text;
  return `${primaryHit.category} match based on keywords: ${primaryHit.matchedKeywords.join(", ")}. Signal: ${sample}`;
}

function isDashboardReadySignal(item) {
  const text = item.text.trim();

  // Keep structural chokepoint signals even when short.
  if (/^root\.chokepoints/i.test(item.path)) return true;

  // Exclude pure market ticker/label rows. These are useful context, but not event signals.
  if (/^root\.markets\./i.test(item.path)) return false;

  // Exclude generic data-series labels without a current event attached.
  if (/^root\.(bls|fred|treasury|metals)\b/i.test(item.path) && text.length < 80) return false;

  // Exclude very short labels unless they come from an explicitly useful structured source.
  if (text.length < 35 && !/^root\.(chokepoints|nuke|nukeSignals|energy|defense)\b/i.test(item.path)) {
    return false;
  }

  // Exclude SDR receiver/location labels that only match geopolitical keywords by geography.
  if (/^root\.sdr\./i.test(item.path)) return false;

  // Exclude weak one-keyword signals unless they come from a high-priority source.
  if (item.confidence === "Low" && item.sourcePriority !== "High") return false;

  return true;
}

function countByCategory(items) {
  return items.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});
}

function calculateShockScore(items) {
  if (items.length === 0) {
    return {
      score: 0,
      maxScore: 20,
      regime: "Calm",
      interpretation: "No material market-shock signals were detected in the extracted text candidates.",
      concentrationPenalty: 0,
      categoryBreadth: 0,
    };
  }

  const categoryCounts = countByCategory(items);
  const categoryBreadth = Object.keys(categoryCounts).length;
  const topCategoryCount = Math.max(...Object.values(categoryCounts));
  const concentrationRatio = topCategoryCount / items.length;

  const confidencePoints = {
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const severityComponent = items
    .slice(0, 7)
    .reduce((sum, item) => sum + Math.min(item.score, 10) / 6, 0);

  const confidenceComponent = items
    .slice(0, 10)
    .reduce((sum, item) => sum + confidencePoints[item.confidence], 0) / 4;

  const breadthComponent = Math.min(categoryBreadth * 1.4, 5);
  const sourceComponent = items.filter((item) => item.sourcePriority === "High").length >= 3 ? 1 : 0;

  let concentrationPenalty = 0;
  if (items.length >= 6 && concentrationRatio >= 0.75) concentrationPenalty = 5;
  else if (items.length >= 6 && concentrationRatio >= 0.6) concentrationPenalty = 2.5;

  const rawScore = severityComponent + confidenceComponent + breadthComponent + sourceComponent - concentrationPenalty;
  const score = Math.max(0, Math.min(20, Math.round(rawScore)));

  let regime = "Calm";
  let interpretation = "Signals are limited or low-confidence.";

  if (score >= 15) {
    regime = "Shock mode";
    interpretation = "Multiple high-scoring signals suggest broad market-risk transmission channels.";
  } else if (score >= 10) {
    regime = "Risk-off building";
    interpretation = "Several relevant signals are present across market-sensitive categories.";
  } else if (score >= 5) {
    regime = "Watchlist";
    interpretation = "Some relevant signals are present, but breadth and severity remain moderate.";
  }

  if (concentrationPenalty > 0) {
    interpretation += " Score is moderated because many signals are concentrated in one category.";
  }

  return {
    score,
    maxScore: 20,
    regime,
    interpretation,
    concentrationPenalty,
    categoryBreadth,
  };
}

function buildReport({ candidates, items, shockScore }) {
  const dashboardItems = items.map(sanitizeDashboardItem);

  return {
    title: "CRUCIX Market Shock Radar",
    subtitle: "World events \u2192 market transmission channels",
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    disclaimer: "Experimental market-intelligence prototype. Not investment advice. No buy/sell recommendations.",
    shockScore,
    shockCounts: countByCategory(dashboardItems),
    candidateCount: candidates.length,
    itemCount: dashboardItems.length,
    items: dashboardItems,
  };
}

async function writeReport(report) {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  console.log("CRUCIX Market Shock Radar");
  console.log(`Fetching: ${SOURCE_URL}`);

  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Crucix data: HTTP ${response.status}`);
  }

  const data = await response.json();
  const candidates = extractCandidates(data);

  const items = candidates
    .map(scoreCandidate)
    .filter(Boolean)
    .filter(isDashboardReadySignal)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  const shockScore = calculateShockScore(items);
  const report = buildReport({ candidates, items, shockScore });

  await writeReport(report);

  console.log("");
  console.log(`Candidates extracted: ${candidates.length}`);
  console.log(`Signals matched: ${items.length}`);
  console.log(`Market Shock Score: ${shockScore.score}/${shockScore.maxScore}`);
  console.log(`Risk regime: ${shockScore.regime}`);
  console.log(`Interpretation: ${shockScore.interpretation}`);
  console.log(`JSON written: ${OUTPUT_PATH}`);

  console.log("");
  console.log("Shock counts:");
  for (const [category, count] of Object.entries(report.shockCounts)) {
    console.log(`- ${category}: ${count}`);
  }

  console.log("");
  console.log("Top matched signals:");
  console.log("");

  if (items.length === 0) {
    console.log("No usable market-shock signals found. The extractor may need tuning.");
    return;
  }

  items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.category} | ${item.confidence} confidence | score ${item.score}`);
    console.log(`   Path: ${item.path}`);
    console.log(`   Source priority: ${item.sourcePriority}`);
    console.log(`   Channels: ${item.channels.slice(0, 6).join(", ")}`);
    console.log(`   Keywords: ${item.matchedKeywords.slice(0, 10).join(", ")}`);
    console.log(`   Signal: ${item.text.slice(0, 260)}${item.text.length > 260 ? "..." : ""}`);
    console.log("");
  });
}

main().catch((error) => {
  console.error("");
  console.error("Market Shock Radar failed.");
  console.error(error.message);
  console.error("");
  console.error("Check that Crucix is running at http://localhost:3117 before running this script.");
  process.exit(1);
});
