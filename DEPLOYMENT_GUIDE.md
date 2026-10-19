# Sehat Saathi Offline — setup and deployment guide

## 1. Local setup

Install Node.js 18+ and npm. In Terminal, move into this project folder and run:

```bash
npm install
npm run dev
```

Use the local URL shown in Terminal. Keep the dev server running while testing the site.

## 2. Test the production app shell

```bash
npm run build
npm run preview
```

Open the preview URL while online and let the service worker install. Reload once while online before attempting the offline test. Then use browser DevTools → Network → Offline and refresh the page. The app shell and assets should load from the service worker cache, while record data is read from IndexedDB.

The service worker is only registered for production builds, not Vite's development server.

## 3. Deploy to Vercel

1. Create a GitHub repository named `sehat-saathi-offline` (or another available name).
2. Push the contents of this folder to the repository root.
3. Import the repository in Vercel.
4. Framework preset: Vite.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Deploy. Use the HTTPS deployment URL for PWA/offline testing.

No environment variables are required for this demonstration. Do not add real patient data or credentials to the repository.

## 4. GitHub repository information

Suggested repository name: `sehat-saathi-offline`

Suggested description: `Offline-first clinic workflow demonstration using React, Vite, IndexedDB and a PWA service worker. Fictional data only; no backend or AI APIs.`

Suggested topics: `offline-first`, `pwa`, `react`, `vite`, `indexeddb`, `clinic-workflow`, `student-project`

## 5. What the sync button means

**Run sync demo is a local simulation only.** It marks pending demonstration operations as `demo-acknowledged` when the browser reports an online connection. It does not send records to a server. The OPD queue is also stored locally and is not shared with other devices. The conflict button adds a fictional conflict scenario. Neither feature should be described as production synchronization.

## 6. Before real clinic use

This ZIP is not ready for clinical use. It has no login, server-side permissions, central database, actual sync API, encryption-at-rest design, remote device revocation or production audit trail. Before a real clinic pilot, implement and independently review authentication, authorization, secure local-data handling, idempotent synchronization, version checks, conflict resolution, audit logging, backups and recovery. Review applicable Indian privacy and healthcare requirements. Never use this prototype for diagnosis or treatment.
