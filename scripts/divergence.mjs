import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();

const SIGNAL_INPUT_PATH = path.join(PROJECT_ROOT, 'dashboard', 'public', 'market-shock.json');
const MARKET_INPUT_PATH = path.join(PROJECT_ROOT, 'dashboard', 'public', 'market-readings.json');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'dashboard', 'public', 'divergence.json');

// Frozen as of the Phase 2 design spec dated 2026-06-11.
// Do not retune these thresholds to make the board look more interesting.
const SIGNAL_SCORE_MAX = 20;
const SIGNAL_ELEVATED_THRESHOLD = 0.6;
const MARKET_MOVING_ABS_Z_THRESHOLD = 1.5;
const THRESHOLDS_FROZEN_AS_OF = '2026-06-11';

const DIVERGENCE_CHANNELS = [
  {
    id: 'conflict-escalation',
    label: 'Conflict escalation',
    signalCategory: 'Geopolitical Escalation',
  },
  {
    id: 'sanctions-policy',
    label: 'Sanctions / policy',
    signalCategory: 'Sanctions / Policy Shock',
  },
  {
    id: 'energy-disruption',
    label: 'Energy disruption',
    signalCategory: 'Energy Shock',
  },
  {
    id: 'credit-stress',
    label: 'Credit stress',
    signalCategory: 'Credit Stress',
  },
  {
    id: 'supply-chain',
    label: 'Supply chain',
    signalCategory: 'Supply Chain Disruption',
  },
];

const SIGNAL_ONLY_CATEGORIES = [
  'Macro / Inflation Shock',
  'Weather / Climate Shock',
];

const RETIRED_SIGNAL_CATEGORIES = [
  'Market Volatility Signal',
];

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function getMarketChannels(marketReadings) {
  const raw =
    marketReadings.channels ??
    marketReadings.channelReadings ??
    marketReadings.readings ??
    [];

  if (Array.isArray(raw)) return raw;

  return Object.entries(raw).map(([id, value]) => ({
    id: value.id ?? id,
    ...value,
  }));
}

function getMarketZ(channel) {
  return Number(
    channel.marketZ ??
    channel.market_z ??
    channel.z ??
    channel.zScore ??
    0
  );
}

function getAbsMarketZ(channel) {
  const explicit = Number(
    channel.absMarketZ ??
    channel.abs_market_z ??
    channel.absZ ??
    channel.absZScore
  );

  if (Number.isFinite(explicit)) return explicit;
  return Math.abs(getMarketZ(channel));
}

function getDriverInstrument(channel) {
  return (
    channel.driverInstrument ??
    channel.driver_instrument ??
    channel.driver ??
    channel.driverSymbol ??
    null
  );
}

function emptySignalAggregate(category) {
  return {
    category,
    count: 0,
    primaryCount: 0,
    secondaryCount: 0,
    totalRawScore: 0,
    maxRawScore: 0,
    topSignal: null,
  };
}

function makeSignalSummary(item, category, isPrimary) {
  return {
    path: item.path ?? null,
    category,
    primaryCategory: item.category ?? null,
    isPrimary,
    rawScore: Number(item.score ?? 0),
    confidence: item.confidence ?? null,
    sourcePriority: item.sourcePriority ?? null,
    matchedKeywords: item.matchedKeywords ?? [],
    text: item.text ?? null,
    explanation: item.explanation ?? null,
  };
}

function aggregateSignals(signalReport) {
  const aggregates = new Map();

  function ensure(category) {
    if (!aggregates.has(category)) {
      aggregates.set(category, emptySignalAggregate(category));
    }
    return aggregates.get(category);
  }

  for (const item of signalReport.items ?? []) {
    const primaryCategory = item.category;
    const categories = unique([
      primaryCategory,
      ...(Array.isArray(item.otherCategories) ? item.otherCategories : []),
    ]);

    const rawScore = Number(item.score ?? 0);
    if (!Number.isFinite(rawScore)) continue;

    for (const category of categories) {
      const aggregate = ensure(category);
      const isPrimary = category === primaryCategory;

      aggregate.count += 1;
      aggregate.totalRawScore += rawScore;
      aggregate.maxRawScore = Math.max(aggregate.maxRawScore, rawScore);

      if (isPrimary) aggregate.primaryCount += 1;
      else aggregate.secondaryCount += 1;

      if (!aggregate.topSignal || rawScore > aggregate.topSignal.rawScore) {
        aggregate.topSignal = makeSignalSummary(item, category, isPrimary);
      }
    }
  }

  return aggregates;
}

