# CRUCIX Market Shock Radar — Project Session Log

> **Purpose of this file**  
> This is the single source of truth for building the **CRUCIX Market Shock Radar** project across multiple ChatGPT sessions.
>
> At the beginning of each session, open or upload this file and say:
>
> ```txt
> Ready for session X. Read the project log first, continue from the current state, and help me complete this session. At the end, give me the exact updates to apply to this file.
> ```
>
> Replace `X` with the session number.

---

## 1. Project Summary

**Project name:** CRUCIX Market Shock Radar  
**Core idea:** Convert Crucix OSINT signals into possible capital-market transmission channels, then put each channel's signal reading **next to what the market is actually pricing**, and log the divergence daily.  
**Local dashboard URL:** `http://localhost:3117/market-shock.html`  
**Primary input:** `http://localhost:3117/api/data` plus free market data (FRED API + Tiingo EOD `adjClose` for ETF price instruments)
**Primary output:** `dashboard/public/market-shock.json`, `dashboard/public/market-readings.json`, `dashboard/public/divergence.json`, `dashboard/public/market-shock.html`, dated daily snapshots under `log/`  
**Public deployment:** currently `https://heckel75.github.io/CRUCIX-Market-Shock-Radar/`; target canonical home is `crucix.divergencelog.com` (subdomain of the owned `divergencelog.com`, where the World Cup project lives at `worldcup.divergencelog.com`)

### One-line pitch

> Most dashboards show what moved. This one logs, daily, where real-world signals and market pricing disagree.

### Framing rule (important)

This is a **daily log, not a live radar**. Market data is end-of-day. Every view must say plainly: `readings as of market close, {date}`. Never imply real-time.

### Expected final output (Phase 2 target)

- **Divergence board (the hero element):** one row per channel showing the OSINT signal reading next to the market reading, classified into one of four states (see Phase 2 Design Spec)
- **Shock Mix decomposition** (category breadth, concentration penalty, ranked signals) — prominent
- **Market Shock Score `0/20`** — kept, but visually demoted; it is deliberately the least important element on the page
- Ranked signals from Crucix data with category, confidence, matched keywords, explanation
- **History page:** dated daily snapshots rendered backwards, so the log accumulates a verifiable track record (including misses)

### Important disclaimer

This project is:

- an experimental market-intelligence prototype
- not investment advice
- not a trading bot
- not a buy/sell recommendation system

---

## 2. How to Use This File With ChatGPT

### Starting a new session

At the start of each session, the user should be able to say only:

```txt
Ready for session X
```

ChatGPT must then:

- read this project log first
- explain the session goal briefly
- state the key decisions needed before work starts
- recommend defaults when decisions are minor
- ask the user to confirm or correct those decisions
- then provide a clear work order to Claude
- work strictly step by step after Claude returns output
- give one command or one action at a time
- wait for user output before continuing
- at the end, provide a Claude work order to update this project log

### Ending a session

At the end of every session, ChatGPT should help update:

1. `Current State`
2. The relevant `Session X Log`
3. `Decisions Made`
4. `Open Questions`
5. `Issues / Bugs`
6. `Next Session Adjustments`
7. `Done Checklist`

### Rule for scope control

Each session should focus mainly on its session objective. If something unexpected appears, log it under `Open Questions`, `Issues / Bugs`, or `Next Session Adjustments` instead of derailing the session.

### Collaboration protocol

For this project, ChatGPT should work in strict step-by-step mode during implementation, setup, debugging, testing, and validation.

Rules:

- Give only one command or one action at a time.
- Wait for the user to paste the output before continuing.
- Prefer Windows Command Prompt commands because the project is being built in `D:\WinProjects\CRUCIX`.
- Clearly label which terminal should be used when two terminals are needed.
- Do not provide long multi-step blocks during setup, debugging, or testing.
- When something fails, explain the likely cause in plain language, then give one recovery command.
- At the end of each session, if many sections changed, provide the full updated project log file instead of many separate patches.
- Keep the session focused on the current session goal. Put side ideas into `Open Questions`, `Issues / Bugs`, or `Next Session Adjustments`.

Commit/push shortcut:

- After implementation is complete, expected files are known, and validation has passed, use a compressed final commit/push flow.
- ChatGPT should provide the exact commit message, say when to commit, and say when to push.
- Do not require repeated separate `git status`, `git diff --stat`, or `git log` checks during routine finalization unless there is a risk or unexpected output.
- The user can run the final commit/push flow without pasting every intermediate output.
- Ask the user to paste output only if `git status` shows unexpected files, validation failed, commit failed, push failed, there is a merge/conflict/auth problem, or secrets/generated files may have been accidentally included.
- Recommended default after a successful implementation summary from Claude: provide one compact final command block or clear commit message plus push instruction, instead of many micro-steps.
- Keep one-command-at-a-time for risky or diagnostic work, not routine finalization.

---

## 3. Current State

**Current session cursor:** Session 13 complete — next session is Session 14
**Overall status:** Phase 1 (Sessions 1–6) complete. Project pivoted on 2026-06-11: the original Session 7 (LinkedIn launch) is **superseded**. Phase 2 added the market side so each channel shows signal vs. market movement, classified into divergence states and logged daily. Phase 2 is now the operational **legacy baseline**, not the final methodology. Methodology 2.0 is being audited and designed beginning in Session 14. The LinkedIn post is deferred and will be drafted **outside these ChatGPT sessions** against a separate strategy file (see Section 12).
**Methodology review status:** The first Methodology 2.0 planning amendment was committed and pushed (`e4ba8fd Update project log for methodology audit`). That direction remains valid, but this 2026-07-10 architecture-review amendment supersedes it on sequencing and architecture detail. Session 14 is still next, but it is now a Methodology 2.0 architecture and audit-protocol gate, not an attempt to complete the full signal audit and market audit in one 90-minute block. Launch staging, custom-domain work, and the deferred board screenshot remain paused until the Methodology 2.0 gates are resolved. Existing daily automation should continue unchanged during the audit unless it is broken. Existing close-date snapshots and run records remain immutable and must not be recomputed retrospectively. Do not retroactively claim that legacy snapshots contain a methodology version; current artifacts do not carry an explicit `methodologyVersion` field and should be referred to as legacy/pre-2.0 methodology outputs until version stamping is implemented.
**Signal layer status:** The current signal layer is still a stateless rule-based keyword classifier with exact/canonical text deduplication. It does not perform semantic event clustering and does not persist raw candidate snapshots, a cross-run event registry, or immutable candidate-to-cluster assignment history. Methodology 2.0 signal processing will be stateful across runs, unlike the present fetch -> compute -> write pipeline. `Geopolitical Escalation` is currently too broad to serve as a final actionable leaf category; observed concentration may reflect real conditions, source mix, repeated coverage of the same underlying event, or all three.
**Market layer status:** The current market layer uses FRED plus Tiingo EOD `adjClose`, a uniform 5-common-observation transform, a trailing 252-common-date transformed window, global all-instrument common-date alignment, and per-channel `max |z|` driver selection. The global date alignment allows lagging Brent/WTI observations to hold back unrelated channels. Current state names use absolute market movement and therefore do not prove direction, causality, or that an OSINT event was literally "priced."
**Repo status:** Crucix cloned locally at `D:\WinProjects\CRUCIX`  
**Crucix running locally:** Yes, when started with `npm run dev`  
**`/api/data` working:** Yes  
**Market shock script created:** Yes  
**Market shock JSON generated:** Yes  
**Dashboard created:** Yes. Dashboard v2 is published. `dashboard/public/market-shock.html` has been reworked so the divergence board is the hero element, reads `divergence.json`, keeps Shock Mix prominent, demotes the Market Shock Score, and now shows dated lagging/stale market-reading warnings when `divergence.json` carries them.
**Public GitHub Pages deployment:** Yes. GitHub Pages serves from `docs/`. Session 9 published Dashboard v2 to `docs/index.html` and copied refreshed static JSON files to `docs/`: `market-shock.json`, `market-readings.json`, and `divergence.json`. Session 10 added `docs/history.html` and `docs/log/` copies for the daily log. Session 11 synced warning-display updates into `docs/index.html`, `docs/history.html`, and `docs/divergence.json`. Session 12 verified that public GitHub Pages is serving the latest committed `docs/` files from `origin/master`, that public dashboard/history fetches are relative, and that no local-only `localhost` fetch is used in public files. Session 13 fixed same-close-date docs sync so `docs/*.json` is always refreshed from `dashboard/public/*.json`, even when the close-date snapshot is kept. GitHub Pages continues to use the existing project URL for now. Domain/subdomain setup is deferred.
**Market data fetcher:** Created and verified in Session 7; hardened in Session 11. `scripts/market-data.mjs` fetches FRED + Tiingo EOD data, aligns all instruments to one global common date, computes 5-common-observation price returns or level changes against a trailing 252-common-date transformed window, writes `dashboard/public/market-readings.json`, includes freshness metadata and lagging/stale warnings, fails loudly on missing keys/source failures/non-JSON responses, and writes JSON atomically.
**Divergence engine:** Created and verified in Session 8; hardened in Session 11. `scripts/divergence.mjs` reads `market-shock.json` and `market-readings.json`, maps Phase-1 categories to Phase-2 channels, aggregates both primary categories and `otherCategories`, normalizes signal scores against the Phase-1 20-point item ceiling, applies the frozen thresholds, classifies rows into `radar-claim`, `priced`, `radar-miss`, or `calm` using absolute market z-score movement, preserves market freshness warnings, and writes `dashboard/public/divergence.json` atomically.
**Daily log / history:** Implemented in Session 10, CI-proven in Session 11, and clarified in Session 13. Close-date snapshots are intentionally keyed by market close date / `asOfClose`, not by run date, so sparse `log/YYYY-MM-DD.json` snapshots are expected and must not be fabricated. Real close-date snapshots now include `log/2026-06-15.json`, `log/2026-06-18.json`, `log/2026-06-22.json`, `log/2026-06-26.json`, and `log/2026-06-29.json`; Pages copies include matching files under `docs/log/`; static close-date manifests are `log/index.json` and `docs/log/index.json`. Session 13 added run-level logging under `log/runs/` plus public copies under `docs/log/runs/`, so every daily run can be visible even when the market close date has not advanced. The first run record is `log/runs/2026-07-08T01-05-28-175Z.json`; `log/runs/index.json` and `docs/log/runs/index.json` both have count `1` and match. History page exists at `dashboard/public/history.html` and `docs/history.html`, with Session 11 support for snapshot warnings. The latest lag warning remains expected source lag: FRED Brent `DCOILBRENTEU` and WTI `DCOILWTICO` currently hold the global common-date alignment at `2026-06-29`. CI automation remains proven. Local fallback protocol exists at `docs/daily-run-protocol.md`.
**README created:** Yes. README v2 completed in Session 11 with divergence board rules, four states, frozen thresholds, uniform market transform, data sources, dated log/history, Crucix attribution, and disclaimer.
**Board screenshot:** Deferred intentionally by the user in Session 11; do not mark complete until captured in a later session.
**LinkedIn materials:** Superseded; see Section 12

### Current file structure target (Phase 2)

```txt
Crucix/
├── scripts/
│   ├── market-shock-radar.mjs
│   ├── market-data.mjs            (Session 7 — FRED + Tiingo fetch + z-scores)
│   ├── divergence.mjs             (Session 8 — done: join signals × market, classify states)
│   ├── daily-snapshot.mjs         (Session 10 — validate/copy dated snapshots and sync docs/; Session 13 — run log and same-date docs sync fix)
│   └── daily-run.mjs              (Session 10 — local pipeline runner)
├── dashboard/
│   └── public/
│       ├── market-shock.html      (rework in Session 9: divergence board as hero)
│       ├── market-shock.json
│       ├── market-readings.json   (Session 7 output; Session 11 freshness metadata)
│       ├── divergence.json        (Session 8 output; Session 11 warning propagation)
│       └── history.html           (Session 10; Session 11 warning support)
├── log/
│   ├── 2026-06-15.json            (Session 10 — first real committed snapshot)
│   ├── 2026-06-18.json            (Session 11 — real CI-created snapshot)
│   ├── 2026-06-22.json
│   ├── 2026-06-26.json
│   ├── 2026-06-29.json            (latest close-date snapshot as of Session 13)
│   ├── index.json                 (Session 10+ — close-date manifest)
│   └── runs/
│       ├── 2026-07-08T01-05-28-175Z.json
│       └── index.json             (Session 13 — run manifest)
├── docs/
│   ├── index.html                 (Pages copy)
│   ├── divergence.json            (Pages copy)
│   ├── history.html               (Session 10 — Pages copy)
│   └── log/
│       ├── 2026-06-15.json
│       ├── 2026-06-18.json
│       ├── 2026-06-22.json
│       ├── 2026-06-26.json
│       ├── 2026-06-29.json
│       ├── index.json
│       └── runs/
│           ├── 2026-07-08T01-05-28-175Z.json
│           └── index.json
├── README-market-shock-radar.md
├── package.json
└── CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md
```

### Last recorded local git status

Recorded after Session 4; Sessions 5–6 changed files since (`.gitignore`, `package.json`, README, JSON refreshes, media). Treat as stale.

```txt
?? dashboard/public/market-shock.html
?? session1-api-data.json
```

**Note:** `dashboard/public/market-shock.html` is the Session 4 deliverable. `session1-api-data.json` is a local inspection snapshot from Session 1 and is in `.gitignore` since Session 5.

**Fresh Session 7 git checks:** Started clean: `git status --short` returned empty. End state before project-log update: `M package.json`, `?? scripts/market-data.mjs`, `?? dashboard/public/market-readings.json`.
**Fresh Session 8 git checks:** Started clean: `git status --short` returned empty. End state before project-log update: `M package.json`, `?? scripts/divergence.mjs`, `?? dashboard/public/divergence.json`.
**Fresh Session 11 git checks:** CI proof and hardening completed. Validation passed; `.env` is local and not tracked; secret scan found no literal API secrets. End state before project-log update included modified script/dashboard/docs/README files from the Session 11 reliability pass, with no commit or push.
**Fresh Session 12 git checks:** After `git pull --ff-only`, local `master` fast-forwarded from `f5fbde2` to `9fc3bad` and now matches `origin/master`. `git status --short` produced no changed files, with only a warning that Git could not read `C:\Users\heyke/.config/git/ignore`. Latest five commits: `9fc3bad Update CRUCIX daily snapshot`; `002e2ec Update CRUCIX daily snapshot`; `9305a0e Update CRUCIX daily snapshot`; `f5fbde2 Make daily snapshot idempotent on stale market dates`; `3582d9e Harden daily snapshot workflow`.
**Fresh Session 13 git checks:** Investigation confirmed the Action ran daily, close-date snapshots were sparse by design, and same-close-date runs could succeed while only committing `dashboard/public/*.json`. Implementation changed `scripts/daily-snapshot.mjs`, `.github/workflows/daily-snapshot.yml`, and `.gitignore`, then `npm run snapshot` generated/updated `docs/*.json`, `log/runs/*.json`, and `docs/log/runs/*.json`. Validation passed; no commit or push yet.
**Fresh Session 14 architecture-amendment preflight:** On 2026-07-10 before this log-only architecture amendment, `git pull --ff-only` reported `Already up to date`, `git rev-parse --short HEAD` returned `e4ba8fd`, and `git status --short` returned no changed files, with only the recurring warning that Git could not read `C:\Users\heyke/.config/git/ignore`. Repository inspection found no implemented raw-candidate archive, semantic cluster assignments, persistent event registry, `methodology/` directory, explicit v2 output paths, `methodologyVersion` field, or empirical channel-percentile thresholds.

---

## 4. Build Plan

### Phase 1 — MVP (complete)

| Session | Target time | Main goal | Status |
|---:|---:|---|---|
| 1 | 30 min | Clone Crucix, install dependencies, run first sweep, inspect `/api/data` | Done |
| 2 | 45 min | Create the market-shock scoring script | Done |
| 3 | 45 min | Generate and validate `market-shock.json` | Done |
| 4 | 75 min | Build the visual dashboard page | Done |
| 5 | 30 min | Add npm script, README, disclaimer, and transmission matrix | Done |
| 6 | 45 min | Test, troubleshoot, screenshot, and record demo | Done |
| 7 (old) | 30 min | ~~Final polish and LinkedIn launch package~~ | **Superseded 2026-06-11** |

### Phase 2 — Divergence upgrade / legacy baseline (complete)

Rationale: Phase 1 produces an estimate and puts it next to nothing. There is no gap to read and nothing for reality to grade. Phase 2 puts the market on the page, classifies the disagreement, demotes the score, and turns the snapshot into a dated log. As of 2026-07-10, this is the operational legacy/pre-2.0 baseline while Methodology 2.0 is audited.

| Session | Target time | Main goal | Status |
|---:|---:|---|---|
| 7 | 60 min | Market data fetcher: FRED + Tiingo, uniform z-score transform, `market-readings.json` | Done |
| 8 | 60 min | Divergence engine: join signal channels × market readings, classify the four states with frozen thresholds, `divergence.json` | Done |
| 9 | 75 min | Dashboard v2: divergence board as hero, Shock Mix prominent, score demoted, dated "as of close" framing, descriptive-labels pass | Done |
| 10 | 60 min | Daily log: dated snapshots under `log/`, history page, automation attempt, local fallback protocol | Done, with CI/domain follow-ups |
| 11 | 30 min | CI proof, hardening, README v2, publishability checks. Screenshot intentionally deferred by user. (The LinkedIn post itself is drafted outside these sessions — Section 12) | Done, screenshot deferred |
| 12 | 45 min | Log accumulation and public verification: verify Pages/docs sync, public log freshness, lag diagnosis, no domain work | Done |
| 13 | 60 min | Daily-run visibility: diagnose sparse close-date snapshots, add run manifest, fix same-close-date docs sync | Done |

### Phase 3 — Methodology 2.0 audit and rebuild

| Session | Target time | Main goal | Status |
|---:|---:|---|---|
| 14 | 90 min | Architecture and audit protocol: inventory available data; define registry, reproducibility, core schema, parameter artifacts, sampling, timing, and comparison contracts; no production change | Planned |
| 15 | 120 min | Signal audit: persist/extract a representative raw sample where available; normalize reporting origins; manually cluster and label events; measure concentration and duplication | Provisional — depends on Session 14 |
| 16 | 90 min | Market audit: own-series/calendar comparison, empirical channel trigger rates, driver breadth, timing, and percentile-rule evaluation | Provisional — depends on Session 14 |
| 17 | 90 min | Freeze the Methodology 2.0 core specification, lifecycle rules, schemas, mappings, parameters, migration contract, and acceptance tests | Provisional — depends on Sessions 15–16 |
| 18 | 120 min | Implement signal v2 persistence, clustering assignments, minimal taxonomy, evidence gates, and parallel output without touching legacy output | Provisional — depends on Session 17 |
| 19 | 120 min | Implement market/divergence v2 dating, eligibility, breadth, threshold semantics, timing rules, and parallel output | Provisional — depends on Session 17 |
| 20 | 90 min | Parallel-run review, dashboard/history migration decision, explicit methodology stamping, and production cutover or rejection | Provisional — depends on Sessions 18–19 |

Target times are planning estimates. A session may produce a follow-up work order rather than compressing unfinished architecture into an unsafe implementation. Sessions 15-20 are provisional and must be revised from Session 14 evidence rather than treated as frozen implementation instructions. The earlier four-session Phase 3 sketch is superseded: one 90-minute Session 15 cannot safely implement semantic clustering, the complete taxonomy, all evidence fields, and regression fixtures, and Session 17 is not an immediate cutover after only two implementation sessions.

---

## 4b. Legacy Phase 2 / pre-2.0 Baseline — Divergence Upgrade

