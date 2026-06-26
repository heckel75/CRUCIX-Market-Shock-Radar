import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = path.join("dashboard", "public", "market-readings.json");

const LOOKBACK_OBSERVATIONS = 5;
const WINDOW_OBSERVATIONS = 252;
const FETCH_START_CALENDAR_DAYS = 900;
const CURRENT_MAX_CALENDAR_LAG_DAYS = 3;
const MAX_STALE_CALENDAR_DAYS = 14;

const FRED_SOURCE = "FRED";
const TIINGO_SOURCE = "Tiingo";

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseEnv(text) {
  const env = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    const rawValue = line.slice(index + 1).trim();
    env[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return env;
}

function envOverride(key, fallback) {
  if (Object.prototype.hasOwnProperty.call(process.env, key)) {
    return process.env[key];
  }

  return fallback;
}

async function loadEnv() {
  let fileEnv = {};

  try {
    const text = await fs.readFile(".env", "utf8");
    fileEnv = parseEnv(text);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return {
    ...fileEnv,
    FRED_API_KEY: envOverride("FRED_API_KEY", fileEnv.FRED_API_KEY),
    TIINGO_API_KEY: envOverride("TIINGO_API_KEY", fileEnv.TIINGO_API_KEY)
  };
}

function requireApiKey(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} missing or blank in environment or .env`);
  }

  return value.trim();
}

function isoDateNDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function assertIsoDate(label, value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error(`${label} must be an ISO date, got ${JSON.stringify(value)}.`);
  }
}

function daysBetween(startIso, endIso) {
  assertIsoDate("start date", startIso);
  assertIsoDate("end date", endIso);

  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

function freshnessStatus(calendarLagDays) {
  if (calendarLagDays <= CURRENT_MAX_CALENDAR_LAG_DAYS) return "current";
  if (calendarLagDays <= MAX_STALE_CALENDAR_DAYS) return "lagging";
  return "stale";
}

function buildFreshness(asOfClose, generatedAt) {
  assertIsoDate("asOfClose", asOfClose);

  const generatedDate = String(generatedAt || "").slice(0, 10);
  assertIsoDate("generated date", generatedDate);

  const calendarLagDays = daysBetween(asOfClose, generatedDate);

  if (calendarLagDays < 0) {
    throw new Error(
      `Market close date ${asOfClose} is after generated date ${generatedDate}.`
    );
  }

  const status = freshnessStatus(calendarLagDays);
  const warning =
    status === "current"
      ? null
      : `Market readings are ${status}: generated ${generatedDate}, readings as of market close, ${asOfClose} (${calendarLagDays} calendar days old).`;

  return {
    status,
    generatedAt,
    generatedDate,
    runDate: generatedDate,
    asOfClose,
    calendarLagDays,
    currentMaxCalendarLagDays: CURRENT_MAX_CALENDAR_LAG_DAYS,
    staleAfterCalendarDays: MAX_STALE_CALENDAR_DAYS,
    warning
  };
}

function freshnessWarnings(freshness) {
  if (!freshness.warning) return [];

  return [
    {
      code: `market-readings-${freshness.status}`,
      severity: freshness.status === "stale" ? "error" : "warning",
      status: freshness.status,
      asOfClose: freshness.asOfClose,
      generatedDate: freshness.generatedDate,
      calendarLagDays: freshness.calendarLagDays,
      message: freshness.warning
    }
  ];
}

function assertFreshEnough(label, latestDate, referenceDate = todayIso()) {
  const staleDays = daysBetween(latestDate, referenceDate);

  if (staleDays > MAX_STALE_CALENDAR_DAYS) {
    throw new Error(
      `${label} is stale: latest source date ${latestDate}, ${staleDays} calendar days old.`
    );
  }

  return staleDays;
}

function assertNotStale(label, freshness) {
  if (freshness.status === "stale") {
    throw new Error(`${label} is stale. ${freshness.warning}`);
  }
}

async function fetchWithTimeout(url, label, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    return response;
  } catch (error) {
    throw new Error(`${label} fetch failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonResponse(response, label) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${label} returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 220)}`
    );
  }
}

async function fetchFredSeries(instrument, apiKey) {
  const fredApiKey = requireApiKey(apiKey, "FRED_API_KEY");

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", instrument.seriesId);
  url.searchParams.set("api_key", fredApiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", isoDateNDaysAgo(FETCH_START_CALENDAR_DAYS));

  console.log(`Fetching FRED: ${instrument.seriesId}`);

  const response = await fetchWithTimeout(url, `FRED ${instrument.seriesId}`);
  const data = await readJsonResponse(response, `FRED ${instrument.seriesId}`);

  if (!response.ok || data.error_code) {
    throw new Error(
      `FRED ${instrument.seriesId} failed: ${data.error_message || `HTTP ${response.status}`}`
    );
  }

  const points = (data.observations || [])
    .map((observation) => ({
      date: observation.date,
      value: Number(observation.value)
    }))
    .filter((point) => point.date && Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length < WINDOW_OBSERVATIONS + LOOKBACK_OBSERVATIONS) {
    throw new Error(
      `FRED ${instrument.seriesId} returned only ${points.length} usable observations; need at least ${WINDOW_OBSERVATIONS + LOOKBACK_OBSERVATIONS}.`
    );
  }

  return points;
}

async function fetchTiingoDaily(instrument, apiKey) {
  const tiingoApiKey = requireApiKey(apiKey, "TIINGO_API_KEY");

  const url = new URL(`https://api.tiingo.com/tiingo/daily/${instrument.symbol}/prices`);
  url.searchParams.set("startDate", isoDateNDaysAgo(FETCH_START_CALENDAR_DAYS));
  url.searchParams.set("format", "json");

  console.log(`Fetching Tiingo: ${instrument.symbol}`);

  const response = await fetchWithTimeout(url, `Tiingo ${instrument.symbol}`, {
    headers: {
      Authorization: `Token ${tiingoApiKey}`,
      Accept: "application/json"
    }
  });

  const data = await readJsonResponse(response, `Tiingo ${instrument.symbol}`);

  if (!response.ok) {
    throw new Error(
      `Tiingo ${instrument.symbol} failed: ${data.detail || data.message || `HTTP ${response.status}`}`
    );
  }

  if (!Array.isArray(data)) {
    throw new Error(
      `Tiingo ${instrument.symbol} did not return a price array: ${JSON.stringify(data).slice(0, 220)}`
    );
  }

  const points = data
    .map((row) => ({
      date: String(row.date || "").slice(0, 10),
      value: Number(row.adjClose)
    }))
    .filter((point) => point.date && Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length < WINDOW_OBSERVATIONS + LOOKBACK_OBSERVATIONS) {
    throw new Error(
      `Tiingo ${instrument.symbol} returned only ${points.length} adjusted-close observations; need at least ${WINDOW_OBSERVATIONS + LOOKBACK_OBSERVATIONS}.`
    );
  }

  return points;
}

