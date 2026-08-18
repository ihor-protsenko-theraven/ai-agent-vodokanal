# Changelog

All notable changes to this project are recorded in this file. The project uses
[Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

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