This spec is frozen as of 2026-06-11 for all existing historical snapshots. It remains the legacy/pre-2.0 baseline and must not be silently changed in place. A validated Methodology 2.0 must be introduced as a visible versioned change, and old snapshots must not be recomputed. If implementation forces a change, log it under Decisions Made with a reason.

**2026-07-10 audit note:** The current generated artifacts do not carry an explicit `methodologyVersion` field. Treat existing snapshots and run records as legacy/pre-2.0 outputs until Methodology 2.0 version stamping is implemented.

### 0. Methodology versioning and rollout guardrails

Methodology versioning is separate from data snapshot IDs. The close-date snapshot (`log/YYYY-MM-DD.json`) says what data was observed; the methodology version says how the board was computed and rendered. These are orthogonal axes.

Increment the methodology version for any of the following:

- Any source change for a channel
- Any change to window length or z-score definition
- Recalibration of `expectedLagBD` or freshness/staleness thresholds
- Calendar changes, including alignment calendar or trading-day assumptions
- Promotion of a proxy from supplemental read to primary channel input

Same methodology version plus the same input snapshots should reproduce a bit-identical board. Treat that as a free regression test. Stamp the methodology version on every published dashboard and keep a one-line methodology changelog.

Proxy-role rule: pick one role and keep it visible. Either the EIA/FRED spot series remains the primary channel input while BNO/USO appear only as a supplemental "timely read (futures proxy)", or the proxy becomes the timely primary channel and spot becomes lagged confirmation. Both are defensible. The bad outcome is ambiguity where readers cannot tell which number drives the channel. Promoting a proxy to primary is a methodology version bump plus a channel relabel, not a quiet swap.

Rollout sequence: snapshots and per-channel dating are additive and can ship immediately. Freshness badges that depend on `expectedLagBD` need a few weeks of fetch history per source before delayed/stale thresholds are meaningful; until then, run them in shadow or use conservative thresholds. Proxies come after that, as newly labeled channels.

### 1. The market column — one uniform transform

The market reading must use **one uniform rule across all channels**, never a per-channel tuned formula. A per-channel formula would rebuild the discretionary-aggregate problem on the other side of the page.

- **Price instruments** (oil, gold, equities, FX, EM): z-score of the 5-day return against the trailing 1-year distribution of 5-day returns.
- **Level instruments** (VIX, HY spreads, breakevens, yields): z-score of the 5-day **change in level**, same trailing 1-year window.
- A channel's market reading is the **max |z| among its instruments, with the driving instrument named**. Never an average, never a composite.
- Cell rendering example: `Credit stress — market: 2.1σ (HY OAS)`.

### 2. Per-channel instrument map

Data sources: FRED (free API key, official, stable) and Stooq free CSV endpoint for ETF proxies. Do **not** build on unofficial Yahoo endpoints as the primary source.
**Session 7 implementation note:** Stooq was tested from Node and `curl` and returned browser-verification HTML, then `Access denied`, so it is not usable for automated local/CI fetches. The ETF proxy source is changed to Tiingo EOD using `adjClose`. This preserves the instrument proxies, avoids unofficial Yahoo endpoints as primary, and supports CI via a normal API key. A tested FRED gold replacement (`GOLDAMGBD228NLBM`) returned `series does not exist`, so gold remains `GLD` via Tiingo.

| Channel | Instruments | Series / proxy | Type |
|---|---|---|---|
| Conflict escalation | Brent, gold, VIX, defense equities | FRED `DCOILBRENTEU`; `GLD` (Stooq); FRED `VIXCLS`; `ITA` (Stooq) | price, price, level, price |
| Sanctions / policy | Broad USD, EM equities, broad commodities | FRED `DTWEXBGS`; `EEM` (Stooq); `DBC` or `CPER` (Stooq) | price |
| Energy disruption | Brent, WTI, inflation expectations | FRED `DCOILBRENTEU`, `DCOILWTICO`, `T10YIE` | price, price, level |
| Credit stress | HY spreads, banks, 10y Treasury | FRED `BAMLH0A0HYM2`; `KBE` (Stooq); FRED `DGS10` | level, price, level |
| Supply chain | Semiconductors, industrials | `SOXX` or `SMH`, `XLI` (Stooq) | price |

Notes:
- **"Margins" is dropped** from the supply-chain channel. Margins are quarterly accounting outputs, not daily observables; proxying them silently would misrepresent. Semis plus industrials carry the row.
- Brent appears in two channels. That is intentional and informative — show it, do not deduplicate. When one instrument drives two channels, that fact is itself readable.

### 3. Mapping the 8 Phase-1 shock categories to market channels

| Phase-1 category | Market channel |
|---|---|
| Geopolitical Escalation | Conflict escalation |
| Sanctions / Policy Shock | Sanctions / policy |
| Energy Shock | Energy disruption |
| Credit Stress | Credit stress |
| Supply Chain Disruption | Supply chain |
| Macro / Inflation Shock | Optional: same rule with `T10YIE`, `DGS10`. Decide in Session 8; signal-only display is acceptable for v2. |
| Weather / Climate Shock | Optional: NatGas FRED `DHHNGSP`. Decide in Session 8; signal-only display is acceptable. |
| Market Volatility Signal | **Retire as a signal channel.** VIX lives on the market side of the board; keeping it as an OSINT channel is circular (the market would be diverging from itself). |

### 4. The divergence cell — four states, frozen thresholds

Thresholds (frozen at launch): signal elevated = channel signal at or above **60% of channel max**; market moving = **|z| ≥ 1.5**. Never retune thresholds after launch to make the board more interesting. A dated log with frozen rules is the credibility.

| Signal | Market | State | Meaning |
|---|---|---|---|
| Elevated | Quiet | `radar-claim` | The only state where the radar says something the market is not pricing. The interesting row. |
| Elevated | Moving | `priced` | The radar confirms, adds nothing. |
| Quiet | Moving | `radar-miss` | Either the radar missed it or the move has another driver. Show it — this is the radar's humility made visible. |
| Quiet | Quiet | `calm` | Empty row. Showing empty rows is part of the honesty. |

### 5. Daily snapshot schema

One committed JSON per day under `log/YYYY-MM-DD.json`:

```json
{
  "date": "2026-06-11",
  "rows": [
    {
      "channel": "credit-stress",
      "signal_score": 0.0,
      "market_z": 0.0,
      "driver_instrument": "BAMLH0A0HYM2",
      "state": "calm"
    }
  ]
}
```

The history page renders these rows backwards. After 30–40 days, the log's real payoff becomes computable: how often `radar-claim` was followed by a market move within N days, and how often it was not. That statistic is not needed at launch; the accumulating rows are.

### 6. UI rules (Session 9)

- The divergence board is the hero element. The Shock Mix decomposition is prominent. The **Market Shock Score is kept but visually demoted** — small. The page layout should itself express the position: aggregate small, channels large.
- Every view carries `readings as of market close, {date}`. No "live" language anywhere.
- **Labels stay flatly descriptive.** The intelligence feed will name specific conflicts and sanction regimes; that is fine — facts are facts — but the board's own labels and copy must carry no editorial severity language ("alarming", "terrifying"), no implied side, no position on any named conflict. Categories editorial-neutral, explanations mechanical (signal → channel → instruments).
- Keep the existing disclaimer: experimental prototype, not investment advice, not a trading bot.

### 7. Automation and deployment (Session 10)

- Preferred: daily GitHub Action — fetch market data, run the Crucix sweep in CI if feasible, run the radar and divergence scripts, commit the day's snapshot, and publish the generated `docs/` files.
- Current implementation attempts the full CI run through `.github/workflows/daily-snapshot.yml`, using `FRED_API_KEY` and `TIINGO_API_KEY` from GitHub secrets.
- CI feasibility was proven in Session 11 after exact repository secrets were configured and the manual "Daily snapshot" Action created the real `2026-06-18` snapshot.
- Fallback if Crucix cannot run in CI: use the documented local one-command daily protocol in `docs/daily-run-protocol.md`. A log with a manual step is still a log; an undated dashboard is not.
- Domain setup is deferred to a future session. Do not create `docs/CNAME`, change GitHub Pages custom-domain settings, or update the apex `divergencelog.com` index until that dedicated session.

---

## 4c. Methodology 2.0 Audit Principles

These are **audit targets**, not completed implementation. Session 14 must turn them into an implementable architecture and audit protocol before Sessions 15-20 are treated as implementation plans. The current repository does not yet contain a raw-candidate archive, semantic cluster assignments, persistent event registry, Methodology 2.0 schema artifacts, explicit v2 output paths, methodology stamping, or empirical channel-percentile thresholds.

### Signal architecture

- The scored unit becomes an **underlying event cluster**, not a headline or feed item.
- Repeated reports increase corroboration/confidence; they do not multiply severity or count as independent shocks.
- `Geopolitical` becomes a parent facet, not the final scored event type.
- Separate three layers explicitly: **event -> transmission mechanism -> market observation**.
- Require explicit transmission-mechanism mapping before an event elevates a market channel.
- Mechanism directness is part of the Methodology 2.0 core because a market channel must not elevate without explicit evidence for that transmission path.

#### Methodology 2.0 minimum operational core

The proposed minimum operational core must be resolved before a production cutover:

- stable `eventClusterId`;
- a broader `parentSeriesId` or equivalent parent-crisis/campaign identifier;
- a deliberately small initial `eventType` leaf set that maps cleanly to the current market channels;
- `actionStage`;
- explicit transmission `mechanisms`;
- basic mechanism `directness` (`direct`, `contextual`, `none`);
- source-origin identifiers rather than only outlet/domain names;
- `independentSourceCount` and corroboration status;
- `firstSeen`;
- `lastObservedAt`;
- `lastMaterialChangeAt`;
- lifecycle/novelty status, including `new`, `escalating`, `continuing`, and `de-escalating`;
- assignment/provenance version;
- explicit `methodologyVersion` on v2 artifacts.

#### Methodology 2.1 candidates

The following are candidates for a later expansion unless the Session 14-17 evidence proves they are essential to the 2.0 core:

- the complete 16-leaf taxonomy;
- full geographic scope resolution;
- complete extraction of affected assets, locations, actors, and infrastructure;
- richer source-quality scoring;
- detailed expected-direction models;
- additional market channels for all signal leaves.

The candidate long-term leaf ontology remains useful reference material, but every leaf is not mandatory Methodology 2.0 scope:

- kinetic action;
- force posture or mobilization;
- strategic/nuclear signaling;
- sanctions or asset restrictions;
- tariffs/trade restrictions;
- export/technology controls;
- maritime/chokepoint disruption;
- energy infrastructure or production disruption;
- industrial/logistics outage;
- sovereign/political instability;
- banking/funding/credit stress;
- central-bank surprise;
- fiscal-policy surprise;
- major macro-data surprise;
- cyber/critical-infrastructure disruption;
- extreme weather/natural disaster/health emergency.

#### Explicit assessment status

Fields not yet populated must not simply disappear. The schema design target must distinguish:

- `unassessed`: the pipeline did not attempt the assessment;
- `unknown`: it attempted the assessment but evidence was insufficient;
- `not-applicable`: the field does not apply;
- `assessed`: a typed value is present.

Do not insert strings such as `"unassessed"` into fields that will later be numeric, arrays, or objects. Use a typed wrapper pattern such as:

```json
{
  "scope": {
    "status": "unassessed",
    "value": null
  }
}
```

This pattern is a design target, not an implemented schema.

#### Persistent event registry and immutable assignment history

Stable cluster identity, `firstSeen`, novelty, decay, escalation, and de-escalation require state across runs. Session 14 must decide and document:

- registry location and format;
- atomic read/update/write behavior;
- raw-candidate snapshot location;
- immutable candidate-to-cluster assignment history;
- public versus private artifacts;
- retention policy;
- recovery from a corrupt or interrupted registry update;
- human-correction provenance;
- merge, split, alias, and supersession behavior.

Provisional path examples, not completed or irrevocably frozen paths:

```txt
inputs/candidates/<run-id>.jsonl
state/events/registry.json
log/event-assignments/<run-id>.jsonl
methodology/2.0.0/schema.json
methodology/2.0.0/parameters.json
methodology/2.0.0/leaf-channel-map.json
methodology/2.0.0/source-origin-rules.json
```

Lifecycle rules that Session 14 must accept, amend, or reject explicitly:

- cluster IDs are never reused;
- historical run assignments are immutable;
- a merge creates aliases or a canonical successor and does not rewrite old run records;
- a split creates new IDs with explicit lineage such as `derivedFrom` or `supersedes`;
- human corrections append provenance and do not silently erase history;
- `lastObservedAt` updates when another report appears;
- `lastMaterialChangeAt` updates only when stage, consequence, severity, escalation, or de-escalation materially changes;
- decay must key off material change, not merely repeated coverage;
- a parent-series/event-episode hierarchy is needed to avoid both one immortal "war" cluster and excessive fragmentation into unrelated one-line events.

#### Reproducibility of semantic clustering

- Deterministic keyword/rule clustering with frozen parameters is reproducible but may be semantically limited.
- Embeddings or an LLM may assist clustering, but live model output cannot be an unrecorded production dependency.
- When a model proposes cluster membership, that assignment must become a persisted, versioned input before deterministic scoring and board generation.
- Production reproduction must consume recorded assignments rather than call a drifting external model again.
- The reproducibility target applies to the canonical normalized board payload, with stable ordering and rounding, not necessarily to volatile metadata such as `generatedAt`.

Persist, where relevant:

- clustering method;
- model/embedding identifier and version;
- prompt or ruleset version/hash;
- configuration and similarity threshold;
- time/location/actor matching windows;
- deterministic tie-break rule;
- input content hashes;
- assignment version;
- human override and reviewer provenance.

Intended reproducibility equation:

```txt
normalized raw candidates
+ persisted source-origin assignments
+ persisted event-cluster assignments
+ frozen methodology configuration
= reproducible canonical Methodology 2.0 board payload
```

Keep the existing project discipline that a language model may narrate or propose structure but must not silently produce unreproducible final readings or states.

#### Frozen signal parameters and source independence

All consequential parameters must live in versioned methodology artifacts rather than unexplained constants in code. The freeze list must include at least:

- event similarity threshold;
- actor/location/time matching windows;
- deterministic tie-break rules;
- source-origin and syndication grouping rules;
- operational definition of an independent source;
- source-quality categories or weights, if used;
- action-stage mapping and weights, if used;
- corroboration-to-confidence mapping;
- decay function and clock;
- lifecycle transition rules;
- event-to-mechanism-to-channel mapping;
- directness gate;
- channel-elevation rule;
- maximum contribution per cluster/channel, if any;
- stale-event and de-escalation rules;
- signal-versus-market timing cutoff;
- market percentile `alpha`, history window, and minimum sample if adopted.

Define "independent source" by reporting origin, not simple domain count:

- thirty syndicated copies of one wire report count as one reporting origin;
- outlets repeating the same official statement do not automatically become independent confirmations;
- an official statement and a genuinely independent direct observation may count as separate origins;
- unknown provenance is treated conservatively;
- disagreement between origins must not mechanically increase confidence.

Require a versioned leaf/event-to-mechanism-to-channel mapping before the rule "explicit transmission mechanism required for elevation" can be enforced. The mapping must allow:

- one event to map to zero market channels and remain signal-only;
- one event to map to multiple channels only when each mechanism has separate evidence;
- chokepoint or energy events to affect more than one channel without automatically multiplying severity.

Keep severity and confidence separate:

- action, implementation, and observed consequence determine severity;
- independent evidence determines confidence;
- repeated publication does not determine severity.

#### Methodology 2.0 signal-elevation plan

The legacy signal threshold of **60% of the Phase 1 keyword-score ceiling** remains frozen only for legacy/pre-2.0 output. It must not be inherited automatically by a cluster-based signal system because the score distribution and semantics change.

Sessions 15 and 17 must evaluate whether Methodology 2.0 should use a scalar score at all. Candidate structural gate, not a frozen final rule:

```txt
explicit transmission mechanism
AND sufficient evidence/corroboration
AND qualifying action stage or observed consequence
AND new event, material escalation, or material de-escalation
```

Aggregation principles:

- score one underlying event cluster once;
- do not sum repeated articles;
- expose a leading qualifying event;
- expose the number of qualifying independent clusters and signal breadth;
- do not use category quotas to force visual balance;
- avoid replacing one opaque headline aggregate with an opaque event-score aggregate.

Proposed event fields from the earlier plan remain candidates and must be split between 2.0 core and 2.1 expansion:

- `eventClusterId`
- `eventType`
- `parentDomain`
- `actionStage` (`rhetoric`, `threatened`, `announced`, `implemented`, `impact-observed`)
- `directness` (`direct`, `contextual`, `none`)
- `corroboration`
- `independentSourceCount`
- `sourceQuality`
- `novelty` (`new`, `escalating`, `continuing`, `de-escalating`)
- `scope`
- `firstSeen`
- `lastSeen`
- affected assets, locations, infrastructure, and mechanisms when known.
- A single unverified source cannot independently elevate a channel unless a documented exception is approved.
- Continuing events decay unless a new escalation or observed consequence occurs.
- De-escalation must be represented explicitly.

### Market-data architecture

Keep these parts unless the audit finds a concrete defect:

- FRED plus Tiingo as the current primary sources;
- Tiingo `adjClose` for ETF price instruments;
- one uniform distinction between price returns and level changes;
- named driver instrument;
- loud source/key failures;
- atomic JSON writes;
- freshness metadata and warnings;
- immutable historical snapshots.

Audit and likely amend these parts for Methodology 2.0:

1. **Own-series calculation:** compute each instrument's transform on its own valid observation series/calendar instead of first intersecting every instrument onto one global date set.
2. **Five-observation meaning:** verify and document the exact span of each "5-day" calculation. The target is five valid observations for that instrument, with the actual start/end dates retained.
3. **Trailing window:** use the latest 252 valid transformed observations per instrument, subject to the Session 14 audit and an explicit frozen definition.
4. **Dating:** persist `asOf`, observation age, business-day age, and freshness per instrument; derive a visible per-channel `marketAsOf` and freshness state. One lagging crude series must not silently date unrelated channels.
5. **Channel evidence:** retain the driver, but also expose the second-largest absolute z-score, number of eligible instruments, number above threshold, and a market-breadth indicator.
6. **Multiple-instrument threshold audit:** quantify the empirical trigger frequency of `max |z| >= 1.5` for each channel. Do not assume the same false-alert rate when channels have different instrument counts. Independence sanity checks:
   - `P(max |Z| >= 1.5) ≈ 24.94%` for 2 independent instruments
   - `P(max |Z| >= 1.5) ≈ 34.97%` for 3 independent instruments
   - `P(max |Z| >= 1.5) ≈ 43.66%` for 4 independent instruments
   Actual channel values are correlated and therefore must be measured empirically, but the calculation demonstrates structural asymmetry: a four-instrument channel has more chances to cross a raw threshold than a two-instrument channel.
7. **State semantics:** the current absolute-z test detects unusual movement, not causal pricing. For Methodology 2.0, provisionally replace:
   - `radar-claim` -> `signal-leading`
   - `priced` -> `co-movement`
   - `radar-miss` -> `market-only`
   - `calm` -> `calm`
   Preserve legacy state names in historical snapshots and provide a documented mapping rather than rewriting history.
8. **Direction diagnostic:** consider `expectedDirection`, `observedDirection`, and `directionalConsistency` as a separate diagnostic keyed to the explicit transmission mechanism. Do not claim causality and do not gate the main state on direction until validated.
9. **Threshold discipline:** keep current thresholds unchanged for legacy output. Freeze any Methodology 2.0 threshold only after the audit; do not optimize thresholds to make the board more interesting.
10. **Proxy discipline:** do not add BNO/USO or promote any proxy during Session 14. A future supplemental proxy must be clearly labeled; promotion to a primary input requires a visible methodology-version change.
11. **Reproducibility:** audit whether raw market inputs or input hashes must be persisted so the same methodology plus the same inputs can reproduce a bit-identical board.

