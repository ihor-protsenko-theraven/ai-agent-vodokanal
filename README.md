# 💧 WSN Water Utility AI Dispatcher

A native TypeScript application for handling Water Utility requests. An operator
dictates or enters a request, the system prepares a WSN class `27772` ticket
draft, resolves the address and coordinates, conservatively checks unclosed
tickets, and saves the result to Forland.

## Features

- Ukrainian audio and text processing through Gemini or a local transcript
  parser.
- A closed catalogue of appeal and ticket types, kept in sync with `wsnConfig`;
  Gemini may return only values accepted by the form.
- AI fallback chain: `gemini-3.7-flash` → `gemini-3.6-flash` →
  `gemini-3.5-flash-lite` → local parser. If no transcript is available, the
  final fallback is a demo scenario.
- Address lookup through Geodata.online with Nominatim fallback. Coordinates
  come only from a geocoder response or deliberate operator input; city-centre
  coordinates are never used as an exact address location.
- The **Unclosed WSN tickets** drawer displays ID, title, address, coordinates,
  creation date derived from `LogID`, and date sorting.
- Conservative duplicate detection by address, coordinates, and appeal type. It
  never fabricates a ticket when Forland is unavailable.
- New ticket creation through `CreateNewUnit` and saving through `Unit/Save`
  while preserving template system fields.

## Stack

- Strict TypeScript, Vite, DOM API, Tailwind CSS.
- Vercel Serverless Functions for the Gemini and Forland proxies.
- Gemini API, Forland API, Geodata.online, OpenStreetMap Nominatim.
- Vitest for unit testing.

## Source layout

```text
src/
├── app/                    # Bootstrap, application shell, session state, shared UI
├── features/
│   ├── tickets/            # Form, duplicate detection, unclosed-ticket drawer
│   ├── voice/              # Gemini, local NLP, transcript UI
│   ├── geocoding/          # Orchestration, Geodata and Nominatim adapters
│   └── forland/            # API client, dropdowns, Save request mapping
├── shared/                 # Configuration, types, and pure utilities
├── main.ts                 # Vite entry point
└── style.css

api/
├── gemini.js               # Server-side Gemini proxy
└── forland.js              # Server-side Forland proxy
```

Unit tests live next to the module under test: `SomeModule.ts` and
`SomeModule.test.ts`. Future integration and E2E tests belong in the root
`tests/` directory. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module
boundaries and import rules.

## Prerequisites

- Node.js 18 or newer.
- `npm install`.
- An operator account for logging in to Forland through the application.

## Local development

```powershell
npm install
npm run dev:local
```

The app is available at `http://localhost:3000`. This mode uses the Vite
Forland proxy (`/forland`) and the local parser, so it does not require a
Gemini key.

> There is no `npm run dev` script. Do not use `npx run dev`; the regular local
> development command is `npm run dev:local`.

### Local testing with real Gemini

Gemini is accessed through the server-side `/api/gemini` route. Use the Vercel
runtime to test it locally:

```powershell
npm run dev:vercel
```

The Vercel Development environment, or a local server-side environment, must
provide:

```dotenv
GEMINI_API_KEY=...                 # No VITE_ prefix; never exposed to the browser
VITE_AI_MODE=gemini
VITE_FORLAND_PROXY_MODE=vercel
```

Restart the development server after changing a `VITE_*` variable. On a Gemini
`429` response, the application tries the Flash-Lite models and then processes
the available transcript locally.

## Environment variables

| Variable | Required in | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Vercel / `vercel dev` | Server-only Gemini key. Add it as a Sensitive variable. |
| `VITE_AI_MODE` | Browser build | `local` for Vite mode; `gemini` for Vercel runtime. |
| `VITE_FORLAND_PROXY_MODE` | Browser build | `vite` for `dev:local`; `vercel` for `dev:vercel` and production. |

Do not put a Gemini key in `VITE_GEMINI_API_KEY`: every `VITE_*` variable is
embedded in the browser bundle.

## Production deployment on Vercel

1. Import the repository into Vercel.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Add `GEMINI_API_KEY` as a Sensitive variable for Preview and Production.
4. Explicitly set `VITE_AI_MODE=gemini` and
   `VITE_FORLAND_PROXY_MODE=vercel`.
5. Deploy. Production calls Forland only through `/api/forland/*` and Gemini
   through `/api/gemini`.

