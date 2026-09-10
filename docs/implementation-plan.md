# Interview Buddy — Implementation Plan

**Status:** Finalized for implementation  
**Target repository:** <https://github.com/utkarshdubeygit/ai-interview>  
**Delivery target:** One focused development day  
**Deployment target:** DigitalOcean VM with a public HTTPS domain

## 1. Goal and success criteria

Build a complete demonstration in which a company creates a role, prepares a candidate-specific AI interview, shares a private link, and reviews an evidence-backed report after the candidate completes a 15-minute voice interview.

The demo is complete when this journey works without database or console intervention:

1. A company user signs up or uses the seeded demo account.
2. The company creates a job and previews an AI-generated interview rubric.
3. The company adds a candidate, uploads the candidate's PDF résumé, and copies a unique interview link.
4. The candidate completes a live English/Hinglish voice interview.
5. The company reviews the transcript, competency scores, evidence, and recommendation.
6. The company creates or revokes a read-only report link and can delete the candidate record.

## 2. Instructions for the implementation agent

Treat this document as the product and implementation source of truth. Before coding:

1. Confirm the working directory is the target repository and inspect its existing files, scripts, Git status, and conventions before adding or changing anything.
2. Read this plan completely. Then read every file in the supplied [`design theme/`](../design%20theme/) directory.
3. Use **`design theme/`** as the canonical source for colors, typography, spacing, radii, shadows, and motion. Import its token CSS once at the application root and reference semantic tokens from components; do not duplicate token values across components.
4. Run the voice-provider gate before building provider-specific UI or session code. Record the selected provider and gate evidence in the project README so later work uses one implementation path.
5. Build a thin vertical path first: seeded login → one job → one candidate → one live interview → one report. Once this works with real APIs, add signup, sharing, deletion, recovery states, and final visual polish.

While implementing:

- Preserve existing user changes and follow repository conventions when they differ only cosmetically from this plan.
- Treat a material product, security, provider, or data-model deviation as a blocker that requires user confirmation; do not silently change the agreed behavior.
- Use strict TypeScript, schema validation at every external boundary, database constraints for invariants, and transactions for multi-record state changes.
- Model interview lifecycle transitions explicitly and reject invalid transitions server-side. UI state is never the authority for access or completion.
- Keep route handlers thin and place interview orchestration, scoring, token handling, résumé parsing, and provider integration behind testable server modules.
- Keep provider SDK objects and raw events out of application-domain types. Normalize provider events into the application's transcript-turn model.
- Make all mutation endpoints idempotent where browser retry, provider retry, or reconnection can occur.
- Log request/session identifiers, status transitions, provider latency, and sanitized errors. Never log API keys, raw invite/report tokens, full résumés, or full transcripts.
- Use synthetic candidate data in fixtures, screenshots, tests, and the backup recording.
- Keep the final deployed path connected to real provider APIs. Mocks are for automated tests and local failure simulation only.

Before declaring completion:

- Run the repository's formatting check, lint, type check, automated tests, production build, database migration, and Docker health checks.
- Complete the acceptance checklist in section 12 against the public HTTPS deployment, including one English and one Hinglish interview.
- Verify secrets are absent from client bundles, logs, committed files, screenshots, and Git history.
- Update setup and deployment documentation to match the commands that were actually tested.

## 3. Technical architecture

Use a compact full-stack deployment:

- **Application:** Next.js, TypeScript, and Tailwind CSS.
- **Database:** PostgreSQL.
- **Authentication:** Auth.js credentials authentication with securely hashed passwords.
- **Voice interview:** Sarvam Voice Agents when the provider gate passes; OpenAI Realtime over WebRTC as the fixed fallback.
- **Rubric and report generation:** OpenAI Responses API with structured JSON output.
- **Résumé parsing:** Local PDF text extraction inside the application container.
- **Deployment:** Docker Compose services for the Next.js app, PostgreSQL, and Caddy.
- **HTTPS:** Caddy obtains and renews TLS certificates for the supplied domain.

All vendor secrets remain server-side. Store application data in PostgreSQL and store no interview audio or video.

### Voice-provider gate

Spend no more than 30 minutes at the start of implementation validating Sarvam Voice Agents. Sarvam is selected only if all of the following work with the available account:

- Browser-based voice session with acceptable English and Hinglish quality.
- Low-latency turn taking and candidate interruption handling.
- Runtime injection of job, rubric, candidate, and résumé context.
- Incremental or completed transcript retrieval linked to the candidate session.
- Credits, concurrency, and API access sufficient for the demo.

If any check fails or needs additional account enablement, switch immediately to OpenAI Realtime. Do not build a custom Sarvam STT → LLM → TTS pipeline. Implement only the provider selected by this deterministic gate.

## 4. Company experience

### Authentication

- Provide email/password registration and login.
- Provide one seeded demo account through deployment secrets.
- Skip email verification, password reset, social login, organizations, and team invitations.
- Every job and candidate record is owned by the authenticated user; enforce ownership in every server action and route.