#### Market-threshold audit candidate

Keep the current raw z-score and named driver as diagnostics. The leading candidate uniform rule for audit, not a frozen decision:

```txt
M(c,t) = max absolute z-score among eligible instruments in channel c at time t

market moving when M(c,t) exceeds the point-in-time
(1 - alpha) empirical quantile of channel c's prior M distribution
```

This can remain a uniform methodology because:

- one `alpha` is used across channels;
- numeric cutoffs vary mechanically with instrument count and correlation;
- cutoffs are estimated point-in-time, without look-ahead;
- raw z-score, driver, and breadth remain visible.

Session 16 must compare at least three options:

1. retain legacy `max |z| >= 1.5` only for the legacy baseline;
2. Methodology 2.0 channel-specific empirical percentile with one common `alpha`;
3. retain a raw threshold but publish measured channel base rates and breadth without changing the binary rule.

For any percentile proposal, freeze decisions on:

- rolling versus expanding history;
- minimum sample size;
- no-look-ahead calculation;
- instrument-set versioning;
- stale/ineligible instrument handling;
- changes in eligible instrument count;
- correlation and regime sensitivity;
- fallback behavior before sufficient history exists.

Do not freeze a final market threshold before the audit evidence exists.

#### Market dating, eligibility, and threshold calibration

The market-threshold decision cannot be separated from the date/eligibility decision.

Methodology 2.0 must retain per instrument:

- own-series transform;
- actual five-observation `windowStart` and `windowEnd`;
- `asOf` date/time;
- observation age and business-day age;
- freshness/eligibility status;
- z-score;
- history count.

A documented channel rule must define:

- `marketAsOf`;
- maximum permitted lag between instruments;
- stale-instrument exclusion;
- minimum eligible-instrument count;
- how breadth is calculated when eligibility changes;
- whether the channel statistic may combine instruments ending on different dates.

Methodology 2.0 should avoid both extremes:

- one global all-instrument intersection that lets crude date unrelated channels;
- an unexplained mixture of arbitrarily different dates inside one channel statistic.

The audit must compare own-series calculations with a clearly defined per-channel dating/eligibility rule.

#### Signal-versus-market timing

- A signal first observed after the relevant market close has not yet had an opportunity to be reflected in that close.
- It must be marked pending the next eligible market observation rather than immediately classified as co-movement or market-only against the prior close.
- Event `firstSeen` and `lastMaterialChangeAt` should be compared with market-close timestamps, not dates alone.
- The audit must inspect cases where the market move preceded the signal.
- Do not claim causal attribution even when timing aligns.

#### Parallel-run comparison

Legacy and Methodology 2.0 are deliberately different systems. Parallel validation must not demand row-level agreement.

The comparison must report:

- raw-headline-to-event-cluster compression ratio;
- source-origin concentration;
- parent-domain and leaf-event distribution;
- direct versus contextual mechanism share;
- single-origin versus corroborated event share;
- new/escalating/continuing/de-escalating distribution;
- channel-elevation frequency;
- market-moving frequency by channel;
- full state-distribution matrix;
- legacy/v2 disagreement cases;
- cases where legacy elevation came from duplicate or contextual reports;
- single-instrument versus broad market moves;
- market-before-signal and after-close/pending cases;
- stability of cluster identity and lifecycle across runs.

Disagreement is expected during recalibration. Success is determined by auditability, reproducibility, stable lifecycle behavior, sensible base rates, and documented error cases, not by matching legacy rows. The comparison-period criterion must be frozen in Session 17 and defined in distinct eligible market closes, not merely calendar days.

### Versioning and migration

- Existing snapshots remain immutable under the legacy/pre-2.0 methodology.
- Methodology 2.0 artifacts must carry an explicit `methodologyVersion`.
- Parallel validation output must use a separate path or namespace so it cannot overwrite legacy daily snapshots.
- The production cutover happens only after a documented comparison period and regression tests.

---

# Session 1 — Crucix Setup and First Data Check

## Goal

Clone Crucix, run it locally, and confirm that the base data endpoint works.

## Estimated duration

30 minutes

## Tasks

- [x] Check Node.js version
- [x] Clone Crucix
- [x] Install dependencies
- [x] Copy `.env.example` to `.env`
- [x] Run Crucix locally
- [x] Open the local dashboard
- [x] Open `/api/health`
- [x] Open `/api/data`
- [x] Save notes about what data appears in `/api/data`

## Commands

```bash
node --version
git clone https://github.com/calesthio/Crucix.git
cd Crucix
npm install
cp .env.example .env
npm run dev
```

Open:

```txt
http://localhost:3117
http://localhost:3117/api/health
http://localhost:3117/api/data
```

## Definition of done

Session 1 is complete when:

- Crucix runs locally
- `http://localhost:3117` opens
- `/api/health` returns a response
- `/api/data` returns JSON, or we have clearly logged why it does not yet work

## Session 1 Log

**Status:** Complete  
**Date completed:** 2026-05-22  
**What worked:** Node.js v24.16.0 was installed and recognized by Windows. Crucix was cloned into `D:\WinProjects\CRUCIX`. Dependencies were installed successfully with `npm install`. `.env` was created from `.env.example`. Crucix started locally with `npm run dev`. The server ran at `http://localhost:3117`. The initial sweep completed in about 30 seconds with 27/29 sources returning data. `/api/health` returned status `ok`. `/api/data` returned JSON and was saved locally as `session1-api-data.json`.  
**What failed:** The first attempt to parse `session1-api-data.json` failed because two JSON responses were concatenated in the file. This was fixed by re-saving with `curl -s http://localhost:3117/api/data -o session1-api-data.json`.  
**Notes about `/api/data`:** Top-level fields include `meta`, `air`, `thermal`, `tSignals`, `chokepoints`, `nuke`, `nukeSignals`, `airMeta`, `sdr`, `tg`, `who`, `fred`, `energy`, `metals`, `bls`, `treasury`, `gscpi`, `defense`, `noaa`, `epa`, `acled`, `gdelt`, `space`, `health`, `news`, `markets`, `ideas`, `ideasSource`, `newsFeed`, and `delta`. Useful candidate inputs for Session 2 are likely `news`, `newsFeed`, `chokepoints`, `nuke`, `nukeSignals`, `defense`, `air`, `energy`, `markets`, `treasury`, `metals`, and `gdelt`.  
**Files changed:** `.env` created. `package-lock.json` may have been created or updated by `npm install`. `node_modules/` created locally. `session1-api-data.json` created for inspection.  
**Next adjustment:** Session 2 should create `scripts/market-shock-radar.mjs`, fetch live data from `http://localhost:3117/api/data`, and build a flexible extractor for `news`, `newsFeed`, and other nested objects.

---

# Session 2 — Market-Shock Scoring Script

## Goal

Create the first version of the script that reads Crucix data and maps text signals to capital-market shock categories.

## Estimated duration

45 minutes

## Tasks

- [x] Create `scripts/` folder if needed
- [x] Create `scripts/market-shock-radar.mjs`
- [x] Add shock category rules
- [x] Add text extraction from Crucix JSON
- [x] Add keyword matching
- [x] Add confidence scoring
- [x] Print first results to terminal

## Target file

```txt
scripts/market-shock-radar.mjs
```

## Shock categories

- Energy Shock
- Geopolitical Escalation
- Sanctions / Policy Shock
- Credit Stress
- Supply Chain Disruption
- Macro / Inflation Shock
- Weather / Climate Shock
- Market Volatility Signal

## Definition of done

Session 2 is complete when:

- `scripts/market-shock-radar.mjs` exists
- The script fetches `http://localhost:3117/api/data`
- The script extracts candidate text from the JSON
- The script scores at least some candidate signals, or logs that no usable signals were found

## Session 2 Log

**Status:** Complete  
**Date completed:** 2026-05-25  
**What worked:** Created the `scripts` folder and added `scripts/market-shock-radar.mjs`. The script successfully fetched Crucix data from `http://localhost:3117/api/data`, extracted candidate text from nested JSON objects, applied rule-based shock categories, matched keywords, assigned confidence levels, calculated a preview Market Shock Score, and printed ranked results to the terminal.  
**What failed:** The first script run failed with `fetch failed` because the Crucix server was not running. Starting Crucix with `npm run dev` fixed the issue.  
**Scoring notes:** Initial extraction produced 221 candidates and duplicated several Telegram urgent signals through `delta.signals.new`. A deduplication improvement reduced extracted candidates to 133 and removed repeated `delta.signals.new` duplicates from the top-ranked results. The latest run matched 15 displayed signals and produced a preview score of `20/20`, with regime `Shock mode`. This appears driven by live data containing many geopolitical escalation signals, especially Russia/Ukraine, Iran, missiles, drones, attacks, oil, and chokepoints. Further score calibration should happen in Session 3 when generating `market-shock.json`.  
**Files changed:** `scripts/market-shock-radar.mjs` created.  
**Next adjustment:** Session 3 should extend the script to write `dashboard/public/market-shock.json`, include `generatedAt`, `shockScore`, `shockCounts`, `itemCount`, ranked `items`, and tune scoring so high geopolitical concentration does not make the dashboard feel artificially broad.

---

# Session 3 — Generate and Validate `market-shock.json`

## Goal

Make the script write a clean JSON file that can power the dashboard.

## Estimated duration

45 minutes

## Tasks

- [x] Write output to `dashboard/public/market-shock.json`
- [x] Add `generatedAt`
- [x] Add `shockScore`
- [x] Add `shockCounts`
- [x] Add ranked `items`
- [x] Check the JSON manually
- [x] Tune rules if results are noisy
- [x] Confirm the score feels plausible for MVP

## Target output

```txt
dashboard/public/market-shock.json
```

## Expected JSON shape

```json
{
  "title": "CRUCIX Market Shock Radar",
  "subtitle": "World events → market transmission channels",
  "generatedAt": "2026-05-19T00:00:00.000Z",
  "source": "http://localhost:3117/api/data",
  "disclaimer": "Experimental market-intelligence prototype. Not investment advice. No buy/sell recommendations.",
  "shockScore": {
    "score": 8,
    "maxScore": 20,
    "regime": "Watchlist",
    "interpretation": "Some relevant signals are present, but breadth and severity remain moderate."
  },
  "shockCounts": {},
  "itemCount": 0,
  "items": []
}
```

## Definition of done

Session 3 is complete when:

- `market-shock.json` is generated
- The JSON can be opened in the browser
- The scoring output is not obviously broken
- Any false positives or false negatives are logged

## Session 3 Log

**Status:** Complete  
**Date completed:** 2026-05-26  
**What worked:** Extended `scripts/market-shock-radar.mjs` so it now writes `dashboard/public/market-shock.json`. The JSON includes `title`, `subtitle`, `generatedAt`, `source`, `disclaimer`, `shockScore`, `shockCounts`, `candidateCount`, `itemCount`, and ranked `items`. The generated JSON opened correctly at `http://localhost:3117/market-shock.json`. The script also now prints shock counts and writes the output path to the terminal.  
**What failed:** The first Session 3 scoring pass still produced `20/20`, even after adding a concentration penalty, because the live data was dominated by geopolitical and Iran/Israel/Russia/Ukraine-related signals. Calibration was adjusted so the same signal set produced `18/20`, then filtering weak/noisy rows produced a final MVP score of `16/20`.  
**False positives noticed:** Pure market/data labels such as `WTI Crude`, `Brent Crude`, and `CPI-U Core (ex Food & Energy)` were initially included even though they were not event signals. SDR receiver/location labels in Taiwan were also initially included because they matched geopolitical geography. These were filtered out for dashboard readiness.  
**False negatives noticed:** None confirmed during Session 3. Possible remaining limitation: short one-keyword high-priority Telegram signals may still appear as low-confidence items if they look event-like.  
**Files changed:** `scripts/market-shock-radar.mjs` updated. `dashboard/public/market-shock.json` generated.  
**Next adjustment:** Session 4 should create `dashboard/public/market-shock.html`, fetch `/market-shock.json`, and display the score, regime, shock counts, ranked signals, asset channels, matched keywords, and disclaimer.

---

# Session 4 — Dashboard Page

## Goal

Create a visually strong dashboard that can be screenshotted or recorded for LinkedIn.

## Estimated duration

75 minutes

## Tasks

- [x] Create `dashboard/public/market-shock.html`
- [x] Fetch `/market-shock.json`
- [x] Display Market Shock Score
- [x] Display risk regime
- [x] Display top shock category
- [x] Display ranked signal cards
- [x] Display asset-channel chips
- [x] Display matched keywords
- [x] Display disclaimer
- [x] Test responsive layout

## Target file

```txt
dashboard/public/market-shock.html
```

## Target dashboard URL

```txt
http://localhost:3117/market-shock.html
```

## Visual headline

```txt
OSINT → Capital Markets
World Events → Market Risk
```

## Definition of done

Session 4 is complete when:

- `market-shock.html` opens in the browser
- It reads `market-shock.json`
- It shows score, regime, signals, asset channels, and disclaimer
- It looks good enough for a LinkedIn screenshot

## Session 4 Log

**Status:** Complete  
**Date completed:** 2026-05-27  
**What worked:** Created `dashboard/public/market-shock.html` in VS Code. The dashboard successfully fetches `/market-shock.json`, renders the `16/20` Market Shock Score, shows the `Shock mode` regime, displays shock category counts, top category, candidate count, category breadth, concentration penalty, ranked signal cards, asset-channel chips, matched keyword chips, explanations, and the project disclaimer. The page is served correctly by Crucix at `http://localhost:3117/market-shock.html`, confirmed with `HTTP/1.1 200 OK`. The browser view showed the dashboard correctly, and a narrow responsive check looked good.  
**What failed:** The first attempt to create the HTML through a long `node -e` command failed because Windows Command Prompt/Node parsing broke on the pasted multiline HTML. Command Prompt then treated subsequent HTML lines as commands. Recovery was to use VS Code to edit `dashboard/public/market-shock.html` directly. The `findstr` check displayed the arrow character as `ΓåÆ`, but this was a Command Prompt encoding display issue; the browser dashboard looked correct.  
**UI notes:** The dashboard uses a dark high-contrast visual style with gradient background, glass-like cards, large headline, large score panel, progress bar, shock mix side panel, ranked signal cards, and colored chips for category, confidence, score, channels, and matched keywords. It is good enough for screenshot/demo use.  
**Files changed:** `dashboard/public/market-shock.html` created.  
**Next adjustment:** Session 5 should package the project: add an `npm run shock` script, create `README-market-shock-radar.md`, document the dashboard flow, add the transmission matrix, and decide how to handle untracked local files such as `session1-api-data.json`.

---

# Session 5 — Project Packaging

## Goal

Make the project understandable, runnable, and shareable.

## Estimated duration

30 minutes

## Tasks

- [ ] Add `shock` script to `package.json`
- [ ] Create `README-market-shock-radar.md`
- [ ] Add run instructions
- [ ] Add transmission matrix
- [ ] Add disclaimer
- [ ] Add project pitch
- [ ] Add example output

## Package script target

Add this to `package.json`:

```json
"shock": "node scripts/market-shock-radar.mjs"
```

Then run:

```bash
npm run shock
```

## README sections

- What it does
- Why it matters
- How to run it
- Example output
- Transmission matrix
- Disclaimer

## Definition of done

Session 5 is complete when:

- `npm run shock` works
- `README-market-shock-radar.md` exists
- The project can be understood by someone seeing it for the first time

## Session 5 Log

**Status:** Complete  
**Date completed:** 2026-05-28  
**What worked:** Added the `shock` npm script to `package.json` and verified it points to `node scripts/market-shock-radar.mjs`. After confirming Crucix was running, `npm run shock` worked successfully and refreshed `dashboard/public/market-shock.json`. Created `README-market-shock-radar.md` with the project pitch, what it does, why it matters, run instructions, example output, shock categories, transmission matrix, current flow, project files, npm script notes, limitations, disclaimer, suggested LinkedIn framing, and final CTA. Added `session1-api-data.json` to `.gitignore` so the local inspection snapshot is not accidentally committed. Committed the Session 5 packaging changes with commit `3ed0adc Package market shock radar`.  
**What failed:** The first `npm run shock` test failed with `fetch failed` because Crucix was not reachable at `http://localhost:3117`. Re-running after confirming the dev server was active fixed it.  
**Packaging notes:** Latest verified run extracted 125 candidates, matched 15 signals, produced a `15/20` Market Shock Score, and kept the regime at `Shock mode`. The score interpretation notes that the score is moderated because many signals are concentrated in one category. Current shock counts were `Geopolitical Escalation: 13` and `Energy Shock: 2`.  
**Files changed:** `.gitignore`, `package.json`, `dashboard/public/market-shock.json`, `README-market-shock-radar.md`.  
**Next adjustment:** Session 6 should test the full flow end-to-end, open the dashboard after refreshing JSON, capture a screenshot, plan or record a 20–30 second demo, and log known limitations.

---

# Session 6 — Testing, Troubleshooting, Screenshot, Demo

## Goal

Test the full flow and capture media for LinkedIn.

## Estimated duration

45 minutes

## Tasks

- [ ] Start Crucix
- [ ] Run `npm run shock`
- [ ] Open dashboard
- [ ] Refresh JSON
- [ ] Test error state if JSON is missing
- [ ] Fix obvious bugs
- [ ] Take final screenshot
- [ ] Record 20–30 second demo
- [ ] Save notes about known limitations

## Demo flow

1. Show Crucix running at `http://localhost:3117`
2. Show `/api/data`
3. Run `npm run shock`
4. Show `http://localhost:3117/market-shock.html`
5. End on `World Events → Market Risk`

## Definition of done

Session 6 is complete when:

- Full flow works from Crucix data to dashboard
- A screenshot is ready
- A short demo video is ready or planned
- Any remaining issues are logged

## Session 6 Log

**Status:** Complete 
**Date completed:** 2026-06-03
**What worked:** Started Crucix locally with npm run dev. The server loaded existing data immediately, completed a fresh initial sweep in about 30 seconds, and returned 28/29 sources. The sweep produced 50 news items, 50 feed items, and 18 delta changes, including 15 critical changes. Ran npm run shock successfully against the fresh /api/data feed. The script extracted 131 candidates, matched 15 signals, generated dashboard/public/market-shock.json, and produced a Market Shock Score of 16/20 with regime Shock mode. Verified http://localhost:3117/market-shock.html returned HTTP/1.1 200 OK. Verified the generated JSON timestamp was 2026-06-03T11:36:47.805Z, with 15 dashboard items and top item root.tg.urgent[4]. Opened the dashboard and confirmed it visually reflected the latest JSON: 16/20, Shock mode, latest timestamp, and the refreshed top signal. Captured a screenshot and saved it under media/screenshots/market-shock-dashboard-session6.png. Tested the missing-JSON error state by temporarily renaming market-shock.json; /market-shock.json returned 404 Not Found, and the dashboard showed its error message instead of blank content. Restored the JSON and confirmed the dashboard returned to normal. Created a 20–30 second demo plan and suggested voiceover at media/demo/session6-demo-plan.md. 
**What failed:** No blocking failures. The server was initially not running, which was expected and fixed by starting npm run dev. During the fresh sweep, 1 of 29 sources did not return data, but this is accepted for the MVP because the dashboard still had enough live source material.  
**Screenshot saved:** media/screenshots/market-shock-dashboard-session6.png
**Demo video saved:** Not recorded in Session 6. A demo plan was saved instead at media/demo/session6-demo-plan.md. 
**Known limitations:** The Market Shock Score is still rule-based and keyword-driven, not predictive. It can be dominated by one geopolitical cluster, although the concentration penalty moderates the score. Telegram and breaking-news items can contain unverified or fast-moving claims, so the dashboard must remain framed as OSINT risk scanning rather than factual confirmation or trading advice. The dashboard depends on a fresh npm run shock run after Crucix refreshes /api/data; otherwise the static JSON can become stale. Some Crucix sources may intermittently fail without blocking the MVP. 
**Files changed:** dashboard/public/market-shock.json, media/screenshots/market-shock-dashboard-session6.png, media/demo/session6-demo-plan.md, and CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md. 
**Next adjustment:** Superseded on 2026-06-11. Session 7 now begins Phase 2 with the market data fetcher: FRED + Stooq, uniform z-score transform, and `dashboard/public/market-readings.json`.

