# Sehat Saathi Offline

**An offline-first clinic workflow demonstration built with React, Vite, IndexedDB and a Progressive Web App service worker.**

This project demonstrates how a clinic interface can keep a small set of fictional records and pending changes available on one browser device during a network interruption. It includes an offline indicator, locally persisted records, an operation queue, explicit demo acknowledgement states and a fictional conflict-review scenario.

> **Important: educational prototype only.** The app has no backend, no authentication, no shared database and no real synchronization. The “Run sync demo” action changes local demonstration statuses only. Do not enter real patient information or use this project to support actual clinical decisions.

## Features in this version

- Responsive clinic dashboard with fictional sample records.
- Add, edit, delete, search, filter and export sample records to CSV.
- IndexedDB storage for local records and pending operations.
- Browser online/offline indicator.
- Local OPD queue with Waiting → Consulting → Completed states, stored in IndexedDB.
- PWA manifest and service worker for the application shell and static assets.
- Sync-status demonstration: pending, demo-acknowledged, conflict and demo-reviewed.
- Conflict example for a presentation; it does not merge or modify a real clinical record.
- No AI APIs, AI SDKs, external fonts, or external runtime services.

## Run locally

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

To test the production build locally:

```bash
npm run build
npm run preview
```

Open the preview URL printed by Vite. Service workers require a secure context: `localhost` is supported for local testing; deployed sites should use HTTPS.

## Demonstrate offline mode

1. Start the app and open it while connected.
2. In the production preview, allow the service worker to install and reload the page once while still online so the app shell and assets can be cached.
3. Open **Patient records** and add or edit a fictional record. You can also select **Add to queue** on a patient row.
4. Open **OPD queue** and move a fictional visit through Waiting → Consulting → Completed.
5. Open **Offline & sync** and confirm the changes appear in the local pending-operation list.
6. Use browser DevTools → Network to set the connection to **Offline**, or disconnect the network. The browser connection indicator should change.
7. Reload the page and verify the locally stored sample data and OPD queue remain available. (Do not clear site data during this test.)
8. Restore connectivity. The queue will remain local until you use **Run sync demo**; this button only simulates acknowledgement and does not contact a server.
9. Use **Add conflict example** to demonstrate how a conflict would be surfaced, then mark it reviewed.

Browser offline emulation may not behave exactly like a real network outage. Test the workflow more than once.

## How storage works

- Patient demo records are stored in IndexedDB on the current browser profile.
- Local changes and OPD status updates are also represented as operations in an IndexedDB queue. The OPD waiting list itself is stored in a separate IndexedDB object store.
- Data is not shared between browsers, devices or staff accounts.
- Clearing browser storage, losing the device or browser profile damage can destroy unsynchronized local data.
- IndexedDB is not automatically encrypted. Do not store sensitive or real patient information in this prototype.

## What is not implemented

- Doctor/staff authentication or role-based authorization.
- A secure backend API or shared central database.
- Actual upload/download synchronization, idempotent server operations or cross-device sync.
- Production conflict resolution with record version checks.
- Encryption-at-rest, device management, remote revocation or production audit controls.
- Medical validation or regulatory certification.

The demo uses rule-based display categories for fictional measurements. These categories are not clinical guidance and must not be used for diagnosis, triage or treatment.

## Deployment to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, import the repository.
3. Select **Vite** if asked for a framework.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy and open the generated HTTPS URL.

The included `vercel.json` provides a single-page-app fallback. Vercel hosting does not add a backend or make local records shared.

## Suggested next development stage

For any future clinical pilot, add a separately hosted secure API and central database; implement authenticated sessions, server-side authorization on every request, idempotent sync operations, record version checks, conflict review, audit logs, backup/recovery tests, a local-data protection strategy and an independent security/clinical workflow review. Do not use real patient information until those safeguards and applicable legal requirements have been reviewed.
