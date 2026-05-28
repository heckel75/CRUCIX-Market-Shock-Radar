# CRUCIX Market Shock Radar

**OSINT → Capital Markets**  
**World Events → Market Risk**

CRUCIX Market Shock Radar is an experimental dashboard that converts Crucix OSINT signals into possible capital-market transmission channels.

It does not predict markets.  
It does not make buy/sell recommendations.  
It is a prototype for thinking about how real-world events may transmit into market risk.

---

## One-line pitch

World events move markets before charts explain them. This project maps Crucix intelligence signals into possible market-risk channels.

---

## What it does

The project reads live local Crucix data from:

```txt
http://localhost:3117/api/data
```

Then it:

1. Extracts text-like signals from nested Crucix JSON.
2. Matches those signals against market-shock categories.
3. Assigns confidence and severity scores.
4. Maps each signal to possible asset-market channels.
5. Writes a dashboard-ready JSON file.
6. Displays the output in a local visual dashboard.

Primary output files:

```txt
dashboard/public/market-shock.json
dashboard/public/market-shock.html
```

Dashboard URL:

```txt
http://localhost:3117/market-shock.html
```

---

## Why it matters

Most market dashboards show what already moved.

This prototype asks a different question:

> What real-world signals could become market-risk transmission channels?

Examples:

- Conflict escalation can affect oil, gold, volatility, defense equities, and safe-haven FX.
- Sanctions can affect commodities, FX, emerging markets, and supply chains.
- Energy disruption can affect inflation expectations and energy equities.
- Credit stress can affect banks, high-yield spreads, Treasuries, and broad risk appetite.
- Supply-chain disruption can affect industrials, semiconductors, margins, and shipping.

The goal is to create a small explainable intelligence layer between OSINT and market awareness.

---

## How to run it

### 1. Start Crucix

Open a Windows Command Prompt:

```cmd
cd /d D:\WinProjects\CRUCIX
npm run dev
```

Leave this terminal running.

---

### 2. Generate the Market Shock Radar JSON

Open a second Windows Command Prompt:

```cmd
cd /d D:\WinProjects\CRUCIX
npm run shock
```

This runs:

```cmd
node scripts/market-shock-radar.mjs
```

It fetches:

```txt
http://localhost:3117/api/data
```

And writes:

```txt
dashboard/public/market-shock.json
```

---

### 3. Open the dashboard

In your browser, open:

```txt
http://localhost:3117/market-shock.html
```

---

## Example output

Example run from Session 5:

```txt
CRUCIX Market Shock Radar
Fetching: http://localhost:3117/api/data

Candidates extracted: 125
Signals matched: 15
Market Shock Score: 15/20
Risk regime: Shock mode
Interpretation: Multiple high-severity signals suggest broad market-risk transmission channels. Score is moderated because many signals are concentrated in one category.
JSON written: dashboard\public\market-shock.json

Shock counts:
- Geopolitical Escalation: 13
- Energy Shock: 2
```

Example dashboard outputs:

- Market Shock Score: `15/20`
- Risk regime: `Shock mode`
- Candidate count: `125`
- Matched signals: `15`
- Top categories:
  - `Geopolitical Escalation`
  - `Energy Shock`

---

## Shock categories

The current MVP uses rule-based matching across these categories:

| Category | Description |
|---|---|
| Energy Shock | Oil, gas, pipelines, refineries, chokepoints, LNG, fuel disruption |
| Geopolitical Escalation | War, strikes, missiles, drones, military activity, territorial escalation |
| Sanctions / Policy Shock | Sanctions, export controls, tariffs, capital controls, policy restrictions |
| Credit Stress | Defaults, banking stress, liquidity issues, credit spreads, debt distress |
| Supply Chain Disruption | Shipping disruption, ports, semiconductors, logistics, industrial bottlenecks |
| Macro / Inflation Shock | CPI, inflation, central banks, rates, wages, food prices |
| Weather / Climate Shock | Storms, droughts, floods, extreme heat, climate-related disruption |
| Market Volatility Signal | VIX, selloff, crash, volatility, broad market stress |

---

## Transmission matrix

| Signal type | Possible market channels |
|---|---|
| Conflict escalation | Gold, VIX, oil, defense equities, safe-haven FX |
| Middle East escalation | Oil, natural gas, inflation expectations, gold, shipping, defense equities |
| Russia / Ukraine escalation | Energy, wheat, fertilizers, defense equities, European FX, rates |
| Taiwan Strait tension | Semiconductors, shipping, industrials, safe-haven FX, volatility |
| Sanctions | FX, commodities, emerging markets, trade flows, inflation |
| Energy disruption | Brent, WTI, natural gas, energy equities, inflation expectations |
| Chokepoint disruption | Oil, LNG, shipping rates, insurers, global trade, inflation |
| Credit stress | High-yield spreads, banks, Treasuries, equities, liquidity |
| Supply-chain disruption | Industrials, semiconductors, margins, freight, inventories |
| Inflation shock | Rates, bonds, FX, gold, equities, consumer sectors |
| Weather shock | Agriculture, insurance, utilities, energy demand, food inflation |
| Market volatility signal | VIX, equities, credit, safe-haven assets, liquidity |

---

## Current flow

```txt
Crucix /api/data
      ↓
scripts/market-shock-radar.mjs
      ↓
dashboard/public/market-shock.json
      ↓
dashboard/public/market-shock.html
      ↓
Local dashboard screenshot or demo
```

---

## Project files

```txt
Crucix/
├── scripts/
│   └── market-shock-radar.mjs
├── dashboard/
│   └── public/
│       ├── market-shock.html
│       └── market-shock.json
├── README-market-shock-radar.md
├── package.json
└── CRUCIX_MARKET_SHOCK_RADAR_PROJECT_LOG.md
```

---

## npm scripts

The project adds:

```json
"shock": "node scripts/market-shock-radar.mjs"
```

Run it with:

```cmd
npm run shock
```

---

## Limitations

This is an MVP prototype.

Known limitations:

- It uses rule-based keyword matching, not a full semantic model.
- It can still catch false positives when headlines contain market-relevant words in unrelated contexts.
- It does not currently use live asset prices.
- It does not forecast returns.
- It does not rank trade ideas.
- It depends on the freshness and quality of the local Crucix data.
- It should be reviewed by a human before being used in any serious workflow.

---

## Disclaimer

This project is an experimental market-intelligence prototype.

It is not investment advice.  
It is not financial advice.  
It is not a trading bot.  
It does not provide buy, sell, or hold recommendations.  
It does not guarantee market outcomes.  

The purpose is to explore how OSINT signals can be mapped into possible capital-market transmission channels.

---

## Suggested LinkedIn framing

```txt
I built a small experiment on top of Crucix:

CRUCIX Market Shock Radar — an OSINT-to-capital-markets dashboard.

Most market dashboards show what moved.

I wanted to prototype something that asks:

What real-world signals could move markets next?

Not investment advice.
Not a trading bot.
Just a 5-hour prototype exploring how OSINT can become a capital-markets intelligence layer.
```

---

## Final CTA

Would you use something like this as a daily pre-market risk scan?