---

# Session 7 — Market Data Fetcher

> The old Session 7 (LinkedIn Launch Package, including the post draft, carousel outline, hashtags, and CTA) was **superseded on 2026-06-11**. The post is deferred and will be drafted outside these sessions against a separate strategy file; see Section 12. Do not resurrect the old draft — it conflicts with the post strategy now governing distribution.

## Goal

Create `scripts/market-data.mjs`: fetch the instruments in the Phase 2 Design Spec from FRED and Stooq, compute the uniform z-score transform, and write `dashboard/public/market-readings.json`.

## Estimated duration

60 minutes

## Tasks

- [ ] Obtain a free FRED API key and store it in `.env` (never commit it)
- [ ] Fetch FRED series: `DCOILBRENTEU`, `DCOILWTICO`, `VIXCLS`, `T10YIE`, `BAMLH0A0HYM2`, `DGS10`, `DTWEXBGS` (1 year of daily history plus a buffer for holidays/gaps)
- [ ] Fetch Stooq CSV history for: `GLD`, `ITA`, `EEM`, `DBC` (or `CPER`), `KBE`, `SOXX` (or `SMH`), `XLI`
- [ ] Implement the uniform transform: 5-day return z-score for price instruments, 5-day level-change z-score for level instruments, trailing 1-year window
- [ ] Per channel: compute max |z| and name the driving instrument
- [ ] Write `dashboard/public/market-readings.json` with `asOfClose` date, per-channel reading, per-instrument detail
- [ ] Handle gaps defensively: stale series (FRED spread/breakeven data lags a day), missing days, weekend alignment between FRED and Stooq calendars

## Definition of done

- `node scripts/market-data.mjs` produces valid `market-readings.json`
- Every channel in the spec has a reading with a named driver instrument
- The `asOfClose` date is correct and the script fails loudly (not silently) when a source is unreachable

## Session 7 Log

**Status:** Complete  
**Date completed:** 2026-06-17  
**What worked:** Started with a clean working tree. Verified GitHub Pages behavior: the deployed root URL serves the dashboard and reads committed static `market-shock.json`; `/market-shock.html` returns 404 on Pages. Confirmed `.env` was not tracked. Added local FRED and Tiingo keys to `.env` without exposing them in chat. Confirmed FRED fetch works with `DCOILBRENTEU`. Created `scripts/market-data.mjs`. Added `npm run market:data`. The script fetches FRED series `DCOILBRENTEU`, `DCOILWTICO`, `VIXCLS`, `T10YIE`, `BAMLH0A0HYM2`, `DGS10`, and `DTWEXBGS`, plus Tiingo EOD `adjClose` for `GLD`, `ITA`, `EEM`, `DBC`/`CPER`, `KBE`, `SOXX`/`SMH`, and `XLI`. It aligns all instruments on common dates, computes the uniform transform, selects each channel's max absolute z-score with driver instrument named, and writes `dashboard/public/market-readings.json`.  
**Final verified run:** `npm run market:data` succeeded. Output used `asOfClose: 2026-06-08`, `common usable dates: 596`, gold proxy `GLD`, broad commodities proxy `DBC`, and semiconductor proxy `SOXX`. Channel readings were: Conflict escalation `-1.127σ` driven by `GLD`; Sanctions / policy `-2.618σ` driven by `EEM`; Energy disruption `-1.332σ` driven by `T10YIE`; Credit stress `1.074σ` driven by `DGS10`; Supply chain `-0.476σ` driven by `SOXX`.  
**What failed:** Initial FRED fetch failed because `FRED_API_KEY` existed but was blank. Stooq CSV failed from both Node and `curl`, returning browser-verification HTML and later `Access denied`, so it could not support automated fetching. Alpha Vantage compact CSV worked for `GLD`, but `outputsize=full` was premium-gated and compact output lacked enough history for a trailing 252-observation window. The suggested FRED gold series `GOLDAMGBD228NLBM` returned `series does not exist`, so gold could not be moved to FRED. Several temporary test files were created during source validation and then deleted.  
**Files changed:** `scripts/market-data.mjs`, `dashboard/public/market-readings.json`, `package.json`.  
**Next adjustment:** Session 8 should create `scripts/divergence.mjs`, read `market-shock.json` and `market-readings.json`, map signal categories to market channels, apply the frozen thresholds, classify rows into `radar-claim`, `priced`, `radar-miss`, and `calm`, and write `dashboard/public/divergence.json`.

---

# Session 8 — Divergence Engine

## Goal

Create `scripts/divergence.mjs`: join the Phase-1 signal output with `market-readings.json` using the category→channel mapping, classify each channel into one of the four states with the frozen thresholds, and write `dashboard/public/divergence.json`.

## Estimated duration

60 minutes

## Tasks

- [ ] Implement the category→channel mapping from the Design Spec (Section 4b.3)
- [ ] Retire `Market Volatility Signal` as a signal channel (circularity — see spec)
- [ ] Decide and log: market columns for Macro/Inflation and Weather/Climate, or signal-only display for v2
- [ ] Normalize each channel's signal score to its channel max so the 60% threshold is well-defined
- [ ] Apply frozen thresholds: signal ≥ 60% of channel max; |z| ≥ 1.5
- [ ] Classify each channel: `radar-claim`, `priced`, `radar-miss`, `calm`
- [ ] Write `divergence.json` matching the daily snapshot schema (date, rows)
- [ ] Add `npm run divergence` (or fold into `npm run shock` as a pipeline)

## Definition of done

- `divergence.json` validates against the snapshot schema
- All four states are reachable in tests (force them with synthetic inputs if live data does not cover all four)
- Thresholds are constants in one place, with a comment stating they are frozen as of launch

## Session 8 Log

**Status:** Complete  
**Date completed:** 2026-06-19  
**What worked:** Started from a clean working tree. Inspected `dashboard/public/market-shock.json` and confirmed the signal side was concentrated in `Geopolitical Escalation` and `Energy Shock`, with `Supply Chain Disruption` appearing through `otherCategories`. Inspected `dashboard/public/market-readings.json` and confirmed the five required Phase-2 market channels were present: Conflict escalation, Sanctions / policy, Energy disruption, Credit stress, and Supply chain. Created `scripts/divergence.mjs`. The script reads `market-shock.json` and `market-readings.json`, maps Phase-1 signal categories to Phase-2 market channels, includes both primary and secondary categories, retires `Market Volatility Signal` as a signal channel, applies frozen thresholds, classifies rows into `radar-claim`, `priced`, `radar-miss`, and `calm`, and writes `dashboard/public/divergence.json`. Added `npm run divergence` to `package.json`.  
**Validation:** `node scripts\divergence.mjs --self-test` passed and confirmed all four divergence states are reachable. `npm run divergence` succeeded and wrote `dashboard/public/divergence.json`. A JSON shape validation confirmed top-level `date`, `rows`, `thresholds`, and `stateCounts`, five divergence rows, required row fields, and valid states.  
**Final verified run:** `date: 2026-06-08`; framing: `readings as of market close, 2026-06-08`; thresholds: signal elevated `>= 0.6`, market moving `abs(z) >= 1.5`, frozen as of `2026-06-11`. State counts were `radar-claim: 3`, `radar-miss: 1`, and `calm: 1`. Rows: Conflict escalation = `radar-claim`, signal `95%`, market `-1.127σ`, driver `GLD`; Sanctions / policy = `radar-miss`, signal `0%`, market `-2.618σ`, driver `EEM`; Energy disruption = `radar-claim`, signal `85%`, market `-1.332σ`, driver `T10YIE`; Credit stress = `calm`, signal `0%`, market `1.074σ`, driver `DGS10`; Supply chain = `radar-claim`, signal `95%`, market `-0.476σ`, driver `SOXX`.  
**What failed:** No blocking failures. No `priced` row appeared in the live data, but the self-test confirms the state is reachable by the classifier.  
**Files changed:** `scripts/divergence.mjs`, `dashboard/public/divergence.json`, `package.json`.  
**Next adjustment:** Session 9 should rework `dashboard/public/market-shock.html` so the divergence board is the hero element, reads `dashboard/public/divergence.json`, displays `readings as of market close, 2026-06-08`, keeps calm rows visible, highlights `radar-claim` soberly, shows the `radar-miss` humility row, keeps Shock Mix prominent, and visually demotes the Market Shock Score.

---

# Session 9 — Dashboard v2: Divergence Board as Hero

## Goal

Rework `market-shock.html` so the page layout expresses the project's position: divergence board large, decomposition prominent, aggregate score small.

## Estimated duration

75 minutes

## Tasks

- [ ] Divergence board as the top element: one row per channel — signal reading | market reading (with σ and driver instrument) | state
- [ ] Distinct but sober visual treatment for `radar-claim` rows; `calm` rows visible, not hidden
- [ ] Shock Mix decomposition (breadth, concentration penalty, ranked signals) kept prominent below the board
- [ ] Market Shock Score demoted to a small element; keep regime and interpretation but not as the headline
- [ ] Add `readings as of market close, {date}` prominently; remove any "live" implication from copy
- [ ] Descriptive-labels pass over all UI copy and signal explanations (Design Spec 4b.6)
- [ ] Keep disclaimer footer
- [ ] Responsive check (the board must degrade to stacked cards cleanly)

## Definition of done

- The first thing a viewer reads is the divergence board, not the score
- The page states its date and contains no editorial severity language
- A screenshot of the board is legible at LinkedIn feed size

## Session 9 Log

**Status:** Complete
**Date completed:** 2026-06-23
**What worked:** Reworked `dashboard/public/market-shock.html` into Dashboard v2. The divergence board is now the hero element and reads `divergence.json`. The board renders one row per market channel with signal reading, market reading, driver instrument, and state. Calm rows remain visible. `radar-claim` rows are distinct but sober. The `radar-miss` row is shown as the humility check. Shock Mix and ranked transmission signals remain prominent below the board. The Market Shock Score is still present but visually demoted. The page displays `readings as of market close, {date}` and uses descriptive, non-live, non-editorial labels. User feedback restored the darker CRUCIX visual style and reintroduced neutral observed source excerpts in ranked signal cards.
**Data refresh:** Refreshed `market-shock.json` with `npm run shock`, refreshed `market-readings.json` with `npm run market:data`, and regenerated `divergence.json` with `npm run divergence`. Final public divergence date was `2026-06-15`. State counts were `priced: 3`, `radar-miss: 1`, `calm: 1`. Rows: Conflict escalation `priced`, Sanctions / policy `radar-miss`, Energy disruption `priced`, Credit stress `calm`, Supply chain `priced`.
**Deployment:** First commit `b90be39 Rework dashboard around divergence board` updated Dashboard v2 and refreshed static files. A second deployment fix commit `3c26afc Publish dashboard v2 to Pages` copied the v2 dashboard and refreshed JSON files into `docs/`, because GitHub Pages serves from `docs/`. The browser view of GitHub Pages was verified.
**What failed:** Initial Pages verification still showed the old dashboard because Pages was serving `docs/index.html`, not `dashboard/public/market-shock.html`. The first JSON check failed because `docs/divergence.json` did not exist yet and Pages returned HTML. Fixed by publishing `docs/divergence.json`, `docs/market-readings.json`, `docs/market-shock.json`, and updating `docs/index.html`. A forbidden-wording scan found `Live Updates` in a raw source headline. Fixed by sanitizing dashboard output text so source-feed labels are neutralized in public JSON/display output.
**Files changed:** `dashboard/public/market-shock.html`, `dashboard/public/market-shock.json`, `dashboard/public/market-readings.json`, `dashboard/public/divergence.json`, `scripts/market-shock-radar.mjs`, `docs/index.html`, `docs/market-shock.json`, `docs/divergence.json`, `docs/market-readings.json`.
**Commits:** `b90be39 Rework dashboard around divergence board`; `3c26afc Publish dashboard v2 to Pages`.
**Validation:** Local Crucix served the dashboard and JSON files with HTTP 200. Wording scans passed for forbidden terms: `high-severity`, `real-time`, `breaking`, `alarming`, `terrifying`, and live-language variants. `node --check scripts/market-shock-radar.mjs` passed. `git diff --check` passed. Secret scan found no obvious committed secrets in checked files. GitHub raw file check confirmed `docs/divergence.json` contained `date: 2026-06-15` and state counts `priced: 3`, `radar-miss: 1`, `calm: 1`. GitHub Pages browser view was verified.
**Next adjustment:** Session 10 should build the daily log/history flow and include a Pages publish step that keeps `docs/` synchronized with generated dashboard outputs.

---

# Session 10 — Daily Log, History Page, Automation

## Goal

Turn the snapshot into a log: dated daily JSON committed under `log/`, a history page rendering them backwards, and automation/fallback protocol. Domain work deferred.

## Estimated duration

60 minutes

## Tasks

- [x] Write each day's `divergence.json` to `log/YYYY-MM-DD.json` and commit it
- [x] Build `history.html`: rows rendered newest-first, filterable by state
- [x] Attempt the GitHub Action path: scheduled daily run — market fetch, Crucix sweep in CI if feasible, scripts, commit, publish
- [x] Document the local one-command daily fallback protocol
- [x] Verify the Pages deployment uses committed JSON/docs copies
- [ ] Configure `crucix.divergencelog.com` — deferred
- [ ] Update the apex `divergencelog.com` index — deferred

## Definition of done

- Daily snapshot script exists and creates/validates `log/` snapshots
- `log/index.json` exists
- `docs/log/index.json` exists
- History page renders committed snapshots
- First real snapshot committed
- Automation attempt added
- Local fallback documented
- Domain setup deferred

## Session 10 Log

**Status:** Complete for daily log/history/automation pieces
**Date completed:** 2026-06-24
**What worked:** Added `npm run snapshot` and `npm run daily`. Added `scripts/daily-snapshot.mjs` and `scripts/daily-run.mjs`. Snapshot validation, no-overwrite protection, `--force` support, manifest generation, and `docs/` sync now work. Created the first real snapshot at `log/2026-06-15.json`, created `log/index.json`, and created `docs/log/` copies. Built a dark CRUCIX-style history page with relative `log/index.json` loading and state filters. Added `/log` static serving locally through `server.mjs`. Added GitHub Action `.github/workflows/daily-snapshot.yml`. Added local fallback protocol `docs/daily-run-protocol.md`. Committed and pushed `94f2942 Add daily log history workflow`.
**What failed:** `npm run daily` reached `npm run shock` but failed locally because `http://localhost:3117/api/data` was not available. At the end of Session 10, CI verification remained unresolved, repository secrets were not yet verified, and only one real snapshot existed. This was resolved in Session 11: exact secrets were configured, the manual Action succeeded, and the real `2026-06-18` snapshot was created.
**Files changed:** `package.json`, `scripts/daily-snapshot.mjs`, `scripts/daily-run.mjs`, `scripts/market-data.mjs`, `server.mjs`, `dashboard/public/history.html`, `.github/workflows/daily-snapshot.yml`, `docs/daily-run-protocol.md`, `docs/history.html`, `log/2026-06-15.json`, `log/index.json`, `docs/log/2026-06-15.json`, `docs/log/index.json`.
**Next adjustment:** Session 11 should first add GitHub repository secrets `FRED_API_KEY` and `TIINGO_API_KEY`, then manually run the Daily snapshot GitHub Action once to verify whether the full CI daily run works. After that, harden stale-data/failure handling, update README v2, and keep domain setup as a later dedicated session.

---

# Session 11 — Hardening and Launch Support Assets

## Goal

Final reliability pass and the assets the eventual post will need. The post itself is **not** written in this session (Section 12).

## Estimated duration

30 minutes

## Tasks

- [x] Add GitHub repository secrets `FRED_API_KEY` and `TIINGO_API_KEY`, then manually run the Daily snapshot GitHub Action once to verify whether the full CI daily run works
- [x] Failure-mode pass: stale/lagging market data, missing keys, failed source fetches — the board should degrade with a dated warning, never silently show old data as fresh
- [x] README v2: divergence rules, frozen thresholds, four states, instrument map, data sources, what the log is and is not
- [x] Confirm attribution to Crucix and disclaimer language
- [ ] Screenshot of the board with real rows (intentionally skipped/deferred by user in Session 11)
- [x] Confirm `.env` / API keys are not committed; repo is publishable

## Definition of done

- The project survives a missing data source without lying about freshness
- CI automation is considered proven only after the repository secrets are added and the manual Daily snapshot Action run succeeds
- A reader landing cold on the README understands the rules the board follows
- A current, dated board screenshot exists (deferred by user; not part of Session 11 completion)

## Session 11 Log

**Status:** Complete for CI proof, hardening, README v2, and publishability checks. Screenshot intentionally skipped/deferred by user.
**Date completed:** 2026-06-26
**What worked:** GitHub repository secrets were recreated with the exact required names `FRED_API_KEY` and `TIINGO_API_KEY`. Manual GitHub Action "Daily snapshot" then succeeded. Local `git pull` fast-forwarded to commit `0e3a2b7` ("Update CRUCIX daily snapshot"). The Action created a real new snapshot at `log/2026-06-18.json` and `docs/log/2026-06-18.json`; CI automation is now proven. Session 11 implementation added market freshness metadata, lagging/stale warnings, warning propagation into `divergence.json`, dashboard warning display, history warning support, atomic JSON writes, loud missing-key/source-failure handling, README v2, and `docs/daily-run-protocol.md` improvements.
**What failed:** The first manual GitHub Action run failed because the GitHub secret names were wrong. This was fixed by recreating the secrets with exact names. Screenshot capture was intentionally skipped/deferred by the user and is not complete.
**Validation passed:** `node --check scripts/market-data.mjs`; `node --check scripts/divergence.mjs`; `node --check scripts/daily-snapshot.mjs`; `node --check scripts/daily-run.mjs`; `node scripts/divergence.mjs --self-test`; `node scripts/divergence.mjs`; JSON parse checks; changed-file secret scan found no literal API secrets; `.env` is local and not tracked; `git diff --check` passed with only CRLF warnings.
**Current generated warning:** Market readings are lagging: generated `2026-06-26`, readings as of market close `2026-06-18` (`8` calendar days old).
**Files changed:** `scripts/market-data.mjs`, `scripts/divergence.mjs`, `scripts/daily-snapshot.mjs`, `dashboard/public/market-shock.html`, `dashboard/public/history.html`, `dashboard/public/divergence.json`, `docs/index.html`, `docs/history.html`, `docs/divergence.json`, `README-market-shock-radar.md`, `docs/daily-run-protocol.md`, plus this project log.
**Next adjustment:** Choose Session 12 direction: domain and launch staging for `crucix.divergencelog.com`, or log accumulation and public verification before domain work. Do not fabricate extra snapshots. Domain remains deferred until a dedicated session.

---

# Session 12 — Log Accumulation and Public Verification

## Goal

Verify that the public daily-log flow is healthy, that GitHub Pages is serving the latest committed dashboard/log files, and diagnose why the latest snapshot remains dated `2026-06-22` with an 8-calendar-day lag warning on `2026-06-30`. Domain work is explicitly out of scope.

## Estimated duration

45 minutes

## Tasks

