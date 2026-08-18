# Changelog

All notable changes to this project are recorded in this file. The project uses
[Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

## [2.8.0](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/compare/v2.7.0...v2.8.0) (2026-08-18)


### Features

* add ruleset basic ([3f3eeb9](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/commit/3f3eeb9bf7cbc070cf71d089eff003bd989e6b9c))

## [2.7.0](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/compare/v2.6.0...v2.7.0) (2026-08-18)


### Features

* add reviewer ([847af26](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/commit/847af26420c071d9662f2e4a7bdb421630a9bbbf))
* add reviewer ([be47945](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/commit/be47945ded213d342da23d0a2b030da5d286ac99))


### Bug Fixes

* synchronize npm lockfile ([51a9857](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/commit/51a98578b15c0b6176481e2e10cc605e6eaeda02))

## [2.6.0](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/compare/v2.5.0...v2.6.0) (2026-08-18)


### Features

* improve ai instruction and fix parsing issues ([14a348c](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/commit/14a348ce5ace80eb831cf553faa0106475f8f413))
* improve ai instruction and fix parsing issues ([f3aa34d](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/commit/f3aa34d6bb14408398d9039f70fe2b7d6409d885))

## [2.5.0](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/compare/v2.4.0...v2.5.0) (2026-08-18)


### Features

* improve ticket parsing ([c013d77](https://github.com/ihor-protsenko-theraven/ai-agent-vodokanal/commit/c013d776f9e1c50cb59076debbab3778a351ac7b))

## [Unreleased]

## [2.4.0] - 2026-08-18

### Added

- Pinned Gemini 3.7 Flash, 3.6 Flash, and 3.5 Flash-Lite parsing chain based
  on the models available to the project API key.
- Feature-first TypeScript source structure.
- Build identity badge with semantic version, source revision, environment,
  build timestamp, and Vercel deployment ID.
- Gemini model fallback chain and local transcript parser fallback.
- Unclosed WSN ticket drawer, date sorting, and conservative duplicate checks.

### Fixed

- Forland proxy content-encoding handling for Vercel deployments.
- Address coordinate resolution and ticket-save response feedback.