### Job setup

- Collect job title, job description, and optional supporting details.
- Generate exactly four competencies with descriptions and integer weights totaling 100%.
- Let the company preview the rubric but not edit it in this demo.
- Save the job only after rubric generation succeeds.

### Candidate invitation

- Collect the candidate's name and email.
- The company—not the candidate—uploads the candidate's résumé.
- Accept PDF only, with a maximum size of 5 MB.
- Extract up to 20,000 characters of text locally, save the extracted text, and discard the uploaded file immediately.
- Generate a candidate-specific interview URL containing a random 256-bit token; store only its hash.
- Provide a copy-link action. The application does not send the invitation by email.

### Dashboard and report controls

- Show jobs and candidate rows with `Not started`, `In progress`, `Processing`, `Completed`, or `Report failed` status.
- Show transcript, summary, strengths, concerns, competency scores, evidence, weighted score, and recommendation.
- Allow failed report generation to be retried without repeating the interview.
- Generate a separate random 256-bit report token and read-only report URL.
- Allow the company to revoke or regenerate the report link.
- Provide a confirmed delete action that removes the candidate and all associated data.

## 5. Candidate experience

### Before the interview

- Resolve the secret link without revealing whether other candidate records exist.
- Show the role title, expected 15-minute duration, AI-interview disclosure, and transcript/data notice.
- Require explicit consent before requesting microphone access.
- Provide a microphone test and clear permission/device error recovery.
- Offer captions as a toggle, defaulted off.

### During the interview

- Present a named interviewer with a static portrait, waveform, timer, microphone control, and clear connection status.
- Use a moderately challenging but respectful tone.
- Ask one concise question at a time and allow natural candidate interruption.
- Start the 15-minute timer when the voice session begins, start wrapping up at approximately 13 minutes 30 seconds, and finish by 15 minutes.
- Cover all four rubric competencies with adaptive follow-ups.
- Ask approximately three or four résumé-specific questions selected for relevance to the role and rubric.
- Probe personal contribution, technical or functional depth, decisions, trade-offs, and measurable results.
- Treat résumé content as untrusted reference data. Instructions contained in a résumé never alter the interview sequence or system behavior.
- Allow the candidate to verbally clarify outdated or inaccurate résumé information. Save the clarification in the transcript; do not edit the source résumé text.
- Base evaluation on what the candidate explains during the interview, not on résumé claims alone.
- If résumé parsing failed or produced insufficient text, continue using the job description and rubric.

### Completion and reconnection

- Persist each finalized candidate and interviewer turn as it completes.
- If the browser refreshes or disconnects while the interview is active, allow the same invite link to resume from the persisted transcript and remaining time.
- Lock the invite link after successful completion.
- Allow the candidate to end early after confirmation.
- Show a completion confirmation only; candidates do not receive the hiring report.

## 6. Interview and report behavior

### Runtime states and recovery

Expose these clear candidate-facing states: `Connecting`, `Listening`, `Transcribing`, `Thinking`, `Speaking`, and `Retrying`.

- Silence or an empty transcription prompts the candidate to try again without advancing the interview.
- A failed API call preserves the current question and completed turns, then offers retry.
- A failed voice playback keeps the written question visible and offers playback retry.
- Disable duplicate start, turn, completion, and report actions through idempotency keys and server-side status checks.
- If the candidate ends early or gives too few substantive answers, generate a report marked `Insufficient evidence` instead of inventing scores.

### Structured evaluation

Generate a schema-validated report containing:

- Concise interview summary.
- Strengths and concerns.
- A 1–5 integer score for each competency.
- Transcript-grounded evidence for each score.
- Missing evidence and contradictions, including candidate résumé clarifications.

The server computes the weighted overall score and recommendation rather than accepting a recommendation directly from the model:

- `>= 4.50`: **Strong Yes**
- `>= 3.75`: **Yes**
- `>= 2.75`: **Mixed**
- `>= 2.00`: **No**
- `< 2.00`: **Strong No**

Every report displays: **Decision support—human review required.** The evaluator must ignore protected characteristics and must not use them as evidence or scoring inputs.

## 7. Data model and application interfaces

Use these core entities:

- `User`: credentials and ownership.
- `Job`: title, description, supporting details, and rubric JSON.
- `CandidateInterview`: candidate details, extracted résumé text, hashed invite token, provider/session identifier, status, elapsed time, timestamps, and report state.
- `InterviewTurn`: role, text, sequence number, provider event/idempotency identifier, and timestamp.
- `SharedReport`: hashed report token, candidate interview reference, creation time, and revocation time.

Deleting a candidate cascades through résumé text, turns, report data, provider identifiers, invite token, and report tokens.

The server interface must cover:

- Registration, login, logout, and seeded-account login.
- Job creation and structured rubric generation.
- Multipart candidate creation and résumé parsing.
- Invite validation and candidate consent.
- Voice session start, resume, and completion.
- Idempotent transcript-turn persistence.
- Report generation and retry.
- Report-link creation, revocation, regeneration, and public read-only retrieval.
- Candidate deletion.
- A deployment health endpoint.