- [x] Inspect repo state, current manifests, dashboard JSON, workflow, and daily-run scripts
- [x] Verify local `log/index.json` and `docs/log/index.json` match after fast-forward
- [x] Verify local `dashboard/public/divergence.json` and `docs/divergence.json` match after fast-forward
- [x] Verify latest public snapshot count/date/state counts/warnings across manifest, snapshot, dashboard JSON, and docs copies
- [x] Diagnose the lag and identify the source holding `asOfClose` at `2026-06-22`
- [x] Verify GitHub Pages serves from `docs/`, dashboard/history use relative JSON fetches, and public files do not fetch from `localhost`
- [x] Avoid domain work, methodology changes, fabricated snapshots, commits, and pushes

## Definition of done

- Public Pages is confirmed to serve latest committed `docs/` files
- Latest snapshot count/date/state counts are recorded
- Source/docs copies are confirmed consistent
- Lag is classified as expected source lag or a pipeline bug
- Recommended next action is recorded

## Session 12 Log

**Status:** Complete.
**Date completed:** 2026-06-30
**Focus:** Option B — log accumulation and public verification.
**What worked:** Public flow is healthy. GitHub Pages is serving the latest committed `docs/` files from `origin/master`. Local checkout was initially behind by three Action-created commits, then was fast-forwarded successfully from `f5fbde2` to `9fc3bad`; local repo now matches `origin/master`. `git status --short` produced no changed files after the pull, and `git log --oneline -5` shows `9fc3bad Update CRUCIX daily snapshot`, `002e2ec Update CRUCIX daily snapshot`, `9305a0e Update CRUCIX daily snapshot`, `f5fbde2 Make daily snapshot idempotent on stale market dates`, and `3582d9e Harden daily snapshot workflow`. Public snapshot count is `3`. Latest real snapshot date is `2026-06-22`. Latest public state counts are `priced: 2`, `radar-miss: 2`, `calm: 1`. Public `index.html`, `history.html`, `divergence.json`, `market-readings.json`, `log/index.json`, and `log/2026-06-22.json` match the latest committed `origin/master:docs/...` files after line-ending normalization. Local source files and `docs/` copies also match after the fast-forward: `log/index.json` matches `docs/log/index.json`; `dashboard/public/divergence.json` matches `docs/divergence.json`; `dashboard/public/market-readings.json` matches `docs/market-readings.json`; `dashboard/public/market-shock.html` matches `docs/index.html`; `dashboard/public/history.html` matches `docs/history.html`.
**Lag diagnosis:** The lag warning is expected source lag, not a pipeline bug. The global `asOfClose` is held at `2026-06-22` by FRED crude series. Official FRED rows checked during verification: `DCOILBRENTEU` latest row `2026-06-22,76.49`; `DCOILWTICO` latest row `2026-06-22,78.94`. Other sources are newer, including Tiingo ETF data through `2026-06-29` and some FRED series through `2026-06-26`/`2026-06-29`. Because `scripts/market-data.mjs` uses one global common-date alignment across all instruments, Brent/WTI correctly hold the whole board back. The `market-readings-lagging` warning is doing what Session 11 intended.
**What failed:** No blocking failures. Local checkout was initially stale by three commits and was fixed with `git pull --ff-only`. Git warned it could not read `C:\Users\heyke/.config/git/ignore`; this did not block the session.
**Validation passed:** `git diff --no-index --exit-code log/index.json docs/log/index.json`; `git diff --no-index --exit-code dashboard/public/divergence.json docs/divergence.json`; `git diff --no-index --exit-code dashboard/public/market-readings.json docs/market-readings.json`; `git diff --no-index --exit-code dashboard/public/market-shock.html docs/index.html`; `git diff --no-index --exit-code dashboard/public/history.html docs/history.html`; `node --check scripts/market-data.mjs`; `node --check scripts/daily-snapshot.mjs`; `node --check scripts/daily-run.mjs`; `node --check scripts/divergence.mjs`; public Pages normalized compare against `origin/master:docs/...` for all checked files.
**Files changed:** No code or dashboard files changed. Only this project log was updated after verification.
**Next adjustment:** Continue monitoring whether FRED crude lag resolves naturally. Keep accumulating real CI-created snapshots until the log has roughly two weeks of dated rows. Domain setup remains deferred to a later dedicated session. Board screenshot with real rows remains needed before publication. Next likely session is Session 13: continued log accumulation/public verification, or domain staging only if enough real snapshots exist.

---

# Session 13 — Daily-Run Visibility and Same-Date Docs Sync

## Goal

Investigate why the project does not produce one `log/YYYY-MM-DD.json` snapshot per calendar day, decide whether that is expected behavior or a bug, and fix the real public-sync problem without changing the market methodology or fabricating snapshots.

## Estimated duration

60 minutes

## Tasks

- [x] Inspect `.github/workflows/daily-snapshot.yml`, `scripts/daily-run.mjs`, `scripts/daily-snapshot.mjs`, `scripts/market-data.mjs`, dashboard JSON, docs JSON, and log manifests
- [x] Confirm whether the GitHub Action actually runs daily
- [x] Distinguish failed days from successful same-close-date runs
- [x] Confirm close-date snapshots are keyed by market close date / `asOfClose`, not by run date
- [x] Confirm FRED crude data is still holding the global common-date alignment back
- [x] Identify whether `dashboard/public/*.json` and `docs/*.json` stay synchronized after a same-close-date keep
- [x] Implement run-level logging under `log/runs/` without changing close-date snapshot behavior
- [x] Keep existing close-date snapshots unchanged on same-date differences
- [x] Always sync current `dashboard/public/*.json` into `docs/*.json`
- [x] Update GitHub Action git-add paths for run logs
- [x] Add narrow `.gitignore` exceptions for `log/runs/` and `docs/log/runs/`
- [x] Avoid threshold changes, methodology changes, common-date alignment changes, fabricated snapshots, commits, and pushes

## Definition of done

- Sparse close-date snapshots are documented as expected behavior
- Same-close-date docs staleness is fixed
- Run manifest files are generated under `log/runs/` and copied to `docs/log/runs/`
- Validation passes locally
- Next GitHub Action verification steps are recorded

## Session 13 Log

**Status:** Complete.
**Date completed:** 2026-07-08
**Focus:** Daily-run visibility and same-close-date docs sync.
**Diagnosis:** The daily Action is running daily, but the project intentionally logs close-date snapshots by market close date / `asOfClose`, not by calendar run date. Therefore the sparse close-date snapshots are expected and should remain sparse. The real bug was separate: same-close-date runs could update `dashboard/public/*.json` while leaving `docs/*.json` stale because `scripts/daily-snapshot.mjs` returned early when an existing close-date snapshot was kept.
**What changed:** `scripts/daily-snapshot.mjs` now keeps existing close-date snapshots on same-date differences, writes a separate run record under `log/runs/<generatedAt-safe-filename>.json`, maintains `log/runs/index.json`, copies run logs to `docs/log/runs/`, and always syncs current `dashboard/public/*.json` into `docs/*.json` even when the close-date snapshot is kept. `.github/workflows/daily-snapshot.yml` now adds `log/runs/*.json`, `log/runs/index.json`, `docs/log/runs/*.json`, and `docs/log/runs/index.json`. `.gitignore` now has narrow exceptions because the existing `runs/` ignore rule hid `log/runs` and `docs/log/runs`.
**Validation passed:** `node --check scripts/daily-snapshot.mjs` passed. `npm run snapshot` passed. Existing close-date snapshot kept: `log/2026-06-29.json`. Run record written: `log/runs/2026-07-08T01-05-28-175Z.json`. Run manifest written: `log/runs/index.json`. Public copies were written under `docs/log/runs/`. `docs/divergence.json` now matches `dashboard/public/divergence.json` after a same-close-date keep. `docs/market-readings.json` and `docs/market-shock.json` also match their `dashboard/public` sources. `log/runs/index.json` and `docs/log/runs/index.json` both have count `1` and match. No unexpected files appeared.
**Methodology preserved:** No divergence thresholds changed. No market methodology changed. No global common-date alignment changed. No calendar-day snapshots were fabricated.
**Files changed:** `.github/workflows/daily-snapshot.yml`; `.gitignore`; `scripts/daily-snapshot.mjs`; `docs/divergence.json`; `docs/market-readings.json`; `docs/market-shock.json`; `log/runs/2026-07-08T01-05-28-175Z.json`; `log/runs/index.json`; `docs/log/runs/2026-07-08T01-05-28-175Z.json`; `docs/log/runs/index.json`; this project log.
**What failed:** No blocking failures. A `git add --dry-run` check could not create `.git/index.lock` in the local sandbox, but `git status --short --untracked-files=all` confirmed the run-log files are visible and not hidden after the `.gitignore` exceptions.
**Next adjustment:** Commit and push the Session 13 implementation when ready, then verify the next GitHub Action writes a new run record and syncs public docs. Domain remains deferred. Board screenshot remains needed.

---

# Session 14 — Methodology 2.0 Architecture and Audit Protocol

## Goal

Turn the conceptual Methodology 2.0 direction into an implementable architecture and a reproducible signal/market audit protocol. Session 14 does not attempt to finish the complete manual signal audit, historical market backtest, or production implementation.

## Estimated duration

90 minutes for architecture decisions and protocol design. Follow-up Sessions 15-16 perform the evidence collection and measurement.

## Tasks

- Verify repository HEAD and confirm the predecessor log amendment is present.
- Verify legacy automation remains healthy and unchanged.
- Inventory what raw candidate history is actually available.
- Identify whether historical reconstruction is possible without fabrication.
- Decide the raw-candidate persistence contract for future runs.
- Decide the persistent event-registry architecture and provisional storage paths.
- Freeze or explicitly defer merge, split, alias, correction, and parent-series rules.
- Define Methodology 2.0 core fields versus 2.1 expansion fields.
- Define `assessed`, `unassessed`, `unknown`, and `not-applicable` semantics.
- Decide the reproducibility contract for deterministic or model-assisted clustering.
- Define the methodology-parameter artifact list.
- Define reporting-origin and independent-source rules.
- Draft the minimal event-to-mechanism-to-channel map required for the five current market channels.
- Define signal sampling and manual-label protocol for Session 15.
- Define market backtest, date/eligibility, and empirical-percentile protocol for Session 16.
- Define signal-versus-market cutoff timing.
- Define parallel-run comparison metrics and acceptance principles.
- Amend Sessions 15-20 from the architecture decisions.
- Make no production-methodology change.

## Planned Session 14 outputs

Intended outputs for the actual Session 14, not files created by this log-only architecture amendment:

```txt
audit/session14-architecture-decision.md
audit/session14-signal-audit-protocol.md
audit/session14-market-audit-protocol.md
audit/session14-parallel-comparison-protocol.md
audit/methodology-2-core-schema-draft.md
audit/methodology-2-parameter-register.md
```

Paths remain provisional until Session 14 confirms them.

## Guardrails

- No production classifier rewrite in Session 14.
- No live LLM/embedding dependency in production scoring.
- No market source/proxy change.
- No threshold change in legacy output.
- No dashboard redesign.
- No historical rewrite or fabricated candidates.
- No domain or publication work.
- No claim that Methodology 2.0 is frozen before Sessions 15-17 produce evidence.

## Definition of done

Session 14 is complete when:

- registry and assignment-history architecture is accepted or explicitly deferred with a reason;
- the reproducibility contract is written;
- the 2.0 core and 2.1 expansion boundary is written;
- source independence is operationally defined;
- the parameter register is enumerated;
- signal and market audit protocols are detailed enough for Codex to execute without methodological invention;
- parallel-run success metrics are defined without requiring legacy agreement;
- Sessions 15-20 are updated from those decisions;
- production outputs remain unchanged.

---

## 5. Done Checklist

### Setup

- [x] Node.js 22+ confirmed
- [x] Crucix cloned
- [x] Dependencies installed
- [x] `.env` created
- [x] Crucix runs locally
- [x] `/api/health` works
- [x] `/api/data` works

### Market-shock engine

- [x] `scripts/market-shock-radar.mjs` created
- [x] Crucix data fetched
- [x] Candidate text extracted
- [x] Shock rules added
- [x] Confidence scoring added
- [x] Shock score added as terminal preview
- [x] `market-shock.json` generated

### Dashboard

- [x] `market-shock.html` created
- [x] Dashboard reads JSON
- [x] Score displayed
- [x] Regime displayed
- [x] Signal cards displayed
- [x] Asset channels displayed
- [x] Disclaimer displayed
- [x] UI looks shareable
- [x] Dashboard v2 divergence board implemented as hero
- [x] Dashboard reads `divergence.json`
- [x] Dashboard keeps calm rows visible
- [x] Radar-miss row shown as humility check
- [x] Shock Mix kept prominent below the board
- [x] Market Shock Score visually demoted
- [x] `readings as of market close, {date}` framing added
- [x] Descriptive-labels pass completed
- [x] Dashboard v2 published to GitHub Pages via `docs/`
- [x] Dashboard warning display added for lagging/stale market readings
- [x] History page warning support added for snapshots that carry warnings

### Packaging

- [x] `npm run shock` added
- [x] README created
- [x] Transmission matrix added
- [x] Demo flow documented
- [x] Screenshot captured
- [ ] Demo video captured
- [x] Old LinkedIn launch package superseded (2026-06-11)
- [ ] Publication post drafted outside build sessions (after Phase 2 launch conditions in Section 12 are met)
- [x] README v2 completed
- [x] Crucix attribution confirmed
- [x] Disclaimer language confirmed
- [ ] Session 11 board screenshot captured (intentionally deferred by user)

### Market data fetcher

- [x] `scripts/market-data.mjs` created
- [x] FRED API key stored locally in `.env`
- [x] Tiingo API key stored locally in `.env`
- [x] FRED fetch verified
- [x] Tiingo EOD `adjClose` fetch verified
- [x] Stooq tested and rejected for automation due to browser verification / access denial
- [x] Alpha Vantage tested and rejected for this use because full daily history was premium-gated
- [x] Uniform price/level transform implemented
- [x] Common-date alignment implemented
- [x] Channel max absolute z-score driver selected
- [x] `dashboard/public/market-readings.json` generated
- [x] `npm run market:data` added and verified
- [x] Market freshness metadata added
- [x] Lagging/stale market-reading warnings added
- [x] Missing FRED/Tiingo keys fail loudly
- [x] Failed source fetches / non-JSON source responses fail loudly
- [x] Market readings JSON writes are atomic

### Divergence engine

- [x] `scripts/divergence.mjs` created
- [x] Phase-1 categories mapped to Phase-2 market channels
- [x] `Market Volatility Signal` retired as a signal channel
- [x] Macro / Inflation and Weather / Climate set as signal-only for v2
- [x] Primary and secondary signal categories included in channel aggregation
- [x] Signal score normalized against Phase-1 20-point item ceiling
- [x] Frozen thresholds applied: signal `>= 60%`, market `abs(z) >= 1.5`
- [x] Four-state classifier implemented
- [x] Self-test confirms all four states are reachable
- [x] `dashboard/public/divergence.json` generated and validated
- [x] `npm run divergence` added and verified
- [x] Market freshness warnings propagated into `divergence.json`
- [x] Divergence JSON writes are atomic

### Daily log / history

- [x] Daily snapshot script created
- [x] First dated snapshot committed
- [x] Second real snapshot created by CI (`2026-06-18`)
- [x] Third real snapshot created by CI (`2026-06-22`)
- [x] Log manifest created
- [x] `docs/log` synced
- [x] History page created
- [x] State filter added
- [x] Local fallback protocol documented
- [x] GitHub Action added
- [x] Exact GitHub secret names verified: `FRED_API_KEY`, `TIINGO_API_KEY`
- [x] CI full run proven after GitHub secrets were added and the Daily snapshot Action succeeded manually
- [x] Multiple real daily snapshots accumulated
- [x] Public Pages/docs latest committed file verification passed
- [x] Latest lag warning diagnosed as expected FRED crude source lag
- [x] Close-date snapshots confirmed intentionally sparse and keyed by `asOfClose`
- [x] Same-close-date docs sync bug fixed
- [x] Run-level manifest added under `log/runs/`
- [x] Run logs copied to `docs/log/runs/`
- [x] GitHub Action git-add paths updated for run logs
- [ ] Custom domain configured

### Methodology 2.0 audit/rebuild

#### Architecture/protocol

- [ ] Methodology 2.0 core versus 2.1 field boundary frozen
- [ ] Explicit assessment-status semantics frozen
- [ ] Persistent registry location/format frozen
- [ ] Immutable assignment-history contract frozen
- [ ] Parent-series/event-episode hierarchy frozen
- [ ] Merge/split/alias/correction rules frozen
- [ ] Raw-candidate persistence contract frozen
- [ ] Clustering reproducibility contract frozen
- [ ] Methodology parameter register frozen
- [ ] Reporting-origin and independent-source rules frozen
- [ ] Minimal leaf/event-to-mechanism-to-channel map frozen
- [ ] Signal-versus-market timing rule frozen
- [ ] Parallel-run comparison protocol frozen

#### Signal audit and implementation

- [ ] Representative raw-candidate sample assembled without fabrication
- [ ] Source-origin normalization audited
- [ ] Event clustering manually audited
- [ ] Legacy headline-to-cluster compression measured
- [ ] Legacy 60% signal threshold rejected, retained, or replaced for v2 with evidence
- [ ] Decay and corroboration mappings frozen
- [ ] Signal v2 parallel output implemented

#### Market audit and implementation

- [ ] Own-series/per-channel date and eligibility rule frozen
- [ ] Empirical channel trigger rates measured
- [ ] 2/3/4-instrument threshold asymmetry assessed
- [ ] Empirical percentile rule accepted or rejected with evidence
- [ ] Market breadth and second-driver schema frozen
- [ ] Market/divergence v2 parallel output implemented

#### Validation/cutover

- [ ] Canonical reproducibility test passes
- [ ] Comparison period completed in distinct eligible market closes
- [ ] Disagreement cases reviewed
- [ ] Explicit Methodology 2.0 version stamping implemented
- [ ] Cutover accepted or rejected with documented reasons

### Publishability / safety

- [x] `.env` is local and not tracked
- [x] API keys are not committed
- [x] Secret scan of changed files found no literal API secrets
- [x] `git diff --check` passed, with only CRLF warnings
- [x] Domain work deferred; no `docs/CNAME` created

---

## 6. Decisions Made

Use this section to record project decisions.