function normalizeSignalScore(rawScore) {
  return round(clamp(rawScore / SIGNAL_SCORE_MAX, 0, 1), 3);
}

function classifyState({ signalElevated, marketMoving }) {
  if (signalElevated && marketMoving) return 'priced';
  if (signalElevated && !marketMoving) return 'radar-claim';
  if (!signalElevated && marketMoving) return 'radar-miss';
  return 'calm';
}

function findMarketChannel(marketChannels, spec) {
  const byId = marketChannels.find((channel) => channel.id === spec.id);
  if (byId) return byId;

  const expectedLabel = normalizeKey(spec.label);
  return marketChannels.find((channel) => normalizeKey(channel.label) === expectedLabel);
}

function buildRows({ signalReport, marketReadings }) {
  const aggregates = aggregateSignals(signalReport);
  const marketChannels = getMarketChannels(marketReadings);

  const missingChannels = DIVERGENCE_CHANNELS
    .filter((spec) => !findMarketChannel(marketChannels, spec))
    .map((spec) => `${spec.id} (${spec.label})`);

  if (missingChannels.length) {
    throw new Error(`Missing market channel readings: ${missingChannels.join(', ')}`);
  }

  return DIVERGENCE_CHANNELS.map((spec) => {
    const marketChannel = findMarketChannel(marketChannels, spec);
    const signalAggregate =
      aggregates.get(spec.signalCategory) ?? emptySignalAggregate(spec.signalCategory);

    const rawSignalScore = signalAggregate.maxRawScore;
    const signalScore = normalizeSignalScore(rawSignalScore);
    const marketZ = round(getMarketZ(marketChannel), 3);
    const absMarketZ = round(getAbsMarketZ(marketChannel), 3);

    const signalElevated = signalScore >= SIGNAL_ELEVATED_THRESHOLD;
    const marketMoving = absMarketZ >= MARKET_MOVING_ABS_Z_THRESHOLD;
    const state = classifyState({ signalElevated, marketMoving });

    return {
      channel: spec.id,
      channel_label: marketChannel.label ?? spec.label,

      signal_category: spec.signalCategory,
      signal_score: signalScore,
      signal_score_pct: round(signalScore * 100, 1),
      signal_raw_score: rawSignalScore,
      signal_score_max: SIGNAL_SCORE_MAX,
      signal_elevated: signalElevated,
      signal_count: signalAggregate.count,
      signal_primary_count: signalAggregate.primaryCount,
      signal_secondary_count: signalAggregate.secondaryCount,
      top_signal: signalAggregate.topSignal,

      market_z: marketZ,
      abs_market_z: absMarketZ,
      market_moving: marketMoving,
      driver_instrument: getDriverInstrument(marketChannel),
      driver_instrument_id: marketChannel.driverInstrumentId ?? null,
      driver_instrument_label: marketChannel.driverInstrumentLabel ?? null,
      driver_as_of: marketChannel.driverAsOf ?? marketReadings.asOfClose ?? null,

      state,
    };
  });
}

function buildSignalOnlyRows(signalReport) {
  const aggregates = aggregateSignals(signalReport);

  return SIGNAL_ONLY_CATEGORIES.map((category) => {
    const signalAggregate = aggregates.get(category) ?? emptySignalAggregate(category);
    const signalScore = normalizeSignalScore(signalAggregate.maxRawScore);

    return {
      signal_category: category,
      display_mode: 'signal-only-v2',
      signal_score: signalScore,
      signal_score_pct: round(signalScore * 100, 1),
      signal_raw_score: signalAggregate.maxRawScore,
      signal_score_max: SIGNAL_SCORE_MAX,
      signal_elevated: signalScore >= SIGNAL_ELEVATED_THRESHOLD,
      signal_count: signalAggregate.count,
      signal_primary_count: signalAggregate.primaryCount,
      signal_secondary_count: signalAggregate.secondaryCount,
      top_signal: signalAggregate.topSignal,
    };
  });
}

