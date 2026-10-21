# AskMongo

An agentic, read-only natural-language MongoDB analyst. Idea by Chenyun Yang (CMU).

## Current stage: Gate 1

Landing page and honest console placeholder, ready for design review. **The query agent and database integration are not implemented yet.** The landing query is labeled illustrative; it is not an Atlas result. Gate 2 implementation starts only after the user relays Chenyun's Gate 1 feedback.

## Run locally

Requires Node.js 22.12+ (or Node.js 24 LTS) and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. One command starts Vite on 5173 and Express on 3001. The frontend proxies `/api` to Express. `npm run build` checks TypeScript and produces the frontend production bundle.

No credentials are needed for this design review. Before Gate 2, copy `.env.example` to `.env` and add your Atlas read-only `MONGODB_URI` and server-only `NIM_API_KEY`. Never use a `VITE_` prefix for secrets. `.env` files are ignored by Git.

## Review gates

1. Landing hero screenshots: “Premium or template-y?” **Awaiting feedback.**
2. Working agent loop: system prompt, safety validator rules, and before/after repair trace.
3. Complete demo flow: screen recording, “What would you cut?”

## Planned safety contract

- Server-side allowlist for `find` and safe `aggregate` pipelines only; reject write stages, JavaScript execution, and dangerous operators.
- Maximum 25 returned documents and five seconds per database operation.
- Independently provisioned read-only Atlas database user.
- Strict JSON model output, validated before execution; never `eval`.
- One repair attempt maximum, with validation repeated before the second execution.

These controls are requirements for Gate 2, not claims about this preview. `POST /api/query` currently returns HTTP 503 without contacting any database. `GET /api/health` identifies the Gate 1 build and reports `databaseConnected: false`.

## Stack and design

React, TypeScript, Vite, Tailwind CSS, a shadcn-style Button built on Radix Slot/CVA, and Express. CSS handles all motion and honors reduced-motion preferences. DM Sans and Instrument Serif load from Google Fonts with system fallbacks. Design colors live in CSS variables.

## Repository

Prepared in a local Git repository while the existing repository location is being resolved. No remote is configured or modified. Integrate this working increment into the user's existing AskMongo repository once located, preserving its history and existing MIT license.