| Date | Decision | Reason |
|---|---|---|
| 2026-05-22 | Use Crucix `/api/data` as the input | It is the simplest local data source for the MVP |
| 2026-05-22 | Use a rule-based classifier first | Faster and more explainable than an LLM for a 5-hour build |
| 2026-05-22 | Use `dashboard/public/market-shock.html` | Crucix already serves static dashboard files |
| 2026-05-22 | Avoid buy/sell language | Keeps project credible and not investment advice |
| 2026-05-22 | Build the extractor defensively | `/api/data` has many nested fields and mixed object/array shapes |
| 2026-05-25 | Add text-based deduplication before scoring | Crucix exposes some of the same signals in multiple locations such as `tg.urgent` and `delta.signals.new` |
| 2026-05-25 | Keep Session 2 terminal-only and postpone JSON output to Session 3 | Preserves the planned build sequence and keeps each session focused |
| 2026-05-26 | Generate a dashboard-ready JSON report from the script | Gives Session 4 a clean static data source to render |
| 2026-05-26 | Add score concentration controls | Prevents one repeated geopolitical cluster from making the dashboard feel artificially broad |
| 2026-05-26 | Filter pure market labels and weak location-only rows from dashboard items | Keeps the ranked board focused on event-style market shock signals rather than ticker/data labels |
| 2026-05-27 | Build Session 4 as a dependency-free static HTML dashboard | Keeps the MVP simple, fast, and served directly by the existing Crucix Express static server |
| 2026-05-27 | Use VS Code for large HTML edits instead of long Command Prompt inline commands | Windows Command Prompt is fragile for multiline HTML/JS/CSS creation |
| 2026-06-11 | Phase 2 pivot: add a market column per channel and a divergence classification | Phase 1 puts an estimate next to nothing; the gap between signal and market pricing is the actual content, and it makes the project falsifiable |
| 2026-06-11 | One uniform z-score transform across all channels (5-day return or 5-day level change vs trailing 1-year), channel reading = max abs z with driver named | A per-channel formula or composite would rebuild the discretionary-aggregate problem on the market side of the page |
| 2026-06-11 | Data sources: FRED API + Stooq CSV; no unofficial Yahoo endpoints as primary | Free, official/stable, automatable in CI |
| 2026-06-11 | Freeze divergence thresholds at launch (signal ≥ 60% of channel max; abs z ≥ 1.5) | Retuning thresholds after the fact to make the board interesting destroys the log's credibility |
| 2026-06-11 | Drop "margins" from the supply-chain channel | Quarterly accounting output, not a daily observable; silently proxying it would misrepresent |
| 2026-06-11 | Retire "Market Volatility Signal" as a signal channel | VIX lives on the market side of the board; keeping it as an OSINT channel makes the market diverge from itself |
| 2026-06-11 | Keep the Market Shock Score but demote it visually; decomposition and divergence board lead | The score is the least interesting output; the page layout should say so |
| 2026-06-11 | Frame the project as a daily end-of-day log, not a live radar; every view dated "as of market close" | EOD data presented as live would fail the snapshot-honesty check |
| 2026-06-11 | Dashboard labels stay flatly descriptive; no editorial severity language or implied side on named conflicts/sanctions | The post stays at transmission-mechanism level; the linked artifact must not undermine that |
| 2026-06-11 | Target home: `crucix.divergencelog.com`, second entry under the owned `divergencelog.com` roof; apex stays a plain index | One project under "log" is a landing page wearing the word; two makes the name honest |
| 2026-06-11 | Old Session 7 LinkedIn package (draft, carousel, hashtags, CTA) superseded; post drafted outside ChatGPT sessions against the post strategy file | The old draft conflicts with the governing post strategy (format, hashtags, register, timing) |
| 2026-06-17 | Replace Stooq with Tiingo EOD `adjClose` for ETF proxies in Session 7 | Stooq returned browser-verification HTML and then `Access denied` from Node/`curl`, so it is not reliable for automated local or CI fetches. Tiingo provides keyed EOD ETF data and keeps the project off unofficial Yahoo endpoints as primary. |
| 2026-06-17 | Use Tiingo `adjClose` for ETF price instruments | ETF distributions can create artificial price drops in raw close; adjusted close avoids dividend/split distortions in 5-day return z-scores. |
| 2026-06-17 | Keep gold as `GLD` via Tiingo instead of moving to FRED | The suggested FRED gold series `GOLDAMGBD228NLBM` returned `series does not exist` during API testing. |
| 2026-06-17 | Reject Alpha Vantage for Session 7 ETF history | Compact CSV worked, but full daily history was premium-gated, so it cannot support the required trailing 252-observation window on the free key. |
| 2026-06-17 | Align market transforms on common dates across all instruments | FRED and ETF data have different calendars and some FRED series lag; common-date alignment avoids silently comparing mismatched dates. |
| 2026-06-17 | Add `npm run market:data` | Gives Session 7 a repeatable command for regenerating `dashboard/public/market-readings.json`. |
| 2026-06-19 | Macro / Inflation Shock and Weather / Climate Shock are signal-only for v2 | Session 7 market-readings output contains the five required Phase-2 market channels only. Adding optional market columns now would expand the market-data scope before the divergence board is working. |
| 2026-06-19 | Normalize channel signal scores against the Phase-1 20-point item score ceiling | The Phase-1 item scorer already uses a 20-point max, and the frozen threshold says elevated means 60% of channel max. This makes `>= 12/20` the channel-elevated cutoff and keeps the threshold meaningful without retuning. |
| 2026-06-19 | Include `otherCategories` when aggregating channel signals | Supply Chain Disruption appeared only as a secondary category in the current signal data. Ignoring secondary categories would incorrectly mark that channel quiet. |
| 2026-06-19 | Add `npm run divergence` as a separate script | Keeps the Phase 2 pipeline explicit: `npm run shock`, `npm run market:data`, then `npm run divergence`. |
| 2026-06-23 | Session-start protocol changed: user can start by saying only “Ready for session X”; ChatGPT explains the session, asks for decisions, then gives a Claude work order | Reduces copy/paste and makes the collaboration pattern explicit |
| 2026-06-23 | Use Claude/VS Code for large dashboard edits, with ChatGPT guiding validation one command at a time | Large HTML/CSS/JS edits are easier and safer outside Command Prompt |
| 2026-06-23 | Dashboard v2 keeps signal-only Macro / Inflation and Weather / Climate outside the hero divergence board | The hero board should stay focused on channels with both signal and market readings |
| 2026-06-23 | Dashboard uses relative JSON fetches (`divergence.json`, `market-shock.json`) | Required for GitHub Pages project-path deployment and still works locally |
| 2026-06-23 | GitHub Pages publish target is `docs/`, not `dashboard/public/` | The deployed root served `docs/index.html`; Session 9 v2 files had to be copied into `docs/` |
| 2026-06-23 | Sanitize dashboard output labels such as “Live Updates” to neutral “Updates” in public JSON/display output | The project is an end-of-day log, so live-language feed labels should not appear in public dashboard copy |
| 2026-06-23 | Keep refreshed 2026-06-15 market readings for publication despite source lag | The page honestly states the close date; Brent and WTI FRED series held the common close date back |
| 2026-06-24 | Defer `crucix.divergencelog.com`/domain setup from Session 10 | Keeps Session 10 focused on the log/history machinery and avoids mixing DNS work with automation |
| 2026-06-24 | Do not fabricate historical snapshots | Credibility of the log depends on real dated rows only |
| 2026-06-24 | Keep `docs/` synchronized from the snapshot script | GitHub Pages serves from `docs/`, so generated dashboard outputs must be copied there |
| 2026-06-24 | Compress the final commit/push workflow | Step-by-step is useful for debugging, but routine commit/push finalization should only need the commit message and push instruction once validation is clear |
| 2026-06-26 | GitHub repository secrets must use exact names `FRED_API_KEY` and `TIINGO_API_KEY` | The first manual Action failed because secret names were wrong; recreating them with exact names made the manual "Daily snapshot" Action succeed. |
| 2026-06-26 | CI automation is proven after the successful manual "Daily snapshot" Action | The Action created real files `log/2026-06-18.json` and `docs/log/2026-06-18.json`, and local `git pull` fast-forwarded to commit `0e3a2b7` ("Update CRUCIX daily snapshot"). |
| 2026-06-26 | Market readings must expose freshness status and warnings, not only fail after a hard stale cutoff | Lagging data can be acceptable if visibly dated; it must never be shown as fresh. |
| 2026-06-26 | Market-data, divergence, and snapshot JSON writes should be atomic after validation | A failed or interrupted run should not silently overwrite valid JSON with partial/broken output. |
| 2026-06-26 | README v2 is descriptive documentation for the divergence board, not launch copy | The project README should explain rules, states, thresholds, data sources, dated logs, Crucix attribution, and disclaimers without promotional language. |
| 2026-06-26 | Session 11 screenshot is deferred, not complete | The user intentionally skipped/deferred screenshot capture; do not mark it complete until a later session. |
| 2026-06-26 | Domain work remains deferred | Do not create `docs/CNAME`, change GitHub Pages domain settings, or update the `divergencelog.com` apex outside a dedicated domain session. |
| 2026-06-30 | Keep the global common-date market alignment unchanged for now | The lag is honest and methodologically consistent; changing it would be a methodology change, not a bug fix. |
| 2026-06-30 | Do not start domain setup in Session 12 | The log needs more real dated rows before launch staging. |
| 2026-06-30 | Continue accumulating real CI-created snapshots; no fabricated backfill | The project's credibility depends on real dated rows only. |
| 2026-07-08 | Keep close-date snapshots sparse and keyed by market close date / `asOfClose` | Sparse `log/YYYY-MM-DD.json` files are expected when source alignment has not advanced; fabricating run-date snapshots would misrepresent the market-close data. |
| 2026-07-08 | Add a run manifest for every daily run under `log/runs/` | A separate run log makes each Action run visible without changing the close-date snapshot methodology. |
| 2026-07-08 | Always sync `docs/*.json` from `dashboard/public/*.json` even when a same-close-date snapshot is kept | GitHub Pages serves from `docs/`; same-close-date runs should not leave public JSON stale. |
| 2026-07-08 | Keep methodology version separate from data snapshot IDs | Data snapshots say what data was observed; methodology version says how the board was computed. Same version plus same snapshots should reproduce a bit-identical board. |
| 2026-07-08 | Increment methodology version for source changes, transform/window changes, freshness-threshold recalibration, calendar changes, or proxy promotion | These changes alter interpretation and must be visible to readers and regression checks. |
| 2026-07-08 | Do not blur primary spot data and timely futures proxies | EIA/FRED spot data can remain primary with BNO/USO as supplemental timely reads, or proxies can become primary with spot as lagged confirmation. Quiet swaps are not allowed. |
| 2026-07-08 | Sequence rollout as additive logging first, calibrated freshness next, proxies last | Snapshots and per-channel dating can ship immediately. Freshness badges need fetch-history calibration for `expectedLagBD`; proxies should arrive later as labeled channels. |
| 2026-07-10 | Session 14 is now a combined signal-architecture and market-data audit, not domain staging or routine log accumulation | The apparent geopolitical concentration and market dating/state semantics both need evidence before launch work resumes. |
| 2026-07-10 | Launch/domain/screenshot work is paused until methodology review is complete | Publication should not advance while the methodology may materially change. |
| 2026-07-10 | The Methodology 2.0 scored unit will be an underlying event cluster | Duplicate reporting should contribute corroboration, not severity/count. |
| 2026-07-10 | `Geopolitical` will be a parent facet, not a final leaf event type | The current broad category hides actionable distinctions such as kinetic action, sanctions, mobilization, chokepoints, and policy shocks. |
| 2026-07-10 | Methodology 2.0 will separate event, transmission mechanism, and market observation | Market-channel elevation should require an explicit mechanism rather than keyword proximity alone. |
| 2026-07-10 | Current Phase 2 output continues as the legacy baseline during the audit | Daily automation can keep running while v2 is designed in parallel. |
| 2026-07-10 | Existing snapshots are immutable and will not be recomputed | Historical credibility depends on preserving what was actually generated at the time. |
| 2026-07-10 | FRED and Tiingo remain the current source baseline | The audit should first test dating/transform behavior before changing sources. |
| 2026-07-10 | The uniform price-return/level-change distinction remains the starting point, but global common-date alignment and channel aggregation are under audit | Code confirms the current implementation uses one global common-date window and per-channel max absolute z-score. |
| 2026-07-10 | Methodology 2.0 targets per-instrument/per-channel dating rather than one all-instrument board date | One lagging crude series should not silently date unrelated channels. |
| 2026-07-10 | `priced` is considered too causal for an absolute-z classifier; `co-movement` is the provisional v2 replacement unless direction/timing validation justifies stronger wording | Current states use absolute market movement and do not establish direction, attribution, timing, or causality. |
| 2026-07-10 | No crude ETF proxies are added before the core market audit | Proxy promotion would be a methodology change and must not happen before the dating/transform audit. |
| 2026-07-10 | New thresholds will be frozen only after audit and not tuned for visual interest | Threshold discipline protects the track record from hindsight optimization. |
| 2026-07-10 architecture-review amendment | The first Methodology 2.0 planning work order was executed, committed, and pushed; this amendment builds on it rather than reopening it | Commit `e4ba8fd` established the first v2 plan, and the architecture review refines scope and sequencing. |
| 2026-07-10 architecture-review amendment | Phase 3 expands from Sessions 14-17 to Sessions 14-20 | Stateful signal architecture is materially larger than the deterministic market-data refactor. |
| 2026-07-10 architecture-review amendment | Session 14 is an architecture/audit-protocol gate, while Sessions 15-16 collect evidence | The full manual signal audit and historical market backtest should not be compressed into one planning session. |
| 2026-07-10 architecture-review amendment | Methodology 2.0 will freeze a minimal operational signal core; the full ontology and enrichment fields may move to 2.1 | The first production v2 needs stable identity, mechanisms, lifecycle, source-origin handling, and versioning before broad enrichment. |
| 2026-07-10 architecture-review amendment | Explicit mechanism directness remains in the 2.0 core | A market channel must not elevate without evidence for the transmission path. |
| 2026-07-10 architecture-review amendment | Stable event identity requires persistent state and immutable assignment history | `firstSeen`, novelty, decay, escalation, de-escalation, and cluster continuity cannot be derived from a stateless one-run pipeline. |
| 2026-07-10 architecture-review amendment | Repeated observations update `lastObservedAt`, while decay keys off `lastMaterialChangeAt` | Repeated coverage alone should not defeat decay unless it carries a material change. |
| 2026-07-10 architecture-review amendment | Model-assisted cluster assignments must be persisted before deterministic scoring | Live model output cannot be an unrecorded production dependency if canonical boards must be reproducible. |
| 2026-07-10 architecture-review amendment | Decay, corroboration, source independence, and event-to-channel mappings are methodology parameters | Consequential settings must live in versioned artifacts, not hidden tunables. |
| 2026-07-10 architecture-review amendment | The legacy 60% signal threshold is not inherited automatically by v2 | Cluster-based signal semantics and score distributions differ from the Phase 1 keyword-score scale. |
| 2026-07-10 architecture-review amendment | A point-in-time channel percentile with one common `alpha` is the leading market-threshold candidate, not yet a frozen decision | It may handle instrument-count asymmetry while preserving a uniform methodology, but it needs evidence and no-look-ahead rules. |
| 2026-07-10 architecture-review amendment | Legacy/v2 comparison will evaluate distributions, reproducibility, and disagreement cases rather than demand row-level agreement | Methodology 2.0 is intended to recalibrate the system, not copy legacy rows. |
| 2026-07-10 architecture-review amendment | After-close signals remain pending the next eligible market observation | A signal first seen after close has not had an opportunity to be reflected in that close. |
| 2026-07-10 architecture-review amendment | Legacy automation and immutable snapshots continue unchanged during development | Real close-date and run-level history remains useful, but it does not by itself validate Methodology 2.0. |

---

## 7. Open Questions

Use this section to log unresolved items.

| Question | Session raised | Status | Notes |
|---|---:|---|---|
| Does `/api/data` expose enough text-like signals for reliable scoring? | 1 | Answered for MVP | Yes. Session 2 extracted 133 deduplicated candidates and matched 15 displayed signals. |
| Which data fields are most useful for shock detection? | 1–3 | Partially answered | Sessions 2–3 found useful event-style signals in `tg.urgent`, `news`, and `chokepoints`. Pure `markets`, `bls`, `fred`, `treasury`, and `metals` labels can be noisy unless paired with event text. Continue validating `newsFeed`, `energy`, `defense`, and `gdelt` later. |
| How many items should be displayed in the dashboard: top 10, 15, or 20? | 2–3 | Answered for MVP | Keep top 15 for now. It gives enough signal density for a dashboard without overwhelming the first UI. |
| Should the score penalize one-category concentration? | 2 | Answered for MVP | Yes. Session 3 added a concentration penalty and exposed `concentrationPenalty` and `categoryBreadth` inside `shockScore`. |
| Should Session 4 show the concentration warning visually near the score? | 4 | Answered for MVP | Yes. The dashboard shows the score interpretation and also exposes concentration penalty/category breadth in the shock mix stats. |
| Should the dashboard show all 15 signals, or highlight top 10 with the rest collapsed? | 4 | Answered for MVP | Show all 15. This is simpler and works for the screenshot/demo layout. |
| Should low-confidence high-priority Telegram items be visually de-emphasized? | 4 | Partially answered | Confidence is shown as a visible chip. More advanced filtering can wait until after MVP. |
| Should we include live market prices in the first version? | 6–7 | **Answered 2026-06-11** | Yes — promoted from optional upgrade to the core of Phase 2. EOD data, uniform z-score transform, divergence states. See Design Spec 4b. |
| Should the final code be published as a fork, gist, or local demo only? | 7 | Partially answered | A public GitHub Pages deployment already exists. Confirm repo publishability (no keys committed) in Session 11. Custom domain setup is deferred. |
| Should `session1-api-data.json` be ignored, deleted, or committed as a sample data snapshot? | 5 | Answered | Added to `.gitignore` in Session 5. |
| Can the GitHub Action complete the full Crucix sweep and daily run in CI? | 10 | Answered | Yes. The first manual run failed due to wrong secret names; after recreating secrets as `FRED_API_KEY` and `TIINGO_API_KEY`, the manual "Daily snapshot" Action succeeded and created `log/2026-06-18.json` plus `docs/log/2026-06-18.json`. |
| Market columns for Macro/Inflation and Weather/Climate, or signal-only display for v2? | 8 | Answered | Signal-only for v2. Optional market columns can be revisited after the five-channel divergence board and daily log are working. |
| Signal-only Macro / Inflation and Weather / Climate display | 9 | Answered | They are shown separately below the main divergence board, not in the hero board. |
| `DBC` or `CPER` for broad commodities; `SOXX` or `SMH` for semis? | 7 | Answered | `DBC` and `SOXX` fetched cleanly through Tiingo and were selected. `CPER` and `SMH` remain code fallbacks. |
| How should the board handle FRED series that lag a day (spreads, breakevens)? | 7 | Partially answered | Session 9 exposes the main `readings as of market close` date. Detailed per-instrument lag remains a Session 10/11 hardening item. |
| What does the GitHub Pages copy currently read, given it cannot reach `localhost:3117`? | 7 | Answered | Pages root `/` serves the dashboard and fetches committed static `market-shock.json`. `/market-shock.html` returns 404 on Pages. Future deploys must commit refreshed static JSON files. |
| Should Session 10 automate copying dashboard/public outputs into docs/ after each refresh? | 9 | Answered | Yes. `scripts/daily-snapshot.mjs` syncs generated dashboard outputs and log files into `docs/`. |
| When should the custom domain session happen? | 10 | Deferred | Domain/subdomain setup, `docs/CNAME`, GitHub Pages custom-domain settings, and apex index updates are reserved for a later dedicated session. Session 12 chose log accumulation/public verification instead of domain work. |
| Should Session 12 configure `crucix.divergencelog.com` or wait for more real snapshots first? | 11 | Answered 2026-06-30 | Session 12 chose Option B — log accumulation and public verification. Domain setup remains deferred. |
| When should the deferred Session 11 board screenshot be captured? | 11 | Open | Screenshot was intentionally skipped/deferred by the user. Capture later when the board state and log depth are ready. |
| Will FRED crude lag resolve naturally? | 12 | Open | Monitor Brent `DCOILBRENTEU` and WTI `DCOILWTICO`. As of Session 12, official FRED rows held the global common date at `2026-06-22`. |
| Should the run manifest be exposed in the public history UI? | 13 | Open | Session 13 creates `log/runs/index.json` and `docs/log/runs/index.json`, but the UI still focuses on close-date snapshots. Decide later whether history should show run-level attempts, source lag, and same-close-date keeps. |
| Should crude proxies be supplemental timely reads or primary channel inputs? | 13 | Open | If BNO/USO are added, pick one role explicitly. Supplemental proxy reads do not drive the channel. Promoting a proxy to primary requires a methodology version bump and channel relabel. |
| When is there enough fetch history to calibrate `expectedLagBD` per source? | 13 | Open | Freshness badges based on expected business-day lag should run in shadow or with conservative thresholds until there are a few weeks of fetch history per source. |
| Does geopolitics still dominate after event clustering and source normalization? | 14 | Open / audit required | Session 14 must compare raw headline share with unique event-cluster share and source-normalized share. |
| What is the smallest useful final leaf taxonomy? | 14 | Open / audit required | `Geopolitical` should become a parent facet, but the final leaf list must stay small enough to be usable. |
| Are sufficient historical raw candidates available for a representative audit? | 14 | Open / audit required | If raw candidates were not persisted, record the limitation and make persistence a v2 requirement. |
| Should raw candidate/input snapshots or hashes be persisted for reproducibility? | 14 | Open / audit required | Same methodology plus same inputs should be reproducible; the audit must decide whether current artifacts are enough. |
| Should the market primary statistic remain max absolute z-score, or remain only with breadth/corroboration metadata? | 14 | Open / audit required | The current driver rule is simple but gives channels with more instruments more crossing opportunities. |
| Should the v2 market threshold vary by instrument count, use an empirical channel percentile, or remain uniform under another calibrated rule? | 14 | Open / audit required | Current `abs(z) >= 1.5` threshold is uniform across channels with different instrument counts. |
| What exact per-instrument/per-channel date rule should replace global alignment? | 14 | Open / audit required | Options include own-series latest date, per-channel common date, or another documented rule. |
| Should directional consistency be descriptive only or later affect classification? | 14 | Open / audit required | Direction diagnostics should be keyed to explicit transmission mechanisms and validated before gating states. |
| Should Macro/Inflation and Weather/Climate receive market columns in Methodology 2.0? | 14 | Open / audit required | They are signal-only in the legacy baseline. |
| What parallel-run namespace should be used before cutover? | 14 | Open / audit required | v2 validation output must not overwrite legacy daily snapshots. |
| What exact minimal leaf set is sufficient for Methodology 2.0 and the five current market channels? | 14 architecture amendment | Open / architecture gate | Avoid forcing the full 16-leaf ontology into the first v2 cutover. |
| What registry format and path best balance atomic updates, reviewability, and repository growth? | 14 architecture amendment | Open / architecture gate | Candidate paths include `state/events/registry.json`, but no registry is implemented yet. |
| What raw-candidate retention period is feasible? | 14 architecture amendment | Open / architecture gate | Retention must support auditability without uncontrolled repository growth. |
| How are parent crises/campaigns separated from specific event episodes? | 14 architecture amendment | Open / architecture gate | A parent-series/event-episode hierarchy should prevent both immortal mega-clusters and excessive fragmentation. |
| What deterministic merge/split/alias rules are acceptable? | 14 architecture amendment | Open / architecture gate | The rules must preserve immutable historical assignments. |
| Is deterministic clustering adequate, or is model assistance required? | 14 architecture amendment | Open / architecture gate | Deterministic clustering is reproducible but may be semantically limited. |
| If model assistance is used, what review and assignment-freeze process applies? | 14 architecture amendment | Open / architecture gate | Model-proposed assignments must be persisted before deterministic scoring. |
| What exact decay clock and function should be frozen? | 14 architecture amendment | Open / architecture gate | The architecture target distinguishes `lastObservedAt` from `lastMaterialChangeAt`. |
| What corroboration-to-confidence mapping should be frozen? | 14 architecture amendment | Open / architecture gate | Corroboration should measure reporting-origin independence, not repeated publication. |
| What constitutes an independent reporting origin in ambiguous syndication cases? | 14 architecture amendment | Open / architecture gate | Domain/outlet counts can overstate independence. |
| Should Methodology 2.0 use a scalar signal score or a structural elevation gate? | 14 architecture amendment | Open / architecture gate | The legacy 60% keyword-score threshold is not portable by default. |
| What common `alpha`, lookback, and minimum sample should be tested for channel percentiles? | 14 architecture amendment | Open / market audit | The percentile rule is a candidate, not a frozen threshold. |
| How should percentile history be conditioned when the eligible instrument set changes? | 14 architecture amendment | Open / market audit | Instrument-set versioning and stale/ineligible handling affect base rates. |
| What maximum date gap is allowed within one channel? | 14 architecture amendment | Open / market audit | The v2 dating rule should avoid both global-board lag and unexplained mixed-date statistics. |
| How many distinct eligible market closes are required for parallel validation? | 14 architecture amendment | Open / validation gate | The comparison period should not be defined only in calendar days. |
| Which canonical fields are excluded from bit-identical reproduction because they are volatile metadata? | 14 architecture amendment | Open / reproducibility gate | `generatedAt` may be volatile even when the normalized board payload is reproducible. |

