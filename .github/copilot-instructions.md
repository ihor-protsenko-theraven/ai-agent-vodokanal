# AI code-review instructions

Review this TypeScript/Vite application as production software for dispatchers who
register water and sewer incidents. Report only actionable, evidence-based findings.
Prioritise correctness, data loss, privacy/security, and regressions over style.

## Project architecture

- Keep feature code inside `src/features/<feature>/{application,domain,infrastructure,ui}`.
  `domain` must not import browser APIs, fetch clients, or UI classes.
- `src/shared` contains reusable types, configuration, and pure utilities only.
- Do not grow `TicketStateStore` or another cross-feature god object. Extract a focused
  service, pure function, or UI component when a change introduces unrelated responsibility.
- Preserve explicit TypeScript types at API boundaries. Treat Forland, Gemini, Geodata,
  and Nominatim payloads as untrusted until validated.

## Security and privacy

- Do not put credentials, API keys, or Authorization headers in `VITE_*` variables,
  browser code, logs, errors, tests, or documentation. Secrets belong only in server
  environment variables and server-side API routes.
- Never log an entire ticket request/response: it can include the applicant's name,
  address, phone number, and incident details. Logs must be minimal and redacted.
- Do not weaken CSP, CORS, or proxy validation merely to make an integration work.

## Ticket integrity

- Never substitute fabricated values for missing Forland IDs, LogIDs, coordinates,
  addresses, or dates. Display an explicit unavailable state and require review where
  a field is mandatory.
- A save for a new ticket and a save for an existing ticket are different flows. Do not
  silently turn an edit into creation by using a negative/template ID.
- Values selected from Forland dropdown catalogues are dynamic. Do not hard-code labels
  or IDs where the loaded catalogue is authoritative.
- Preserve the fallback behaviour: if an incident date/time is absent, initialise it to
  the current local time and make the origin clear to the operator.

## AI, address, and duplicate handling

- Gemini output is a draft, never a source of truth. Validate it against dynamic appeal
  and ticket-type catalogues, and keep low-confidence fields reviewable.
- Geocoding must use coordinates returned for the actual selected address. Never use a
  settlement-centre coordinate (`Lat_S`/`Long_S`) as a building coordinate when a more
  precise result is unavailable.
- Duplicate matching must be conservative. A broad word match or an address-only partial
  match cannot block ticket creation. The operator must always be able to mark a candidate
  as "not a duplicate" and continue, with the decision visible in UI state.

## Review output

- For each finding, state the concrete user or data impact, the relevant file/line, and
  the smallest safe correction.
- Flag missing/updated tests for parsing, geocoding, save-payload construction, duplicate
  decisions, and error handling. Do not demand tests for purely visual copy changes.
- Do not report formatting or subjective preferences when ESLint/TypeScript already cover
  them. Do not invent backend API behaviour without a response sample or contract.