function buildRetiredSignalRows(signalReport) {
  const aggregates = aggregateSignals(signalReport);

  return RETIRED_SIGNAL_CATEGORIES.map((category) => {
    const signalAggregate = aggregates.get(category) ?? emptySignalAggregate(category);
    const signalScore = normalizeSignalScore(signalAggregate.maxRawScore);

    return {
      signal_category: category,
      display_mode: 'retired-signal-channel',
      reason: 'Retired as a signal channel because VIX belongs on the market side of the board.',
      signal_score: signalScore,
      signal_score_pct: round(signalScore * 100, 1),
      signal_raw_score: signalAggregate.maxRawScore,
      signal_score_max: SIGNAL_SCORE_MAX,
      signal_count: signalAggregate.count,
      signal_primary_count: signalAggregate.primaryCount,
      signal_secondary_count: signalAggregate.secondaryCount,
      top_signal: signalAggregate.topSignal,
    };
  });
}

function countStates(rows) {
  return rows.reduce((counts, row) => {
    counts[row.state] = (counts[row.state] ?? 0) + 1;
    return counts;
  }, {});
}

function buildDivergenceReport({ signalReport, marketReadings }) {
  const rows = buildRows({ signalReport, marketReadings });
  const date =
    marketReadings.asOfClose ??
    marketReadings.date ??
    new Date().toISOString().slice(0, 10);

  return {
    title: 'CRUCIX Market Shock Divergence',
    generatedAt: new Date().toISOString(),
    date,
    asOfClose: marketReadings.asOfClose ?? date,
    framing: `readings as of market close, ${marketReadings.asOfClose ?? date}`,
    sourceFiles: {
      signal: 'dashboard/public/market-shock.json',
      market: 'dashboard/public/market-readings.json',
    },
    thresholds: {
      frozenAsOf: THRESHOLDS_FROZEN_AS_OF,
      signalScoreMax: SIGNAL_SCORE_MAX,
      signalElevatedThreshold: SIGNAL_ELEVATED_THRESHOLD,
      marketMovingAbsZThreshold: MARKET_MOVING_ABS_Z_THRESHOLD,
    },
    methodology: {
      signalSide:
        'For each divergence channel, use the highest Phase-1 signal item score mapped to that channel, including primary and secondary matched categories, then normalize by the Phase-1 item score ceiling.',
      marketSide:
        'Use the market-reading channel z-score from dashboard/public/market-readings.json: max absolute z-score among the channel instruments, with the driver instrument named.',
      classification:
        'radar-claim = elevated signal and quiet market; priced = elevated signal and moving market; radar-miss = quiet signal and moving market; calm = quiet signal and quiet market.',
    },
    decisions: {
      macroInflationShock: 'signal-only for v2',
      weatherClimateShock: 'signal-only for v2',
      marketVolatilitySignal:
        'retired as a signal channel; volatility remains on the market side through VIX where applicable',
    },
    stateCounts: countStates(rows),
    rows,
    signalOnly: buildSignalOnlyRows(signalReport),
    retiredSignals: buildRetiredSignalRows(signalReport),
  };
}

function runSelfTest() {
  const cases = [
    { signalElevated: true, marketMoving: false, expected: 'radar-claim' },
    { signalElevated: true, marketMoving: true, expected: 'priced' },
    { signalElevated: false, marketMoving: true, expected: 'radar-miss' },
    { signalElevated: false, marketMoving: false, expected: 'calm' },
  ];

  const failures = cases.filter((testCase) => {
    const actual = classifyState(testCase);
    return actual !== testCase.expected;
  });

  if (failures.length) {
    throw new Error(`Self-test failed: ${JSON.stringify(failures, null, 2)}`);
  }

  console.log('Self-test passed: all four divergence states are reachable.');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const signalReport = await readJson(SIGNAL_INPUT_PATH);
  const marketReadings = await readJson(MARKET_INPUT_PATH);

  const divergenceReport = buildDivergenceReport({ signalReport, marketReadings });

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(divergenceReport, null, 2)}\n`);

  console.log('CRUCIX Market Shock Divergence');
  console.log(`Date: ${divergenceReport.date}`);
  console.log(`Wrote: ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`);
  console.log('State counts:', divergenceReport.stateCounts);

  for (const row of divergenceReport.rows) {
    console.log(
      `${row.channel_label}: ${row.state} | signal ${row.signal_score_pct}% | market ${row.market_z}σ (${row.driver_instrument})`
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});