---

## 8. Issues / Bugs

Use this section to track problems.

| Issue | Session found | Severity | Status | Fix / workaround |
|---|---:|---|---|---|
| Initial saved `/api/data` file contained two concatenated JSON responses | 1 | Low | Fixed | Re-saved cleanly with `curl -s http://localhost:3117/api/data -o session1-api-data.json` |
| 2 of 29 Crucix sources failed during initial sweep | 1 | Low | Accepted for MVP | Continue with available data; optional API keys or source fixes can be handled later |
| First `market-shock-radar.mjs` run failed with `fetch failed` | 2 | Low | Fixed | Start Crucix with `npm run dev` before running the market shock script |
| Duplicate signals appeared through both `tg.urgent` and `delta.signals.new` | 2 | Medium | Fixed for MVP | Added canonical text deduplication before pushing candidates |
| Preview score reached `20/20` from mostly geopolitical signals | 2 | Low | Fixed for MVP | Session 3 added concentration controls and recalibrated scoring. Final run produced `16/20`, still `Shock mode`, but less artificially maxed out. |
| Pure market/data labels appeared as event signals | 3 | Medium | Fixed for MVP | Filtered short `markets`, `bls`, `fred`, `treasury`, and `metals` rows unless they contain event-like text. |
| SDR receiver/location labels appeared as geopolitical signals because of Taiwan keyword matches | 3 | Medium | Fixed for MVP | Added filter to exclude `root.sdr` rows from dashboard-ready signals. |
| Long `node -e` command failed when trying to create multiline HTML from Command Prompt | 4 | Low | Fixed | Switched to editing `dashboard/public/market-shock.html` in VS Code and saved the file directly. |
| Command Prompt displayed the arrow character as `ΓåÆ` in `findstr` output | 4 | Low | Accepted | Browser rendering looked correct; this is a Windows console encoding display issue, not a dashboard blocker. |
| Crucix server was not running during first dashboard HTTP check | 4 | Low | Fixed | Started the dev server with `npm run dev` in a second Command Prompt. |
| `FRED_API_KEY` existed but was blank | 7 | Medium | Fixed | Requested a FRED API key and stored it locally in `.env`; confirmed `DCOILBRENTEU` fetch returned data. |
| Stooq CSV returned browser-verification HTML / `Access denied` | 7 | High | Replaced | Switched ETF proxy source to Tiingo EOD `adjClose`; log this as an implementation-forced source change. |
| Alpha Vantage compact CSV worked but full history was premium-gated | 7 | Medium | Rejected | Not enough free history for 252-observation trailing z-score window; do not use for Session 7. |
| Suggested FRED gold series `GOLDAMGBD228NLBM` returned `series does not exist` | 7 | Medium | Rejected | Keep `GLD` as gold proxy via Tiingo `adjClose`. |
| Broken inline Command Prompt command created stray file `{console.error(e.message)` | 7 | Low | Fixed | Deleted the stray file and confirmed only intended Session 7 files remain. |
| No `priced` row appeared in the live Session 8 data | 8 | Low | Accepted | Classifier self-test confirms all four states are reachable. Live data produced `radar-claim`, `radar-miss`, and `calm`; future snapshots may naturally produce `priced`. |
| GitHub Pages root still served old dashboard after Session 9 first push | 9 | Medium | Fixed | Pages serves from `docs/`, while Dashboard v2 was first edited only in `dashboard/public/`. Fixed by copying v2 HTML and refreshed JSON files into `docs/`. |
| Absolute fetch paths broke on GitHub Pages project URL | 9 | Medium | Fixed | Replaced absolute `/divergence.json` and `/market-shock.json` fetches with relative `divergence.json` and `market-shock.json`. |
| Public JSON contained source-feed wording “Live Updates” | 9 | Low | Fixed | Added dashboard-output sanitization so feed-format labels are neutralized before public JSON/display output. |
| FRED Brent and WTI held the common market close date at 2026-06-15 | 9 | Medium | Accepted / log for hardening | Market script correctly aligned all instruments on common dates. Dashboard honestly displays `readings as of market close, 2026-06-15`. Revisit stale-data handling in Session 10/11. |
| `npm run daily` failed locally when Crucix was not running / `/api/data` was unavailable | 10 | Low / expected | Documented | Start Crucix locally before local daily run, or use the fallback protocol in `docs/daily-run-protocol.md`. |
| First manual GitHub Action "Daily snapshot" run failed | 11 | Medium | Fixed | Repository secret names were wrong. Recreated secrets with exact names `FRED_API_KEY` and `TIINGO_API_KEY`; the next manual Action run succeeded. |
| Market readings can be lagging because common-date alignment is held back by lagging sources | 11–12 | Medium | Mitigated / expected | Session 11 added freshness metadata and visible warnings. Session 12 confirmed the latest public warning is expected source lag: generated `2026-06-30`, readings as of market close `2026-06-22`, `8` calendar days old. Official FRED crude rows checked: `DCOILBRENTEU` latest `2026-06-22,76.49`; `DCOILWTICO` latest `2026-06-22,78.94`. |
| Missing market-data keys or failed source fetches could previously be unclear or risk partial output | 11 | Medium | Fixed | Missing/blank keys and non-JSON/source failures now fail loudly; JSON writes are validated and atomic. |
| Session 11 screenshot not captured | 11 | Low | Deferred | User intentionally skipped/deferred screenshot capture. Do not mark complete until a later session. |
| Local checkout was behind public `origin/master` by three Action-created commits | 12 | Low | Fixed | `git pull --ff-only` fast-forwarded local `master` from `f5fbde2` to `9fc3bad`; local repo now matches `origin/master`. |
| Git warning: unable to access `C:\Users\heyke/.config/git/ignore` | 12 | Low | Accepted | Warning appeared during `git status --short` but did not block verification or indicate project-file changes. |
| Same-close-date runs could leave public `docs/*.json` stale | 13 | Medium | Fixed | `scripts/daily-snapshot.mjs` no longer returns early before docs sync when an existing close-date snapshot is kept. Session 13 added run-level logging and verified `docs/divergence.json`, `docs/market-readings.json`, and `docs/market-shock.json` match their `dashboard/public` sources after a same-close-date keep. |
| Canonical text deduplication does not merge differently worded reports of the same event | 14 | Medium | Open / audit required | `scripts/market-shock-radar.mjs` canonicalizes text and removes exact/canonical duplicates, but it does not perform semantic event clustering. |
| Broad `Geopolitical Escalation` classification hides actionable distinctions | 14 | Medium | Open / audit required | Current generated `market-shock.json` is concentrated in `Geopolitical Escalation`, but that category mixes different event types and mechanisms. |
| One item can influence multiple channels through primary and `otherCategories` without separately proven transmission mechanisms | 14 | Medium | Open / audit required | `scripts/divergence.mjs` aggregates both primary category and `otherCategories`; current artifacts show secondary assignments influencing channel scores. |
| Repeated coverage can inflate signal counts and aggregate scores | 14 | Medium | Open / audit required | Repeated reports of one underlying event are not clustered before scoring. |
| `priced` is based on absolute movement and does not establish expected direction, timing, attribution, or causality | 14 | Medium | Open / audit required | The divergence classifier uses `abs_market_z >= 1.5`; it does not validate sign or event timing. |
| Global all-instrument common-date alignment lets lagging crude hold back unrelated channels | 14 | Medium | Open / audit required | `scripts/market-data.mjs` intersects every instrument date set and uses one `globalAsOfClose` for all channels. |
| A five-observation move on the global intersection may span a different calendar interval than five valid observations on an instrument's own series | 14 | Medium | Open / audit required | Current formulas use `commonDates[index - LOOKBACK_OBSERVATIONS]`, not each instrument's own valid observation calendar. |
| Max absolute z-score gives channels with more instruments more chances to cross the market-moving threshold | 14 | Medium | Open / audit required | The current channel driver is the largest absolute z-score among eligible instruments, with no adjustment for instrument count. |
| Raw market inputs may not currently be persisted strongly enough for bit-identical historical reproduction | 14 | Medium | Open / audit required | Generated artifacts store transformed readings and metadata, but the audit must decide whether raw inputs or input hashes are required. |
| Methodology 2.0 planning previously under-budgeted the stateful signal rebuild | 14 architecture amendment | Medium | Open / audit required | The first plan compressed architecture, audit, signal implementation, market implementation, and cutover into too few sessions. |
| No persistent cross-run event registry is documented as implemented | 14 architecture amendment | High | Open / audit required | Repository inspection found no `state/events/registry.json` or equivalent persistent event-state artifact. |
| Without `lastObservedAt` versus `lastMaterialChangeAt`, repeated coverage could defeat decay | 14 architecture amendment | Medium | Open / audit required | Decay should key off material changes, not merely another article appearing. |
| Merge/split behavior can silently rewrite history unless assignments remain immutable | 14 architecture amendment | Medium | Open / audit required | Candidate-to-cluster assignments need append-only provenance and lineage rules. |
| Live model-assisted clustering would break reproduction if assignments are not persisted | 14 architecture amendment | High | Open / audit required | Production scoring must consume recorded assignments rather than a drifting model response. |
| Absent optional fields are ambiguous without explicit assessment status | 14 architecture amendment | Medium | Open / audit required | Missing data must distinguish unassessed, unknown, not-applicable, and assessed values. |
| The full proposed taxonomy may create implementation scope before the minimum channel mapping is validated | 14 architecture amendment | Medium | Open / audit required | Methodology 2.0 should freeze a small operational core before expanding to Methodology 2.1 ontology enrichment. |
| Decay and corroboration mappings are hidden tunables until versioned | 14 architecture amendment | Medium | Open / audit required | Consequential signal parameters need a methodology parameter register. |
| Simple outlet/domain counts overstate independent corroboration under syndication | 14 architecture amendment | Medium | Open / audit required | Source independence must be based on reporting origin, not repeated publication copies. |
| The legacy 60% signal threshold is tied to the Phase 1 keyword-score scale and is not portable to event clusters | 14 architecture amendment | Medium | Open / audit required | V2 may need a structural elevation gate or newly calibrated score. |
| Raw max absolute z-score threshold produces structurally different trigger opportunities for channels with 2, 3, and 4 instruments | 14 architecture amendment | Medium | Open / audit required | Independence sanity checks show crossing probability rises with instrument count before correlation is measured. |
| A percentile threshold can introduce look-ahead or regime drift unless its history and fallback rules are frozen | 14 architecture amendment | Medium | Open / audit required | Rolling/expanding history, minimum sample, instrument eligibility, and fallback rules must be specified before adoption. |
| Signals observed after close can be misclassified against a market observation that preceded them | 14 architecture amendment | Medium | Open / audit required | After-close signals should remain pending until the next eligible market observation. |
| Expecting row-level agreement in the parallel run would misdiagnose intended recalibration as a bug | 14 architecture amendment | Low | Open / audit required | V2 success should be based on auditability, reproducibility, sensible base rates, lifecycle stability, and documented disagreements. |

---

## 9. Next Session Adjustments

Use this section to change the plan based on what happened.

| After session | Adjustment | Reason |
|---:|---|---|
| 1 | Start Session 2 with a defensive JSON extractor focused first on `news` and `newsFeed`, then add structured fields | `/api/data` works and contains mixed array/object structures |
| 2 | Extend the script to generate `dashboard/public/market-shock.json` and tune score calibration | Session 2 has terminal scoring working; Session 3 should produce dashboard-ready JSON |
| 3 | Build the dashboard from `dashboard/public/market-shock.json` and keep scoring details visible enough to explain the regime | JSON output now works and Session 4 can focus on UI rather than data generation |
| 4 | Package the project and make the run flow clean with `npm run shock`, README, and commit-ready file review | The dashboard now works; next value is making the project understandable and shareable |
| 5 | Test the full flow end-to-end, refresh JSON, capture screenshot, and prepare demo assets | Packaging is complete and the project is ready for validation/media capture |
| 6 | ~~Finalize the LinkedIn launch package~~ → Superseded. Begin Phase 2 at Session 7 (market data fetcher) per the Design Spec | 2026-06-11 pivot: the project needs the market column, divergence states, and daily log before it is worth posting |
| 7 | Build `scripts/divergence.mjs` from `market-shock.json` + `market-readings.json`; use frozen thresholds and write `dashboard/public/divergence.json` | Session 7 now provides market readings per channel with aligned dates, z-scores, and driver instruments. Session 8 can join this with signal-side scores. |
| 8 | Rework `market-shock.html` around `divergence.json`: divergence board first, Shock Mix prominent, score demoted, dated EOD framing visible | Session 8 now produces validated divergence rows with frozen thresholds and state labels. Session 9 can focus on UI and framing rather than classification logic. |
| 9 | Session 10 must include `docs/` publishing in the daily-log flow and decide whether to automate copying generated files from `dashboard/public/` to `docs/` | GitHub Pages serves from `docs/`; refreshed JSON in `dashboard/public/` alone does not update the public site. |
| 9 | Session 10 should treat source lag as a visible history/log issue, not a dashboard bug | FRED Brent/WTI lag made the common close date 2026-06-15; the page was honest, but history automation should track this cleanly. |
| 10 | Session 11 should first add GitHub repository secrets `FRED_API_KEY` and `TIINGO_API_KEY`, manually run the Daily snapshot Action once, then harden stale-data behavior, update README v2, and keep custom domain setup as a separate future session | Session 10 shipped the log machinery, but the secrets/manual Action verification was not completed and CI automation is not proven until that run succeeds. |
| 11 | Session 12 can be either "Domain and launch staging" or "Log accumulation and public verification" | CI is proven and reliability/docs are hardened. The next choice is whether to configure `crucix.divergencelog.com` now or wait for more real snapshots before domain work. |
| 11 | Keep screenshot capture as a later launch-support task | Screenshot was intentionally skipped/deferred by the user in Session 11. |
| 11 | Do not fabricate extra snapshots | The log now has two real snapshots; credibility depends on continuing to accumulate only real dated outputs. |
| 12 | Session 13 should continue log accumulation/public verification unless there are enough real snapshots to justify domain staging | Public flow is healthy, but the launch condition still wants roughly two weeks of dated rows. |
| 12 | Monitor whether FRED crude data catches up before changing methodology | Brent/WTI are holding the global common-date alignment at `2026-06-22`; this is expected source lag, not a pipeline bug. |
| 12 | Keep the board screenshot as a pre-publication task | Screenshot remains deferred and should be captured when the board/log depth are launch-ready. |
| 13 | After commit/push, verify the next GitHub Action writes a run record and syncs public docs | The Session 13 fix passed locally; the next scheduled Action should prove it in CI and on GitHub Pages. |
| 13 | Before adding freshness badges, define methodology version stamping and a one-line changelog | Versioning must be visible on every published dashboard and separate from data snapshot IDs. |
| 13 | Ship per-channel dating and run/snapshot visibility before calibrated freshness badges | These are additive and do not require `expectedLagBD` calibration. |
| 13 | Run freshness thresholds in shadow or conservatively until source lag history is calibrated | Delayed/stale badges need a few weeks of fetch history per source before `expectedLagBD` has meaning. |
| 13 | Add crude proxies only after freshness calibration, and only as explicitly labeled channels or supplemental reads | Avoid ambiguity about which number drives the channel. Proxy promotion is a methodology version bump and relabel. |
| 13 | Keep domain setup deferred | `crucix.divergencelog.com` remains a dedicated later session; do not mix DNS/Pages custom-domain work into the run-log verification. |
| 13 | Keep the board screenshot as a required launch-support task | Screenshot remains needed and should be captured when the board/log depth are publication-ready. |
| 13 | Session 14 replaces the previous likely domain/log-accumulation direction with the combined methodology audit | The signal concentration and market-data semantics both need evidence before launch work resumes. |
| 13 | Gate 0 is to finish/verify Session 13 commit-push-CI status without mixing in methodology changes | Baseline housekeeping should stay separate from Methodology 2.0 design. |
| 13 | Production v1 continues daily during the audit | The legacy baseline remains useful as long as it is clearly labeled and unchanged. |
| 13 | No proxies, source swaps, threshold changes, dashboard redesign, or history rewrite occur before the audit report | These would be methodology or publication changes and must wait for evidence. |
| 13 | Sessions 15-17 are provisional and must be amended from the evidence | The Session 14 audit can change the rebuild sequence. |
| 13 architecture review | Use Session 14 to freeze architecture and audit protocols before asking Codex to build audit datasets or production code | The persistent signal system has state, provenance, and reproducibility questions that must be settled first. |
| 13 architecture review | Do not attempt the complete signal and market audit in Session 14 | Session 14 is limited to architecture decisions and executable protocols. |
| 13 architecture review | Sessions 15 and 16 are evidence sessions | Session 15 handles signal sampling/clustering measurement; Session 16 handles market dating, eligibility, and threshold measurement. |
| 13 architecture review | Session 17 is the methodology-freeze gate | Core schema, lifecycle rules, mappings, parameters, migration contracts, and tests should freeze only after evidence. |
| 13 architecture review | Only Sessions 18-19 implement parallel v2 outputs | Implementation should follow the frozen specification rather than inventing architecture during coding. |
| 13 architecture review | Session 20 decides migration/cutover | Cutover depends on parallel-run review, lifecycle behavior, reproducibility, and documented disagreement cases. |
| 13 architecture review | Keep legacy automation running so real close-date and run-level history continues accumulating | The legacy baseline remains useful during the pause, even though it does not validate Methodology 2.0. |
| 13 architecture review | Do not add proxies, retune legacy thresholds, change public state names, or alter old snapshots during this phase | Legacy output and historical records must remain stable while v2 is designed and tested. |
---

