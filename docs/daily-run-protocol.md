# CRUCIX Daily Run Protocol

This project is an end-of-day daily log. Public pages should describe data as `readings as of market close, {date}`.

The daily output is a dated reading, not a continuous feed. Market JSON should include generated date, market close date, calendar lag, and freshness status when available.

## One-command local run

1. Start the Crucix server in a separate terminal:

   ```bash
   npm run dev
   ```

2. After `http://localhost:3117/api/data` returns data, run:

   ```bash
   npm run daily
   ```

The `daily` script runs, in order:

- `npm run shock`
- `npm run market:data`
- `npm run divergence`
- `npm run snapshot`

`FRED_API_KEY` and `TIINGO_API_KEY` are required for `npm run market:data`. For local runs, keep them in `.env`. For GitHub Actions, keep them in repository secrets. Do not commit `.env` or API keys.

## Freshness handling

Market readings are aligned to the latest common usable market close date across all market instruments. The output keeps the existing framing:

```txt
readings as of market close, YYYY-MM-DD
```

Freshness metadata should distinguish:

- `current`: the common market close date is within the current calendar-lag allowance.
- `lagging`: the common market close date is older, but still inside the hard stale limit.
- `stale`: the common market close date is beyond the hard stale limit.

Lagging or stale readings must not be presented as fresh. The divergence output should preserve market freshness warnings so the dashboard and history page can display them.

## Expected changed files

A normal daily run may update:

- `dashboard/public/market-shock.json`
- `dashboard/public/market-readings.json`
- `dashboard/public/divergence.json`
- `log/YYYY-MM-DD.json`
- `log/index.json`
- `docs/index.html`
- `docs/history.html`
- `docs/market-shock.json`
- `docs/market-readings.json`
- `docs/divergence.json`
- `docs/log/YYYY-MM-DD.json`
- `docs/log/index.json`

The snapshot script refuses to overwrite a dated snapshot if the existing file has different contents. Use this only after intentionally regenerating the same date:

```bash
npm run snapshot -- --force
```

The market-data and divergence scripts validate their output before replacing JSON files. A failed source fetch, missing key, invalid JSON response, or stale common market close should fail the run rather than silently replacing a previous valid file with partial output.

## Deployment note

GitHub Pages currently serves the existing project URL from `docs/`. The daily snapshot script keeps `docs/` synchronized for that deployment path.

Custom domain and subdomain setup is deferred to a later session. Do not create `docs/CNAME`, change GitHub Pages custom-domain settings, or update the apex `divergencelog.com` index as part of this protocol.
