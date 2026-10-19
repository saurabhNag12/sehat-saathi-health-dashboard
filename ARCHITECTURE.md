# Sehat Saathi Offline — architecture notes

## Current demo data flow

1. React renders the dashboard and observes the browser's online/offline events.
2. Patient records, OPD queue entries and operation records are stored in IndexedDB on the current browser profile.
3. Creating, updating, deleting a fictional record or changing an OPD status creates a pending operation with a unique operation ID.
4. The Offline & sync page displays those operations. Its acknowledgement action is a **local simulation**, not a network request.
5. A conflict example stores two fictional text versions so the interface can demonstrate review status without modifying a real record.
6. The service worker caches the built application shell and same-origin hashed JS/CSS assets. It does not cache `/api/` requests or patient API responses.

## Proposed future production flow (not implemented)

- A clinician signs in through a trusted authentication provider.
- The server issues a short-lived session and authorizes each patient/visit request on the server.
- The app downloads only the minimum patient records approved for that managed device/session.
- Offline edits are stored as operations with unique IDs, a record ID, base version, operation type and local timestamp.
- On reconnect, the client submits queued operations to an authenticated API.
- The server validates identity, permissions, schema and record version, then processes each operation idempotently in a database transaction.
- The server returns an authoritative version and acknowledgement. Version mismatches create a conflict for authorized human review; clinical data is not silently merged.
- A durable audit trail and verified backup/recovery process are maintained on the server.

## Why the current app must not be used with real patients

The current version has no authentication, central database, secure synchronization API, server-side access controls, production audit trail, encryption-at-rest design or remote device revocation. Browser IndexedDB is not automatically encrypted and can be lost with browser storage/device failure. The demo uses fictional sample data and non-clinical display rules only.

## Suggested test checklist

- [ ] Add a fictional patient while online; refresh and verify the record remains.
- [ ] Edit and delete fictional records; verify each change appears in the operation queue.
- [ ] Add a fictional patient to the OPD queue; advance Waiting → Consulting → Completed; refresh and verify state remains.
- [ ] Open the production preview once online and reload once so the service worker can install and cache the built app assets.
- [ ] Set DevTools Network to Offline; refresh and verify the app shell and locally stored fictional data are available.
- [ ] Restore network and verify the app does not falsely claim that pending operations were uploaded.
- [ ] Run the clearly labelled acknowledgement simulation and confirm it says no server was contacted.
- [ ] Add the fictional conflict example and mark it reviewed.
- [ ] Reset the demo and verify patient records, queue entries and operation history are cleared/restored as documented.

## Production readiness is a separate milestone

Before any clinical pilot, add and independently review authentication, server-side authorization, secure local-data handling, session/locking policy, idempotent sync, version checks, conflict review, audit logging, backup/recovery and incident response. Validate the clinical workflow with qualified staff and review applicable privacy and healthcare requirements. Do not represent the student demo as certified or production-ready.