## 10. Backlog / Optional Upgrades

Only do these after Phase 2 works.

- [x] ~~Add live price snapshots beside asset channels~~ → promoted into Phase 2 core (Sessions 7–8), as EOD readings, not "live"
- [x] ~~Add historical score archive~~ → promoted into Phase 2 core (Session 10), as the dated divergence log
- [ ] Add chart links for the driver instruments
- [ ] Add a daily generated summary
- [ ] Add export to Markdown
- [ ] Add source-level filtering
- [ ] Add severity tags such as `localized`, `regional`, `global` (must respect the descriptive-labels rule — Design Spec 4b.6)
- [ ] Add LLM-generated explanation as an optional layer (same discipline as the World Cup project: the language model narrates, it never produces the readings or the states)
- [ ] Add a small `Why now?` section
- [ ] Add source weighting so direct OSINT, chokepoints, and market data can be weighted differently from generic headlines
- [ ] Add semantic event clustering
- [ ] Persist raw candidate records or input hashes for audit/reproducibility
- [ ] Add market breadth and second-driver display
- [ ] Add direction-consistency diagnostics
- [ ] Add input hashing/raw-input archival for reproducibility
- [ ] Add a parallel methodology comparison page
- [ ] Add post-cutover track-record evaluation by methodology version
- [ ] Add parent-series/event-episode browser
- [ ] Add cluster merge/split review tooling
- [ ] Add human correction audit trail
- [ ] Add source-origin/syndication resolver
- [ ] Add canonical raw-candidate archive and content hashes
- [ ] Add model-assisted clustering review queue
- [ ] Add channel empirical-base-rate display
- [ ] Add percentile-history diagnostics
- [ ] Add pending-after-close state display
- [ ] Add methodology-version comparison page
- [ ] Add Methodology 2.1 ontology/enrichment expansion
- [ ] After 30–40 days of log rows: compute and display the track record — how often `radar-claim` preceded a market move within N days, and how often it did not

---

## 11. Session Update Template

At the end of every session, paste a short update here or ask ChatGPT to generate one.

```md
## Update — Session X — YYYY-MM-DD

### Completed

- 

### Changed files

- 

### Results

- 

### Issues

- 

### Decisions

- 

### Open questions

- 

### Next session focus

- 
```

## Update — Session 1 — 2026-05-22

### Completed

- Installed and confirmed Node.js v24.16.0
- Cloned Crucix into `D:\WinProjects\CRUCIX`
- Confirmed `package.json` exists
- Installed dependencies with `npm install`
- Created `.env` from `.env.example`
- Started Crucix with `npm run dev`
- Confirmed the local server at `http://localhost:3117`
- Confirmed `/api/health`
- Confirmed `/api/data`
- Saved `/api/data` locally as `session1-api-data.json`
- Inspected top-level JSON fields

### Changed files

- `.env`
- `package-lock.json` may have been created or updated by `npm install`
- `node_modules/`
- `session1-api-data.json`

### Results

- Crucix initial sweep completed successfully
- 27/29 sources returned data
- `/api/data` contains usable fields for the Market Shock Radar, especially `news`, `newsFeed`, `chokepoints`, `nuke`, `nukeSignals`, `defense`, `air`, `energy`, `markets`, `treasury`, `metals`, and `gdelt`

### Issues

- First saved API data file contained two concatenated JSON responses, causing `JSON.parse` to fail
- Fixed by re-saving with `curl -s http://localhost:3117/api/data -o session1-api-data.json`
- 2 of 29 sources failed, but this does not block the MVP

### Decisions

- Continue with the local Crucix `/api/data` endpoint
- Do not troubleshoot the 2 failed sources during Session 1
- Build the Session 2 extractor defensively because the API shape includes mixed nested arrays and objects

### Open questions

- Which specific fields inside `news` and `newsFeed` are best for signal scoring?
- How much should structured data like `air`, `chokepoints`, `nuke`, and `markets` influence the Market Shock Score?

### Next session focus

- Create `scripts/market-shock-radar.mjs`
- Fetch live data from `http://localhost:3117/api/data`
- Extract candidate text from `news`, `newsFeed`, and structured fields
- Add first rule-based shock-category scoring

---

## Update — Session 2 — 2026-05-25

### Completed

- Created the `scripts` folder
- Created `scripts/market-shock-radar.mjs`
- Added eight market-shock categories
- Added keyword-based category matching
- Added defensive text extraction from nested Crucix JSON
- Added confidence scoring
- Added terminal output for ranked matched signals
- Added canonical text deduplication to reduce repeated signals

### Changed files

- `scripts/market-shock-radar.mjs`

### Results

- First successful run extracted 221 candidates and matched 15 displayed signals
- After deduplication, the script extracted 133 candidates and matched 15 displayed signals
- Latest terminal preview produced `20/20` and `Shock mode`
- Top signals were mostly Geopolitical Escalation, with some Energy Shock and chokepoint-related signals

### Issues

- First run failed because Crucix was not running
- Fixed by starting the server with `npm run dev`
- Duplicate signals appeared from `delta.signals.new`
- Fixed for MVP with canonical text deduplication
- Score may currently be too sensitive to one dominant geopolitical cluster

### Decisions

- Keep the first classifier rule-based and explainable
- Keep output terminal-only for Session 2
- Move JSON output and score calibration to Session 3

### Open questions

- Should the final shock score penalize category concentration?
- Should source paths such as `tg.urgent`, `news`, `chokepoints`, and `markets` receive different weights?
- How many items should be displayed in the dashboard: top 10, 15, or 20?

### Next session focus

- Generate `dashboard/public/market-shock.json`
- Add `generatedAt`, `shockScore`, `shockCounts`, `itemCount`, and `items`
- Validate JSON in the browser
- Tune score calibration so output feels credible for a LinkedIn demo

---


## Update — Session 3 — 2026-05-26

### Completed

- Extended `scripts/market-shock-radar.mjs` to generate `dashboard/public/market-shock.json`
- Added `generatedAt`, `shockScore`, `shockCounts`, `candidateCount`, `itemCount`, and ranked `items`
- Added `sourcePriority` to each scored item
- Added category concentration logic to moderate the Market Shock Score
- Added dashboard-readiness filtering to remove pure ticker/data labels and SDR location false positives
- Validated that `http://localhost:3117/market-shock.json` opens in the browser
- Confirmed final Session 3 output: 128 extracted candidates, 15 matched dashboard signals, score `16/20`, regime `Shock mode`

### Changed files

- `scripts/market-shock-radar.mjs`
- `dashboard/public/market-shock.json`

### Results

- JSON generation works
- Final shock counts: `Geopolitical Escalation: 14`, `Energy Shock: 1`
- Final score: `16/20`
- Final regime: `Shock mode`
- Interpretation includes a concentration note because most signals are geopolitical

### Issues

- Initial Session 3 output still scored `20/20`, which felt too aggressive
- Pure labels such as `WTI Crude`, `Brent Crude`, and `CPI-U Core (ex Food & Energy)` appeared as signals before filtering
- SDR receiver rows mentioning Taiwan appeared as geopolitical false positives before filtering

### Decisions

- Keep top 15 items for the dashboard MVP
- Keep the `Shock mode` regime because current signals are severe, but moderate the score below `20/20`
- Filter dashboard items so the UI prioritizes event-style signals over static market labels

### Open questions

- Should Session 4 show the concentration warning visually near the score?
- Should the dashboard show all 15 signals, or highlight top 10 with the rest collapsed?
- Should low-confidence high-priority Telegram items be visually de-emphasized?

### Next session focus

- Create `dashboard/public/market-shock.html`
- Fetch `/market-shock.json`
- Build a polished dashboard for screenshot/demo use
- Show score, regime, shock counts, ranked signal cards, channels, keywords, and disclaimer

---

## Update — Session 4 — 2026-05-27

## Update — Session 7 — 2026-06-17

### Completed

- Confirmed working tree was clean at session start
- Verified GitHub Pages root serves the dashboard and reads committed static `market-shock.json`
- Confirmed `/market-shock.html` returns 404 on GitHub Pages
- Added FRED API key locally in `.env`
- Confirmed one FRED fetch works with `DCOILBRENTEU`
- Tested Stooq and rejected it for automation because it returned browser verification / `Access denied`
- Tested Alpha Vantage and rejected it because full daily history was premium-gated
- Added Tiingo API key locally in `.env`
- Confirmed Tiingo EOD fetch works with `GLD` and returns full history plus `adjClose`
- Created `scripts/market-data.mjs`
- Added `npm run market:data`
- Generated `dashboard/public/market-readings.json`
- Deleted temporary test scripts and stray broken-command file
- Confirmed `.env` is not tracked and no actual API keys appear in tracked files

### Changed files

- `scripts/market-data.mjs`
- `dashboard/public/market-readings.json`
- `package.json`

### Results

- `npm run market:data` succeeded
- `asOfClose`: `2026-06-08`
- Common usable dates: `596`
- Selected proxies: `GLD`, `DBC`, `SOXX`
- Channel readings:
  - Conflict escalation: `-1.127σ`, driver `GLD`
  - Sanctions / policy: `-2.618σ`, driver `EEM`
  - Energy disruption: `-1.332σ`, driver `T10YIE`
  - Credit stress: `1.074σ`, driver `DGS10`
  - Supply chain: `-0.476σ`, driver `SOXX`

### Issues

- Stooq was not usable from Node or `curl`
- Alpha Vantage full history was premium-gated
- Suggested FRED gold series did not exist
- Windows Command Prompt inline quoting remained fragile for complex Node commands

### Decisions

- Use FRED for official macro/market series
- Use Tiingo EOD `adjClose` for ETF proxies
- Keep gold as `GLD` via Tiingo
- Use common-date alignment across all instruments
- Add `npm run market:data`

### Open questions

- Session 8 still needs to decide Macro/Inflation and Weather/Climate signal-only vs. optional market columns
- Session 9 should decide how much per-instrument `asOf` / lag detail to expose in the UI

### Next session focus

- Create `scripts/divergence.mjs`
- Join signal-side categories from `market-shock.json` to market channels from `market-readings.json`
- Apply frozen thresholds: signal elevated at `>= 60%` of channel max and market moving at `abs(z) >= 1.5`
- Write `dashboard/public/divergence.json`

### Completed

- Created `dashboard/public/market-shock.html`
- Built a polished static dashboard served by Crucix
- Added browser fetch for `/market-shock.json`
- Rendered Market Shock Score, regime, interpretation, generated timestamp, shock counts, top category, candidate count, category breadth, concentration penalty, and max score
- Rendered ranked signal cards with category, confidence, score, source priority, asset-channel chips, matched keyword chips, and explanations
- Added disclaimer footer
- Confirmed `http://localhost:3117/market-shock.html` returns `HTTP/1.1 200 OK`
- Opened the dashboard in the browser and confirmed it shows the expected `16/20` score and signal board
- Checked narrow responsive layout and confirmed it stacks cleanly

### Changed files

- `dashboard/public/market-shock.html`

### Results

- Session 4 dashboard is complete
- Dashboard is good enough for a LinkedIn screenshot/demo
- Latest repo status shows:
  - `?? dashboard/public/market-shock.html`
  - `?? session1-api-data.json`

### Issues

- Long inline Command Prompt file creation failed for multiline HTML
- Fixed by opening and saving the HTML file in VS Code
- Crucix dev server was initially not running during the page test
- Fixed by starting `npm run dev` in a second Command Prompt
- Windows Command Prompt displayed the arrow character incorrectly during `findstr`, but the browser page looked correct

### Decisions

- Keep the dashboard dependency-free: plain HTML, CSS, and JavaScript
- Use the existing static server path under `dashboard/public`
- Show all 15 ranked signals for the MVP
- Keep score concentration details visible as stats

### Open questions

- Should `session1-api-data.json` be ignored, deleted, or committed as a sample data snapshot?
- Should the README include a screenshot placeholder path?
- Should the project be shared as local demo only, fork commit, or gist?

### Next session focus

- Add `npm run shock`
- Create `README-market-shock-radar.md`
- Add run instructions and transmission matrix
- Add disclaimer and project pitch
- Review what should and should not be committed

---

## Update — Session 8 — 2026-06-19

### Completed

- Confirmed clean working tree at session start
- Inspected `market-shock.json` signal categories and scores
- Inspected `market-readings.json` market channel readings
- Decided Macro / Inflation Shock and Weather / Climate Shock are signal-only for v2
- Created `scripts/divergence.mjs`
- Included primary and secondary signal categories in channel aggregation
- Retired `Market Volatility Signal` as a signal channel
- Applied frozen thresholds from the Phase 2 spec
- Classified channels into `radar-claim`, `priced`, `radar-miss`, and `calm`
- Generated and validated `dashboard/public/divergence.json`
- Added and verified `npm run divergence`

### Changed files

- `scripts/divergence.mjs`
- `dashboard/public/divergence.json`
- `package.json`

### Results

- Self-test passed: all four divergence states are reachable
- `npm run divergence` succeeded
- Snapshot date: `2026-06-08`
- State counts: `radar-claim: 3`, `radar-miss: 1`, `calm: 1`
- Conflict escalation: `radar-claim`, signal `95%`, market `-1.127σ`, driver `GLD`
- Sanctions / policy: `radar-miss`, signal `0%`, market `-2.618σ`, driver `EEM`
- Energy disruption: `radar-claim`, signal `85%`, market `-1.332σ`, driver `T10YIE`
- Credit stress: `calm`, signal `0%`, market `1.074σ`, driver `DGS10`
- Supply chain: `radar-claim`, signal `95%`, market `-0.476σ`, driver `SOXX`

### Issues

- No blocking issues
- No live `priced` row in this snapshot, but classifier self-test confirms the state is reachable

### Decisions

- Macro / Inflation and Weather / Climate are signal-only for v2
- `Market Volatility Signal` remains retired as a signal channel
- Use the Phase-1 20-point item score ceiling as the channel max for signal normalization
- Include `otherCategories` in channel aggregation

### Open questions

- Session 9 should decide whether signal-only rows appear in the main board or a smaller supporting section
- Session 9 should decide how much market-data lag detail to expose in the UI

### Next session focus

- Rework `dashboard/public/market-shock.html` into Dashboard v2
- Make the divergence board the hero element
- Read and render `dashboard/public/divergence.json`
- Keep Shock Mix prominent
- Demote the aggregate Market Shock Score
- Add visible `readings as of market close, 2026-06-08` framing

---

## 12. Publication Boundary and Launch Conditions

> Replaces the old "Final Launch Checklist" (2026-06-11). The old checklist (hashtags, carousel, CTA question) is retired.

**Boundary:** ChatGPT sessions cover the **build only**. The LinkedIn/Substack post is drafted in a separate workflow against the author's post strategy file, which governs voice, format, timing, and distribution. Do not draft, revise, or propose post copy in these sessions. The build's job is to make the artifact worth posting.

**What the build must deliver before the post can happen:**

- [x] Divergence board published with the four states and frozen thresholds (Sessions 8–9)
- [x] Score visually demoted; decomposition and board lead (Session 9)
- [x] Every view dated `as of market close, {date}`; no public real-time framing (Session 9 / Session 11)
- [x] Descriptive-labels pass complete — no editorial severity language, no implied side on named conflicts or sanction regimes (Session 9)
- [x] CI automation proven with a real Action-created snapshot (Session 11)
- [x] README v2 complete, Crucix attributed, disclaimer present, no keys committed (Session 11)
- [ ] At least ~2 weeks of dated rows accumulated in `log/` so the log has content when readers click (Session 10 onward)
- [ ] Served from `crucix.divergencelog.com`; apex index updated with the second entry (future dedicated domain session)
- [ ] Board screenshot with real rows, noting which state dominates that week (deferred by user in Session 11)

**Section 12 launch-condition adjustment after Session 13:** CI proof, hardening, README v2, publishability checks, public log verification, run-level visibility, and same-close-date docs sync are complete locally. Close-date snapshots remain sparse by design, and run-level records now live under `log/runs/`. The roughly two-week close-date log-depth launch condition remains open. Screenshot remains open. Domain remains deferred.

**Section 12 launch-condition adjustment dated 2026-07-10:** Publication/domain/screenshot progression is paused pending the Methodology 2.0 audit and architecture gates. Existing Phase 2 launch-condition checkmarks remain historical facts and should not be removed. The current public dashboard remains an experimental legacy baseline and must not be presented as a validated predictive system. Continued legacy log accumulation is useful during this pause, but it does not itself validate Methodology 2.0.

New open launch conditions before publication/domain progression resumes:

- [ ] Session 14 architecture/protocol gate complete
- [ ] Signal and market audits complete
- [ ] Methodology 2.0 core schema and parameter register frozen
- [ ] Persistent registry and reproducibility contract implemented
- [ ] Signal and market v2 parallel outputs implemented
- [ ] Comparison period completed in distinct eligible market closes
- [ ] Disagreement and lifecycle cases reviewed
- [ ] Explicit methodology version visible in production artifacts
- [ ] Cutover accepted with documented reasons

**Known timing constraints from the post strategy (for awareness only, not for action in these sessions):** the post is a Tuesday-heavy bridge piece, sequenced after at least one Travel post and one more clearly non-capital-markets post, and not close to the previous side-project post. Realistically late June 2026 at the earliest. This is convenient: it is exactly the time the log needs to accumulate rows.

---

## 13. Current Prompt to Use Next

```txt
Ready for session 14.
```

Session 14 is the Methodology 2.0 architecture and audit-protocol gate.
