# Violet Interview

A compact, evidence-backed AI voice interview demo. A company creates a role and four-part rubric, uploads a candidate résumé, shares a private interview URL, and reviews a transcript-grounded report.

## Provider decision

**Selected provider: OpenAI Realtime over WebRTC.**

Gate evidence recorded on 10 September 2026:

- No `SARVAM_API_KEY` or `SARVAM_AGENT_ID` was available in the supplied implementation environment.
- Sarvam therefore required additional account enablement and failed the plan's deterministic gate.
- The fixed fallback was selected before provider-specific session code was built.
- Browser SDP is proxied through the app to OpenAI's current `POST /v1/realtime/calls` endpoint. The standard API key never reaches the browser.

The deployed provider path is real, not a mock. Local automated tests do not call paid APIs.

## Local setup

Requirements: Node.js 24+, npm, Docker, and an OpenAI API key.

1. Copy `.env.example` to `.env` and replace every placeholder. `APP_BASE_URL` may be `http://localhost:3000` for non-microphone development; browser microphone QA requires HTTPS or localhost.
2. Start PostgreSQL: `docker compose up -d db`.
3. Install dependencies: `npm ci`.
4. Run migrations inside the Compose network: `docker compose run --rm app npm run db:migrate`.
5. Seed the demo account: `docker compose run --rm app npm run db:seed`.
6. Start the stack: `docker compose up --build app caddy` for a configured domain, or run `npm run dev` with a host-accessible `DATABASE_URL`.

Quality commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment on a DigitalOcean VM

1. Provision an Ubuntu VM with Docker Engine and the Compose plugin. Permit inbound SSH (22), HTTP (80), and HTTPS (443); do not expose PostgreSQL.
2. Point the chosen domain's A/AAAA record at the VM.
3. Clone this repository and create `.env` from `.env.example`. Use a random 32+ character `AUTH_SECRET` and strong, distinct database and demo-account passwords.
4. Run `docker compose build`.
5. Run `docker compose up -d db`, then `docker compose run --rm app npm run db:migrate` and `docker compose run --rm app npm run db:seed`.
6. Run `docker compose up -d app caddy` and verify `https://$DOMAIN/health` returns `{"status":"ok"}`.

Caddy obtains and renews TLS automatically. PostgreSQL has no host port mapping and persists in the `postgres_data` named volume.

## Security and data handling

- Passwords use bcrypt with cost 12.
- Invite and report URLs contain 256-bit random tokens; PostgreSQL stores only SHA-256 hashes.
- Every company query scopes data to the authenticated owner.
- Uploaded PDFs are held only in request memory, parsed locally, capped at 20,000 characters, and discarded.
- No audio or video is stored. Finalized transcript turns are persisted idempotently.
- Logs contain record identifiers, state/latency, and sanitized errors—not tokens, full transcripts, résumés, or API keys.
- Reports calculate weighted scores and recommendations on the server and always state that human review is required.

## Demo QA checklist

Before presenting on a public HTTPS domain, complete and record:

- Signup, seeded login, logout, and a cross-user ownership attempt.
- One English and one Hinglish 15-minute interview in current desktop Chrome.
- Microphone denial/recovery, interruption, captions, refresh/reconnect, temporary network loss, early completion, and the 15-minute cap.
- Four-competency coverage, three or four relevant résumé questions, and a spoken résumé correction.
- Report failure/retry, insufficient evidence, report-link revoke/regenerate, and candidate deletion.
- Observed connection, transcription, and response latency (report measurements; do not promise a fixed number).
- A clearly labeled 60–90 second backup recording using synthetic candidate data.

Public-domain QA and the backup recording require deployment credentials, a domain, and a human speaker; they are intentionally not claimed by automated verification.
