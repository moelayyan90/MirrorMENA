# OpportunityOS — Your AI Opportunity Operating System

**Tagline:** Turn ambition into an executable plan.

OpportunityOS is an AI-native opportunity intelligence and execution system built for the Build with Gemini XPRIZE. It turns goals, constraints and candidate evidence into a ranked portfolio of lawful opportunities using expected realized value rather than vanity revenue.

## What it does

1. Captures goal, geography, available capital, time and constraints.
2. Rejects candidates with unclear payout, hidden capital, weak economics, excessive competition, legal/policy ambiguity or unsafe execution.
3. Ranks surviving opportunities using payout, payout probability, cash-conversion speed, effort, capital and risk.
4. Uses Gemini to explain and prioritize the evidence when `GEMINI_API_KEY` is configured.
5. Can write privacy-safe run metadata to Google Cloud Firestore when Google Application Default Credentials and `GOOGLE_CLOUD_PROJECT` (or `FIREBASE_PROJECT_ID`) are configured.
6. Keeps a transparent deterministic demo when live credentials are absent; it never pretends sample data is live AI output.

## Google / Gemini architecture

- **Gemini API:** server-side `models.generateContent` call from `api/analyze.js`; default model is `gemini-3.5-flash` and can be changed through `GEMINI_MODEL`.
- **Google Cloud Firestore:** optional production run ledger in collection `opportunityos_runs`.
- A Firebase project named `OpportunityOS-XPRIZE` has been prepared for the competition environment; production Firebase AI Logic/App Check configuration should be connected before public client-side Gemini access is enabled.

## Safety boundary

OpportunityOS rejects deception, fake identity/credentials, KYC or geographic evasion, prohibited automation, unauthorized security testing, bid suppression/collusion and gambling-like schemes. Payments, contracts, identity, tax declarations and irreversible financial/legal commitments remain human-controlled.

## Run

This repository branch is designed for Vercel-compatible static + serverless deployment. The front end works as a transparent demo without credentials. To enable live Gemini analysis, set `GEMINI_API_KEY`. To enable Firestore logging, configure Google Cloud credentials plus `GOOGLE_CLOUD_PROJECT` or `FIREBASE_PROJECT_ID`.

## Evidence policy

No user, revenue, expense, conversion or production-usage metric is invented. `evidence/sample-run.json` is explicitly marked as sample output. Real XPRIZE evidence should only be added after an arm's-length user or customer actually uses or pays for the product.
