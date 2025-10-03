# PEG Setting Tool PWA

This folder is ready for static hosting (GitHub Pages, Netlify, Firebase Hosting, Azure Static Web Apps).

## Quick Deploy — GitHub Pages (Project Site)
1. Create a repo (e.g., `peg-setting-tool-pwa`) and push this folder's contents to the root of the repo.
2. In GitHub > Settings > Pages, set **Source** to `Deploy from a branch`, pick `main` and `/ (root)`.
3. Wait for Pages to build. Your app will be at `https://<username>.github.io/<repo>/`.
4. Open the URL. You should see the app and the **Install** button (in supported browsers).

### Notes
- The service worker requires HTTPS and won't run on `file://`. Use a static host or `npx http-server` locally.
- `data.json` uses a **network-first** strategy. Updating the file on the server reflects in the app immediately (then caches for offline). Use the in‑app **Refresh data** button to force a refresh.
- If you change any app files, GitHub Pages may cache aggressively. A normal refresh or cache‑busting query (`?v=`) will update; service worker will auto‑refresh once installed.


## Two Sections / Datasets
- Edit `data.json` → `datasets.primary` and `datasets.secondary`.
- Change each dataset's `label` to rename the section titles.
- Each dataset uses the same structure as before (`products` with `trigger`/`bucket`).


## Second Dataset
- Put your additional matrix in `data2.json` using the same schema as `data.json`.
- The second section on the page reads from `data2.json` and has its own Refresh button.


## Third Dataset
- Schema: per product -> `trigger` {A,R}, `bucket` {A,R} (no pressure).
- Replace `data3.json` with your table values. The third page section has its own refresh button.
