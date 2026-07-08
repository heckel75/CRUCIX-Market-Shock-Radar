import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const FORCE = process.argv.includes("--force");
const STRICT_EXISTING_DIFF = process.argv.includes("--strict-existing-diff");

const DIVERGENCE_PATH = path.join(PROJECT_ROOT, "dashboard", "public", "divergence.json");
const PUBLIC_DASHBOARD_DIR = path.join(PROJECT_ROOT, "dashboard", "public");
const LOG_DIR = path.join(PROJECT_ROOT, "log");
const DOCS_DIR = path.join(PROJECT_ROOT, "docs");
const DOCS_LOG_DIR = path.join(DOCS_DIR, "log");
const RUN_LOG_DIR = path.join(LOG_DIR, "runs");
const DOCS_RUN_LOG_DIR = path.join(DOCS_LOG_DIR, "runs");

const PUBLIC_FILE_COPIES = [
  ["market-shock.html", "index.html"],
  ["market-shock.json", "market-shock.json"],
  ["market-readings.json", "market-readings.json"],
  ["divergence.json", "divergence.json"],
  ["history.html", "history.html"]
];

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function hasAny(object, keys) {
  return keys.some((key) => hasOwn(object, key));
}

function getRowValue(row, keys) {
  for (const key of keys) {
    if (hasOwn(row, key)) return row[key];
  }

  return undefined;
}

function validateDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error("divergence.json must include a top-level ISO date field.");
  }
}

function validateIsoDateField(label, value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error(`${label} must be an ISO date, got ${JSON.stringify(value)}.`);
  }
}

function runDateFromSnapshot(snapshot) {
  const runDate =
    snapshot.marketFreshness?.runDate ||
    snapshot.marketReadings?.generatedDate ||
    String(snapshot.generatedAt || new Date().toISOString()).slice(0, 10);

  validateIsoDateField("runDate", runDate);
  return runDate;
}

