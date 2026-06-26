# CRUCIX Market Shock Radar

CRUCIX Market Shock Radar is an experimental prototype built on Crucix. It maps Crucix signal records into market-risk transmission channels, then compares those signal readings with aligned market readings.

It is not investment advice, not a trading bot, and does not make buy, sell, or hold recommendations.

## Divergence Board

The divergence board compares two sides of the same channel:

- Signal side: Crucix records from `/api/data`, scored by the market-shock radar rules.
- Market side: market and macro instruments transformed into comparable z-scores.

Each board row reports:

- the mapped signal category;
- the normalized signal reading;
- the market z-score for the channel;
- the driver instrument behind that market reading;
- the resulting divergence state.

Public pages frame readings as `readings as of market close, {date}`. The dashboard also carries generated date, market close date, calendar lag, and freshness status when available.

## Four States

The board uses four descriptive states:

| State | Meaning |
|---|---|
| `radar-claim` | Signal reading is elevated while the market reading is quiet. |
| `priced` | Signal reading is elevated and the market reading is moving. |
| `radar-miss` | Market reading is moving while the signal reading is quiet. |
| `calm` | Signal reading is quiet and the market reading is quiet. |

These states are labels for comparison, not forecasts.

## Frozen Thresholds

The v2 divergence thresholds are frozen:

- Signal elevated: `>= 60%`
- Market moving: `abs(z) >= 1.5`

The thresholds are not retuned to make the board look more active or less active.

## Market Transform

The market side uses one uniform transform across instruments:

- Price instruments: 5-day return z-score.
- Level instruments: 5-day level-change z-score.
- Window: trailing 1-year window, represented as 252 aligned common observations.
- Channel reading: max absolute z-score among the channel instruments.
- Driver: the instrument with the max absolute z-score is named in the row.

All instruments are aligned to the latest common usable market close date before channel readings are computed.

## Data Sources

The signal side comes from Crucix:

```txt
http://localhost:3117/api/data
```

The market side uses:

- FRED for official market and macro series.
- Tiingo EOD adjusted close for ETF proxies.

Stooq was rejected for automated ETF proxy collection because automated access failed during local tests. The pipeline therefore uses Tiingo EOD adjusted close for those proxies.

## Dated Log

The daily run writes dashboard JSON and a dated divergence snapshot:

```txt
dashboard/public/market-shock.json
dashboard/public/market-readings.json
dashboard/public/divergence.json
log/YYYY-MM-DD.json
log/index.json
```

The history page reads `log/index.json` and the dated files under `log/`. It shows snapshots newest first and preserves freshness warnings when a snapshot includes them.

## Local Run

Start Crucix in one terminal:

```bash
npm run dev
```

Then run the daily protocol in another terminal:

```bash
npm run daily
```

The daily protocol runs:

```txt
npm run shock
npm run market:data
npm run divergence
npm run snapshot
```

`FRED_API_KEY` and `TIINGO_API_KEY` are required for market readings. Keep local keys in `.env`; do not commit `.env` or API keys.

## Dashboard Files

```txt
dashboard/public/market-shock.html
dashboard/public/history.html
docs/index.html
docs/history.html
```

The `docs/` files are synchronized for GitHub Pages publication.

## Disclaimer

CRUCIX Market Shock Radar is an experimental market-intelligence prototype. It is not investment advice, not financial advice, not a trading bot, and not a source of buy, sell, or hold recommendations. It is a descriptive tool for exploring how Crucix OSINT signals may map into possible capital-market transmission channels.
