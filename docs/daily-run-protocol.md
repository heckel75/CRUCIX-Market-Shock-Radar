# CRUCIX Daily Run Protocol

This project is an end-of-day daily log. Public pages should describe data as `readings as of market close, {date}`.

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

## Deployment note

GitHub Pages currently serves the existing project URL from `docs/`. The daily snapshot script keeps `docs/` synchronized for that deployment path.

Custom domain and subdomain setup is deferred to a later session. Do not create `docs/CNAME`, change GitHub Pages custom-domain settings, or update the apex `divergencelog.com` index as part of this protocol.