async function fetchInstrument(instrument, env) {
  if (instrument.source === FRED_SOURCE) {
    return {
      ...instrument,
      symbol: instrument.seriesId,
      sourceName: FRED_SOURCE,
      sourceDetail: `FRED ${instrument.seriesId}`,
      valueField: "value",
      points: await fetchFredSeries(instrument, env.FRED_API_KEY)
    };
  }

  if (instrument.source === TIINGO_SOURCE) {
    return {
      ...instrument,
      sourceName: TIINGO_SOURCE,
      sourceDetail: `Tiingo EOD ${instrument.symbol} adjClose`,
      valueField: "adjClose",
      points: await fetchTiingoDaily(instrument, env.TIINGO_API_KEY)
    };
  }

  if (instrument.candidates) {
    const failures = [];

    for (const candidate of instrument.candidates) {
      const candidateInstrument = {
        ...instrument,
        source: candidate.source,
        symbol: candidate.symbol,
        label: candidate.label || instrument.label,
        candidateRole: candidate.role || "proxy"
      };

      try {
        const resolved = await fetchInstrument(candidateInstrument, env);
        return {
          ...resolved,
          preferredSymbol: instrument.candidates[0].symbol,
          fallbackSymbols: instrument.candidates.slice(1).map((item) => item.symbol)
        };
      } catch (error) {
        failures.push(`${candidate.symbol}: ${error.message}`);
        console.warn(`Candidate failed for ${instrument.id}: ${candidate.symbol}`);
      }
    }

    throw new Error(
      `No candidate source worked for ${instrument.id}. Failures: ${failures.join(" | ")}`
    );
  }

  throw new Error(`Unknown source for instrument ${instrument.id}`);
}

