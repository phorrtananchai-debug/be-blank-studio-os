# Vercel Env Setup for BE BLANK OS Karun Live-Control

This project supports Karun live-control mode through Vite runtime environment variables.

## Required environment variables

Set these in Vercel Project Settings -> Environment Variables:

- `VITE_GOOGLE_COREBASE_MODE=karun-live-control`
- `VITE_GOOGLE_COREBASE_ENDPOINT=<Apps Script Web App URL>`

Notes:
- Keep endpoint values private in your deployment configuration.
- Do not commit `.env.local` or real endpoint values to source control.

## Why redeploy is required

`VITE_*` variables are injected at build time by Vite.
After adding or changing either variable in Vercel, trigger a new deployment so the app bundle picks up the new values.

## Expected Settings behavior after correct deploy

Open `/os/settings` and confirm:

- `Corebase mode: karun-live-control`
- `Endpoint configured: yes`
- `Endpoint host: <host only>`

The app intentionally displays host-only diagnostics and does not expose the full endpoint URL.

## If endpoint is missing

Settings will show:

`Endpoint not configured. Set deployment env vars and redeploy.`

In this state, the app safely falls back to mock mode behavior.