function runFileNameFromSnapshot(snapshot) {
  const generatedAt = String(snapshot.generatedAt || new Date().toISOString());
  const safeGeneratedAt = generatedAt
    .replace(/[:.]/g, "-")
    .replace(/[^0-9A-Za-z-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safeGeneratedAt || Date.now()}.json`;
}

function relativeProjectPath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join("/");
}

function existingSnapshotDiffWarning(snapshot, snapshotPath) {
  return [
    `Snapshot for ${snapshot.date} already exists with different contents.`,
    "Market readings have not advanced beyond this close date.",
    `Keeping existing ${relativeProjectPath(snapshotPath)}. Use --force only for an intentional correction.`
  ].join("\n");
}

function validateRow(row, index) {
  const prefix = `rows[${index}]`;

  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`${prefix} must be an object.`);
  }

  if (!hasOwn(row, "channel") || !row.channel) {
    throw new Error(`${prefix} must include channel.`);
  }

  if (!hasAny(row, ["signal_score", "signalScore"])) {
    throw new Error(`${prefix} must include signal_score or signalScore.`);
  }

  if (!hasAny(row, ["market_z", "marketZ"])) {
    throw new Error(`${prefix} must include market_z or marketZ.`);
  }

  if (!hasAny(row, ["driver_instrument", "driverInstrument"])) {
    throw new Error(`${prefix} must include driver_instrument or driverInstrument.`);
  }

  if (!hasOwn(row, "state") || !row.state) {
    throw new Error(`${prefix} must include state.`);
  }
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("divergence.json must contain a JSON object.");
  }

  validateDate(snapshot.date);

  if (!Array.isArray(snapshot.rows)) {
    throw new Error("divergence.json must include a top-level rows array.");
  }

  snapshot.rows.forEach(validateRow);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJsonAtomically(filePath, value) {
  const directory = path.dirname(filePath);
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function writeSnapshot(snapshot) {
  await mkdir(LOG_DIR, { recursive: true });

  const snapshotPath = path.join(LOG_DIR, `${snapshot.date}.json`);
  const nextContents = `${JSON.stringify(snapshot, null, 2)}\n`;

  if (await pathExists(snapshotPath)) {
    const existingContents = await readFile(snapshotPath, "utf8");

    if (existingContents === nextContents) {
      return {
        path: snapshotPath,
        status: "unchanged"
      };
    }

    if (!FORCE) {
      if (!STRICT_EXISTING_DIFF) {
        return {
          path: snapshotPath,
          status: "kept",
          warning: existingSnapshotDiffWarning(snapshot, snapshotPath)
        };
      }

      throw new Error(
        `${relativeProjectPath(snapshotPath)} already exists with different contents. Re-run with --force to overwrite.`
      );
    }
  }

  await writeJsonAtomically(snapshotPath, snapshot);

  return {
    path: snapshotPath,
    status: "wrote"
  };
}

function countStates(rows) {
  return rows.reduce((counts, row) => {
    const state = row.state || "unknown";
    counts[state] = (counts[state] || 0) + 1;
    return counts;
  }, {});
}

function snapshotWarnings(snapshot) {
  return Array.isArray(snapshot.warnings)
    ? snapshot.warnings.map((warning) => {
        if (typeof warning === "string") {
          return {
            code: "snapshot-warning",
            severity: "warning",
            message: warning
          };
        }

        return warning;
      })
    : [];
}

async function listSnapshotDates() {
  const entries = await readdir(LOG_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .map((name) => name.slice(0, -5))
    .sort((a, b) => b.localeCompare(a));
}

async function buildManifest() {
  const dates = await listSnapshotDates();
  const snapshots = [];

  for (const date of dates) {
    const snapshot = await readJson(path.join(LOG_DIR, `${date}.json`));
    validateSnapshot(snapshot);

    snapshots.push({
      date,
      file: `${date}.json`,
      path: `log/${date}.json`,
      framing: snapshot.framing || `readings as of market close, ${date}`,
      generatedAt: snapshot.generatedAt || null,
      marketFreshness: snapshot.marketFreshness || snapshot.marketReadings || null,
      warnings: snapshotWarnings(snapshot),
      rowCount: snapshot.rows.length,
      stateCounts: snapshot.stateCounts || countStates(snapshot.rows)
    });
  }

  return {
    title: "CRUCIX Market Shock Snapshot Manifest",
    generatedAt: new Date().toISOString(),
    count: snapshots.length,
    snapshots
  };
}

async function writeManifest() {
  const manifest = await buildManifest();
  const manifestPath = path.join(LOG_DIR, "index.json");

  await writeJsonAtomically(manifestPath, manifest);

  return {
    manifest,
    path: manifestPath
  };
}

async function listRunFiles() {
  try {
    const entries = await readdir(RUN_LOG_DIR, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name !== "index.json" && /\.json$/.test(name))
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function buildRunRecord(snapshot, snapshotResult) {
  return {
    generatedAt: snapshot.generatedAt || null,
    recordedAt: new Date().toISOString(),
    runDate: runDateFromSnapshot(snapshot),
    snapshotDate: snapshot.date,
    asOfClose: snapshot.asOfClose || snapshot.date,
    snapshotStatus: snapshotResult.status,
    snapshotWarning: snapshotResult.warning || null,
    marketFreshness: snapshot.marketFreshness || snapshot.marketReadings || null,
    warnings: snapshotWarnings(snapshot),
    rowCount: snapshot.rows.length,
    stateCounts: snapshot.stateCounts || countStates(snapshot.rows)
  };
}

async function buildRunManifest() {
  const runs = [];

  for (const fileName of await listRunFiles()) {
    const run = await readJson(path.join(RUN_LOG_DIR, fileName));

    runs.push({
      file: fileName,
      path: `log/runs/${fileName}`,
      generatedAt: run.generatedAt || null,
      recordedAt: run.recordedAt || null,
      runDate: run.runDate || null,
      snapshotDate: run.snapshotDate || null,
      asOfClose: run.asOfClose || null,
      snapshotStatus: run.snapshotStatus || null,
      snapshotWarning: run.snapshotWarning || null,
      marketFreshness: run.marketFreshness || null,
      warnings: Array.isArray(run.warnings) ? run.warnings : [],
      rowCount: run.rowCount || 0,
      stateCounts: run.stateCounts || {}
    });
  }

  runs.sort((a, b) => {
    const generatedCompare = String(b.generatedAt || "").localeCompare(
      String(a.generatedAt || "")
    );
    if (generatedCompare !== 0) return generatedCompare;

    return String(b.recordedAt || "").localeCompare(String(a.recordedAt || ""));
  });

  return {
    title: "CRUCIX Daily Run Manifest",
    generatedAt: new Date().toISOString(),
    count: runs.length,
    runs
  };
}

async function writeRunLog(snapshot, snapshotResult) {
  await mkdir(RUN_LOG_DIR, { recursive: true });

  const runRecord = buildRunRecord(snapshot, snapshotResult);
  const runPath = path.join(RUN_LOG_DIR, runFileNameFromSnapshot(snapshot));
  await writeJsonAtomically(runPath, runRecord);

  const manifest = await buildRunManifest();
  const manifestPath = path.join(RUN_LOG_DIR, "index.json");
  await writeJsonAtomically(manifestPath, manifest);

  return {
    manifest,
    manifestPath,
    runPath
  };
}

async function copyIfExists(fromPath, toPath) {
  if (!(await pathExists(fromPath))) return "missing";

  await mkdir(path.dirname(toPath), { recursive: true });
  await copyFile(fromPath, toPath);
  return "copied";
}

async function syncDocs() {
  const copied = [];

  await mkdir(DOCS_DIR, { recursive: true });
  await mkdir(DOCS_LOG_DIR, { recursive: true });
  await mkdir(DOCS_RUN_LOG_DIR, { recursive: true });

  for (const [sourceName, targetName] of PUBLIC_FILE_COPIES) {
    const sourcePath = path.join(PUBLIC_DASHBOARD_DIR, sourceName);
    const targetPath = path.join(DOCS_DIR, targetName);
    const status = await copyIfExists(sourcePath, targetPath);
    copied.push({
      from: sourcePath,
      to: targetPath,
      status
    });
  }

  const logFiles = (await readdir(LOG_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name === "index.json" || /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort();

  for (const fileName of logFiles) {
    const sourcePath = path.join(LOG_DIR, fileName);
    const targetPath = path.join(DOCS_LOG_DIR, fileName);
    await copyFile(sourcePath, targetPath);
    copied.push({
      from: sourcePath,
      to: targetPath,
      status: "copied"
    });
  }

  const runFiles = ["index.json", ...(await listRunFiles())];

  for (const fileName of runFiles) {
    const sourcePath = path.join(RUN_LOG_DIR, fileName);
    if (!(await pathExists(sourcePath))) continue;

    const targetPath = path.join(DOCS_RUN_LOG_DIR, fileName);
    await copyFile(sourcePath, targetPath);
    copied.push({
      from: sourcePath,
      to: targetPath,
      status: "copied"
    });
  }

  return copied;
}

function summarizeCopy(copyResult) {
  const status = copyResult.status === "missing" ? "missing optional" : copyResult.status;
  return `${status}: ${path.relative(PROJECT_ROOT, copyResult.to)}`;
}

async function main() {
  const snapshot = await readJson(DIVERGENCE_PATH);
  validateSnapshot(snapshot);

  const snapshotResult = await writeSnapshot(snapshot);
  const runLogResult = await writeRunLog(snapshot, snapshotResult);
  let manifestResult = null;

  if (snapshotResult.warning) {
    console.warn(snapshotResult.warning);
  } else {
    manifestResult = await writeManifest();
  }

  const copyResults = await syncDocs();

  console.log("CRUCIX daily snapshot");
  console.log(`Date: ${snapshot.date}`);
  console.log(`${snapshotResult.status}: ${relativeProjectPath(snapshotResult.path)}`);
  console.log(`wrote: ${relativeProjectPath(runLogResult.runPath)}`);
  console.log(`wrote: ${relativeProjectPath(runLogResult.manifestPath)}`);

  if (manifestResult) {
    console.log(`wrote: ${relativeProjectPath(manifestResult.path)}`);
    console.log(`Snapshot manifest entries: ${manifestResult.manifest.count}`);
  } else {
    console.log("kept: close-date manifest unchanged");
  }

  console.log(`Run manifest entries: ${runLogResult.manifest.count}`);
  console.log("");
  console.log("Synced public files:");

  for (const copyResult of copyResults) {
    console.log(`- ${summarizeCopy(copyResult)}`);
  }
}

main().catch((error) => {
  console.error("daily snapshot failed:");
  console.error(error.message);
  process.exitCode = 1;
});