function attachDateMaps(resolvedInstrument) {
  const pointByDate = new Map();

  for (const point of resolvedInstrument.points) {
    pointByDate.set(point.date, point);
  }

  return {
    ...resolvedInstrument,
    pointByDate,
    dateSet: new Set(pointByDate.keys()),
    sourceLatestDate: resolvedInstrument.points[resolvedInstrument.points.length - 1].date
  };
}

function intersectDates(instruments) {
  const sorted = [...instruments].sort((a, b) => a.dateSet.size - b.dateSet.size);
  const [smallest, ...rest] = sorted;

  return [...smallest.dateSet]
    .filter((date) => rest.every((instrument) => instrument.dateSet.has(date)))
    .sort((a, b) => a.localeCompare(b));
}

function transformBetween(currentValue, priorValue, type, instrumentId) {
  if (type === "price") {
    if (priorValue === 0) {
      throw new Error(`${instrumentId} cannot compute return from prior value 0.`);
    }

    return currentValue / priorValue - 1;
  }

  if (type === "level") {
    return currentValue - priorValue;
  }

  throw new Error(`Unknown instrument type for ${instrumentId}: ${type}`);
}

function computeZReading(instrument, commonDates, globalAsOfClose, generatedDate) {
  const effectiveIndex = commonDates.lastIndexOf(globalAsOfClose);

  if (effectiveIndex === -1) {
    throw new Error(
      `${instrument.id} has no common-date observation on global asOfClose ${globalAsOfClose}.`
    );
  }

  const startIndex = effectiveIndex - WINDOW_OBSERVATIONS + 1;

  if (startIndex < LOOKBACK_OBSERVATIONS) {
    throw new Error(
      `${instrument.id} has insufficient common-date history for ${WINDOW_OBSERVATIONS} transformed observations as of ${globalAsOfClose}.`
    );
  }

  const windowValues = [];

  for (let index = startIndex; index <= effectiveIndex; index += 1) {
    const currentDate = commonDates[index];
    const priorDate = commonDates[index - LOOKBACK_OBSERVATIONS];

    const current = instrument.pointByDate.get(currentDate);
    const prior = instrument.pointByDate.get(priorDate);

    if (!current || !prior) {
      throw new Error(`${instrument.id} missing aligned dates ${priorDate} or ${currentDate}.`);
    }

    windowValues.push(
      transformBetween(current.value, prior.value, instrument.type, instrument.id)
    );
  }

  const currentDate = commonDates[effectiveIndex];
  const priorDate = commonDates[effectiveIndex - LOOKBACK_OBSERVATIONS];
  const current = instrument.pointByDate.get(currentDate);
  const prior = instrument.pointByDate.get(priorDate);
  const latestTransform = windowValues[windowValues.length - 1];

  const mean =
    windowValues.reduce((total, value) => total + value, 0) / windowValues.length;

  const variance =
    windowValues.reduce((total, value) => total + (value - mean) ** 2, 0) /
    (windowValues.length - 1);

  const stdDev = Math.sqrt(variance);

  if (!Number.isFinite(stdDev) || stdDev === 0) {
    throw new Error(`${instrument.id} has zero or invalid trailing standard deviation.`);
  }

  const zScore = (latestTransform - mean) / stdDev;
  const sourceStaleDays = assertFreshEnough(
    instrument.id,
    instrument.sourceLatestDate,
    generatedDate
  );

  return {
    id: instrument.id,
    label: instrument.label,
    symbol: instrument.symbol,
    source: instrument.sourceName,
    sourceDetail: instrument.sourceDetail,
    valueField: instrument.valueField,
    type: instrument.type,
    transform:
      instrument.type === "price"
        ? "5-day return z-score"
        : "5-day level-change z-score",
    asOf: currentDate,
    sourceLatestDate: instrument.sourceLatestDate,
    sourceStaleDays,
    sourceToGlobalLagDays: daysBetween(currentDate, instrument.sourceLatestDate),
    value: round(current.value, 4),
    valueFiveCommonDatesAgo: round(prior.value, 4),
    priorDate,
    fiveDayReturn: instrument.type === "price" ? round(latestTransform, 6) : null,
    fiveDayReturnPct: instrument.type === "price" ? round(latestTransform * 100, 3) : null,
    fiveDayLevelChange: instrument.type === "level" ? round(latestTransform, 6) : null,
    zScore: round(zScore, 3),
    absZScore: round(Math.abs(zScore), 3),
    trailingWindowObservationCount: windowValues.length,
    trailingWindowStartDate: commonDates[startIndex],
    trailingWindowEndDate: currentDate,
    trailingWindowMean: round(mean, 6),
    trailingWindowStdDev: round(stdDev, 6)
  };
}

