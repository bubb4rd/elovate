# WZ-07 — OCR optional path (fail soft without GCP)

**Workstream:** WZ · **Priority:** P1

Photo upload on `/wz/calc` calls Google Cloud Vision. **Launch does not require Vision credentials.** Manual SR entry is the default path.

## Operator setup (optional)

1. Create a GCP project and enable the **Cloud Vision API**.
2. Create a service account with Vision access and download JSON credentials.
3. Set **one** of these in `.env.local` (local) or Netlify env (production):

| Variable | Use |
|---|---|
| `GOOGLE_CLOUD_CREDENTIALS` | Full service account JSON string (preferred for Netlify) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Filesystem path to JSON (local dev) |

4. Copy placeholders from `.env.example`. Never commit credential files.

See also README § "SR screenshot OCR (optional)".

## Expected behavior without credentials

| Surface | Behavior |
|---|---|
| `/wz/calc` | Loads normally; **manual entry** is default (`entryMode: "manual"`) |
| Photo upload tab | User can opt in; upload POST returns **503** `"Scan unavailable right now"` |
| UI | Error is visible; user can retry or return to manual entry |

## API route

`POST /api/ocr/sr-breakdown`

- **503** — credentials missing, invalid, or billing disabled (soft fail)
- **429** — rate limit (per IP)
- **400** — bad/missing image
- **422** — image readable but no SR breakdown found
- **200** — parsed breakdown JSON

## Smoke

```bash
chmod +x scripts/wz-07-ocr-smoke.sh
./scripts/wz-07-ocr-smoke.sh
```

Unit tests: `npm test` (includes `vision-client`, `parse-sr-breakdown`, `error-matrix`).

## Launch checklist

- [ ] `/wz/calc` works on production **without** Vision env vars
- [ ] Manual SR entry + session logging verified
- [ ] If Vision keys are added later, photo path returns 200 on a known-good screenshot