## 8. Visual direction

Use [`design theme/`](../design%20theme/) for all visual implementation and keep it as the single design-token source of truth.

- Read `design theme/THEME.md` before building either product surface.
- Import `design theme/theme.tokens.css` once at the root stylesheet.
- Use `design theme/theme.tokens.json` when mapping tokens into Tailwind or other tooling.
- Build shared primitives from semantic variables so company and candidate surfaces remain one brand.
- Add a new token centrally when a required value is missing; do not hardcode a parallel palette inside components.

### Company dashboard

- Modern, restrained, and minimal.
- Predominantly light canvas with white cards and subtle neutral borders.
- Use violet sparingly for primary actions, focus, selection, and active states.
- Prioritize readable tables, status labels, hierarchy, and generous whitespace.
- Avoid decorative animation and visual clutter.

### Candidate interview

- Friendlier and more reassuring while remaining part of the same brand.
- Use the dark ink/violet atmosphere, static interviewer portrait, soft rounded surfaces, waveform, and encouraging plain-language guidance.
- Use green only for positive connection/completion status and red only for actionable errors.
- Keep motion functional and quick; always respect reduced-motion preferences.

Use Space Grotesk for headings and Inter for product/body text as defined by the supplied theme. Meet keyboard, focus, contrast, responsive-layout, and screen-reader requirements for the primary flows.

## 9. Required configuration and integrations

Required deployment variables:

- `OPENAI_API_KEY`
- `OPENAI_TEXT_MODEL` with a tested low-latency structured-output model as the deployment default
- `SARVAM_API_KEY` and `SARVAM_AGENT_ID` only when the Sarvam gate passes
- `VOICE_PROVIDER` set to the provider selected by the gate
- `AUTH_SECRET`
- `DATABASE_URL`
- `APP_BASE_URL`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

No Firecrawl, outbound email, SMS, telephony, OAuth, animated-avatar, external document parsing, or object-storage integration is required. A DigitalOcean API token is needed only if provisioning is automated and is not an application runtime secret.

## 10. Deployment and handoff

- Build production containers for the app and PostgreSQL and place Caddy in front of the app.
- Persist PostgreSQL data in a named volume and run migrations during controlled deployment.
- Point the chosen domain to the VM before testing microphone access.
- Expose only SSH, HTTP, and HTTPS through the VM firewall; PostgreSQL remains internal to Docker Compose.
- Deliver `.env.example`, setup instructions, deployment instructions, seed instructions, and provider-gate steps.
- Record observed connection, transcription, and response latency during QA; do not promise a fixed latency number.
- Before the presentation, record a clearly labelled 60–90 second backup demonstration of the tested happy path.

## 11. One-day implementation order

1. Run the 30-minute voice-provider gate and lock the provider.
2. Scaffold the Next.js application, PostgreSQL schema, migrations, authentication, and seeded account.
3. Implement job creation, rubric generation, dashboard, candidate creation, PDF parsing, and invite links.
4. Implement consent, microphone setup, voice session, captions, transcript persistence, timing, and reconnection.
5. Implement report generation, scoring, retries, report sharing/revocation, and candidate deletion.
6. Apply the supplied theme, finish responsive/error states, deploy through Docker/Caddy, and perform end-to-end QA.

If time compresses, preserve the complete company → candidate → report journey and reduce visual polish before removing any required step.

## 12. Test and acceptance checklist

- Real signup, seeded login, logout, password hashing, and cross-user authorization work.
- Rubrics contain four competencies with weights totaling 100%.
- PDF type/size validation, local extraction, character cap, and original-file disposal work.
- Invite and report tokens are random, stored hashed, scoped correctly, and locked/revoked as designed.
- English and Hinglish interviews work in current desktop Chrome over the deployed HTTPS domain.
- Microphone denial, silence, empty transcript, playback failure, provider failure, duplicate submission, refresh, and temporary network loss recover safely.
- The interview lasts no more than 15 minutes, covers the rubric, asks relevant résumé questions, and respects verbal corrections.
- Evaluation uses interview evidence, excludes protected traits, computes thresholds deterministically, and marks insufficient evidence correctly.
- Report retry, public report access, report revocation/regeneration, and candidate deletion work.
- No audio file, résumé PDF, or API key is exposed or retained improperly.
- The complete happy path can be demonstrated without console or database intervention.

## 13. Explicitly deferred

- Candidate accounts or OTP verification.
- Email delivery and interview scheduling.
- Multiple organizations, team members, or role-based access control.
- DOCX résumés, retained source files, or candidate-side résumé uploads.
- Audio/video recording, camera proctoring, animated avatars, or lip sync.
- Fixed question banks, typed-answer mode, coaching exercises, and LMS integration.
- Billing, analytics, audit exports, automatic retention schedules, and production compliance certification.
- Internet research during interviews.