function validateMarketReadings(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("market readings output must be a JSON object.");
  }

  assertIsoDate("market readings asOfClose", report.asOfClose);
  assertIsoDate("market readings generatedDate", report.generatedDate);

  if (!report.freshness || typeof report.freshness !== "object") {
    throw new Error("market readings output must include freshness metadata.");
  }

  if (!["current", "lagging"].includes(report.freshness.status)) {
    throw new Error(
      `market readings freshness status must be current or lagging before write, got ${report.freshness.status}.`
    );
  }

  if (!Number.isInteger(report.calendarLagDays) || report.calendarLagDays < 0) {
    throw new Error("market readings output must include non-negative calendarLagDays.");
  }

  if (!Array.isArray(report.warnings)) {
    throw new Error("market readings output must include a warnings array.");
  }

  if (!Array.isArray(report.channels) || report.channels.length === 0) {
    throw new Error("market readings output must include non-empty channels.");
  }

  for (const channel of report.channels) {
    if (!channel.id || !channel.label) {
      throw new Error("each market channel must include id and label.");
    }

    if (!Number.isFinite(Number(channel.marketZ))) {
      throw new Error(`market channel ${channel.id} must include numeric marketZ.`);
    }

    if (!Number.isFinite(Number(channel.absMarketZ))) {
      throw new Error(`market channel ${channel.id} must include numeric absMarketZ.`);
    }

    if (!channel.driverInstrument || !channel.driverAsOf) {
      throw new Error(`market channel ${channel.id} must include driver metadata.`);
    }
  }
}

