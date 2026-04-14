# Known Issues

## Purpose

This file tracks current engineering limitations that matter when editing the system. These are not architectural intentions.

## Frontend Production Build

Previously identified issue (Resolved/Intermittent):

- `frontend` production build occasionally failed after compile and typecheck with:
  - `Next.js build worker exited with code: 1 and signal: null`

Current Status:

- The build currently succeeds (`npm run build`) in the engineering environment.
- normal TypeScript checking and typecheck passes.
- the issue is documented here for reference if it reappears during heavy CI loads or environment changes.
- performance verification must run from `frontend/` against the production Next server (`npm run build && npm run start`), not against dev mode or another package/toolchain in the repo
- the frontend shell now mirrors the language preference into a cookie so server rendering can keep `lang`/`dir` aligned with the persisted setting and avoid avoidable LTR/RTL layout shift on reloads
- local fonts should stay compressed (`.woff2`) in `frontend/app/fonts`; shipping raw `.ttf` assets materially increases first-load transfer size

What this means for future edits:

- if a change touches app-router behavior, route wrappers, auth gating, or page composition, re-verify the production build to ensure the fix remains stable.
- if a change touches language initialization, shell layout, or global font wiring, re-run Lighthouse against the production server to catch regressions in request weight or CLS.
- if the failure recurs, document the specific triggers or environment details here.

## Documentation Warning

If code and docs drift:

- trust the code first
- update docs immediately after confirming behavior
- do not keep outdated architecture descriptions in `docs/`