The Forland proxy rewrites cookies for the same domain and removes the upstream
`Content-Encoding` header so the browser does not receive
`ERR_CONTENT_DECODING_FAILED` with an HTTP `200` response.

## Releases and build identity

`package.json.version` is the single semantic version source. Every Vite build
embeds a read-only identity object containing:

- semantic version;
- short Git commit SHA;
- deployment environment (`local`, `preview`, or `production`);
- build timestamp;
- Vercel deployment ID, when available.

The compact `vX.Y.Z · revision` badge is visible on both the login page and the
authenticated application header. Hover it to see the full metadata. This makes
an operator screenshot or bug report traceable to one exact deployment.

For Vercel builds, enable **Automatically expose System Environment Variables**
in Project Settings → Environment Variables. The build reads
`VERCEL_GIT_COMMIT_SHA`, `VERCEL_ENV`, and `VERCEL_DEPLOYMENT_ID`; local builds
show `local` instead. See the [Vercel system environment variables
documentation](https://vercel.com/docs/environment-variables/system-environment-variables).

### Automated releases

The [Release Please](.github/workflows/release-please.yml) workflow runs after
every push to `main`. It maintains one Release PR based on Conventional Commit
messages. When that PR is merged, it automatically:

- bumps `package.json` and `package-lock.json` according to SemVer;
- generates the matching `CHANGELOG.md` entry;
- creates the Git tag (`vX.Y.Z`) and GitHub Release.

Vercel creates a preview deployment for the Release PR and a production
deployment after it is merged into `main`.

Release Please reads the commit that actually lands in `main`. As this project
uses squash merge, set the **final squash commit title** to the appropriate
Conventional Commit message, even if temporary commits in the feature branch
have other names.

Use these prefixes for releasable work:

```text
fix: serialize Forland coordinates as EPSG 4326  # patch: 2.8.0 → 2.8.1
feat: add ticket edit workflow                    # minor: 2.8.0 → 2.9.0
feat!: change ticket API contract                 # major: 2.8.0 → 3.0.0
```

Use `fix:`, `feat:`, or a breaking-change marker for changes that should affect
the published version; this keeps the version bump predictable for reviewers.
Use `fix:` for a production bug correction, even when the implementation is a
small refactor. For example, correcting a coordinate projection is a `fix:`,
not a `refactor:`.

The following prefixes do **not** create a Release Please PR by themselves:

```text
refactor:  internal restructuring with no user-visible correction
docs:      documentation-only change
test:      test-only change
chore:     maintenance or tooling change
ci:        workflow change
style:     formatting-only change
```

The manifest starts at the existing `2.8.0` project version and the current
Git revision, so historical commits are not treated as a new release.

For the first run, GitHub repository administrators must allow workflow write
permissions in **Settings → Actions → General → Workflow permissions**. If
GitHub blocks creation of the Release PR, also enable **Allow GitHub Actions to
create and approve pull requests** on that page.

## Verification commands

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` already runs `typecheck`. The pull-request workflow runs lint,
tests, and build on Node.js 22. `lint:ci` also preserves the current warning
baseline, so a change cannot introduce additional code-smell warnings.

## Troubleshooting

- `npx run dev` — this is not a valid project command; use
  `npm run dev:local`.
- `503 /api/gemini` — `GEMINI_API_KEY` is missing from the selected Vercel
  environment, or Vite is running without `vercel dev`.
- `429 RESOURCE_EXHAUSTED` — the Gemini quota is exhausted. The fallback chain
  runs automatically; production workloads need Gemini billing or another AI
  provider.
- `ERR_CONTENT_DECODING_FAILED` on `/api/forland/*` — deploy the current
  `api/forland.js`; it removes the conflicting encoding header.
- Forland errors in Vite mode — make sure `npm run dev:local` is running and
  `VITE_FORLAND_PROXY_MODE=vite`.

## WSN mapping

- Ticket class: `27772`.
- New ticket state: `5996` (`На виконання`).
- Main properties: `f1958` appeal type, `f1972` ticket type, `f_389` incident
  address, `f_420` coordinates, `f1258` incident time, and `f328` notes.

A successful `Unit/Save` response displays the ticket number from `Title`, the
WSN ID, and the class. Personal data is not displayed in the confirmation
dialog.

## License

Internal Water Utility project. © 2026.