async function writeJsonAtomically(filePath, value) {
  const directory = path.dirname(filePath);
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

const INSTRUMENTS = {
  brent: {
    id: "brent",
    label: "Brent crude oil",
    source: FRED_SOURCE,
    seriesId: "DCOILBRENTEU",
    type: "price"
  },
  wti: {
    id: "wti",
    label: "WTI crude oil",
    source: FRED_SOURCE,
    seriesId: "DCOILWTICO",
    type: "price"
  },
  vix: {
    id: "vix",
    label: "CBOE Volatility Index",
    source: FRED_SOURCE,
    seriesId: "VIXCLS",
    type: "level"
  },
  inflationExpectations: {
    id: "inflation-expectations",
    label: "10-year breakeven inflation rate",
    source: FRED_SOURCE,
    seriesId: "T10YIE",
    type: "level"
  },
  highYieldSpreads: {
    id: "high-yield-spreads",
    label: "High-yield option-adjusted spread",
    source: FRED_SOURCE,
    seriesId: "BAMLH0A0HYM2",
    type: "level"
  },
  tenYearTreasury: {
    id: "ten-year-treasury",
    label: "10-year Treasury yield",
    source: FRED_SOURCE,
    seriesId: "DGS10",
    type: "level"
  },
  broadUsd: {
    id: "broad-usd",
    label: "Broad U.S. dollar index",
    source: FRED_SOURCE,
    seriesId: "DTWEXBGS",
    type: "price"
  },
  gold: {
    id: "gold",
    label: "Gold ETF",
    source: TIINGO_SOURCE,
    symbol: "GLD",
    type: "price"
  },
  defenseEquities: {
    id: "defense-equities",
    label: "Defense equities ETF",
    source: TIINGO_SOURCE,
    symbol: "ITA",
    type: "price"
  },
  emEquities: {
    id: "em-equities",
    label: "Emerging-market equities ETF",
    source: TIINGO_SOURCE,
    symbol: "EEM",
    type: "price"
  },
  broadCommodities: {
    id: "broad-commodities",
    label: "Broad commodities ETF",
    type: "price",
    candidates: [
      {
        source: TIINGO_SOURCE,
        symbol: "DBC",
        label: "Broad commodities ETF",
        role: "preferred"
      },
      {
        source: TIINGO_SOURCE,
        symbol: "CPER",
        label: "Copper ETF",
        role: "fallback"
      }
    ]
  },
  banks: {
    id: "banks",
    label: "Bank equities ETF",
    source: TIINGO_SOURCE,
    symbol: "KBE",
    type: "price"
  },
  semiconductors: {
    id: "semiconductors",
    label: "Semiconductor equities ETF",
    type: "price",
    candidates: [
      {
        source: TIINGO_SOURCE,
        symbol: "SOXX",
        label: "Semiconductor equities ETF",
        role: "preferred"
      },
      {
        source: TIINGO_SOURCE,
        symbol: "SMH",
        label: "Semiconductor equities ETF",
        role: "fallback"
      }
    ]
  },
  industrials: {
    id: "industrials",
    label: "Industrials equities ETF",
    source: TIINGO_SOURCE,
    symbol: "XLI",
    type: "price"
  }
};

const CHANNELS = [
  {
    id: "conflict-escalation",
    label: "Conflict escalation",
    instruments: ["brent", "gold", "vix", "defenseEquities"]
  },
  {
    id: "sanctions-policy",
    label: "Sanctions / policy",
    instruments: ["broadUsd", "emEquities", "broadCommodities"]
  },
  {
    id: "energy-disruption",
    label: "Energy disruption",
    instruments: ["brent", "wti", "inflationExpectations"]
  },
  {
    id: "credit-stress",
    label: "Credit stress",
    instruments: ["highYieldSpreads", "banks", "tenYearTreasury"]
  },
  {
    id: "supply-chain",
    label: "Supply chain",
    instruments: ["semiconductors", "industrials"]
  }
];

function buildChannelReading(channel, instrumentReadings) {
  const readings = channel.instruments.map((instrumentKey) => {
    const instrument = instrumentReadings[instrumentKey];

    if (!instrument) {
      throw new Error(`Missing instrument reading ${instrumentKey} for ${channel.id}`);
    }

    return instrument;
  });

  const driver = [...readings].sort((a, b) => b.absZScore - a.absZScore)[0];

  return {
    id: channel.id,
    label: channel.label,
    marketZ: driver.zScore,
    absMarketZ: driver.absZScore,
    driverInstrument: driver.symbol,
    driverInstrumentId: driver.id,
    driverInstrumentLabel: driver.label,
    driverAsOf: driver.asOf,
    instruments: readings
  };
}

async function main() {
  const env = await loadEnv();
  const generatedAt = new Date().toISOString();
  const generatedDate = generatedAt.slice(0, 10);

  const resolvedSeries = {};

  for (const [key, instrument] of Object.entries(INSTRUMENTS)) {
    const resolved = await fetchInstrument(instrument, env);
    resolvedSeries[key] = attachDateMaps(resolved);
  }

  const commonDates = intersectDates(Object.values(resolvedSeries));

  if (commonDates.length < WINDOW_OBSERVATIONS + LOOKBACK_OBSERVATIONS) {
    throw new Error(
      `Only ${commonDates.length} common usable dates across all instruments; need at least ${WINDOW_OBSERVATIONS + LOOKBACK_OBSERVATIONS}.`
    );
  }

  const globalAsOfClose = commonDates[commonDates.length - 1];
  const freshness = buildFreshness(globalAsOfClose, generatedAt);
  assertNotStale("global asOfClose", freshness);
  const warnings = freshnessWarnings(freshness);

  const instrumentReadings = {};

  for (const [key, instrument] of Object.entries(resolvedSeries)) {
    instrumentReadings[key] = computeZReading(
      instrument,
      commonDates,
      globalAsOfClose,
      generatedDate
    );
  }

  const channels = CHANNELS.map((channel) => buildChannelReading(channel, instrumentReadings));

  const marketReadings = {
    title: "CRUCIX Market Readings",
    generatedAt,
    generatedDate,
    runDate: generatedDate,
    asOfClose: globalAsOfClose,
    globalStaleDays: freshness.calendarLagDays,
    calendarLagDays: freshness.calendarLagDays,
    freshnessStatus: freshness.status,
    freshness,
    framing: `Readings as of market close, ${globalAsOfClose}.`,
    methodology: {
      uniformTransform:
        "Price instruments use a 5-common-observation return z-score. Level instruments use a 5-common-observation level-change z-score. Both are compared against a trailing 252-common-observation window.",
      dateAlignment:
        "The script computes the latest common usable market date across all instruments, then uses the same aligned common-date window for every instrument.",
      priceInstrumentRule:
        "z-score of the latest 5-observation return against the trailing 1-year distribution of 5-observation returns",
      levelInstrumentRule:
        "z-score of the latest 5-observation level change against the trailing 1-year distribution of 5-observation level changes",
      channelRule:
        "Each channel reading is the max absolute z-score among its instruments, with the driving instrument named.",
      lookbackObservations: LOOKBACK_OBSERVATIONS,
      trailingWindowObservations: WINDOW_OBSERVATIONS,
      commonDateCount: commonDates.length
    },
    dataSources: {
      fred: "https://api.stlouisfed.org/fred/series/observations",
      tiingo: "https://api.tiingo.com/tiingo/daily/{ticker}/prices",
      sourceDecision:
        "The frozen Phase 2 design specified Stooq CSV for ETF proxies. Local Node and curl tests returned browser-verification HTML and then Access denied, so ETF proxies are fetched from Tiingo EOD using adjClose. This keeps the proxy symbols and avoids unofficial Yahoo endpoints.",
      goldDecision:
        "A suggested FRED gold replacement, GOLDAMGBD228NLBM, returned 'series does not exist' in the FRED API test, so GLD remains the gold proxy and is fetched from Tiingo adjClose.",
      alphaVantageDecision:
        "Alpha Vantage daily CSV worked for compact GLD history, but outputsize=full returned a premium-gated response, so it cannot support the required trailing 1-year z-score window on the free key.",
      etfValueField: "Tiingo adjClose"
    },
    selectedProxies: {
      gold: instrumentReadings.gold.symbol,
      broadCommodities: instrumentReadings.broadCommodities.symbol,
      semiconductors: instrumentReadings.semiconductors.symbol
    },
    channels,
    channelReadings: Object.fromEntries(channels.map((channel) => [channel.id, channel])),
    instruments: Object.fromEntries(
      Object.entries(instrumentReadings).map(([key, reading]) => [key, reading])
    ),
    warnings
  };

  validateMarketReadings(marketReadings);
  await writeJsonAtomically(OUTPUT_PATH, marketReadings);

  console.log("");
  console.log("CRUCIX Market Readings");
  console.log(`asOfClose: ${marketReadings.asOfClose}`);
  console.log(`freshness: ${marketReadings.freshnessStatus}`);
  console.log(`calendar lag: ${marketReadings.calendarLagDays} days`);
  console.log(`common usable dates: ${marketReadings.methodology.commonDateCount}`);
  console.log(`Gold proxy: ${marketReadings.selectedProxies.gold}`);
  console.log(`Broad commodities proxy: ${marketReadings.selectedProxies.broadCommodities}`);
  console.log(`Semiconductors proxy: ${marketReadings.selectedProxies.semiconductors}`);
  console.log("");
  for (const channel of channels) {
    console.log(
      `${channel.label}: ${channel.marketZ}σ driven by ${channel.driverInstrument} (${channel.driverAsOf})`
    );
  }
  for (const warning of warnings) {
    console.warn(`Warning: ${warning.message}`);
  }
  console.log("");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("");
  console.error("market-data failed:");
  console.error(error.message);
  process.exit(1);
});
