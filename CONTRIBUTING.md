# Contributing to @flexorch/audit

Thank you for your interest in contributing. This is a small, focused library — contributions that stay within the core scope (PII detection, quality grading, noise metrics, masking) are most welcome.

## Scope

@flexorch/audit is intentionally narrow:
- **In scope:** new PII detector types, improved regex patterns, additional locale support, masking strategies, quality/noise metric improvements.
- **Out of scope:** file parsing (PDF, DOCX), ML/NER-based detection, HTTP clients, CLI tools, external dependencies.

Zero runtime dependencies is a hard constraint.

## Getting started

```bash
git clone https://github.com/flexorch/flexorch-audit-js
cd flexorch-audit-js
npm install
npm run build
npm test
```

## Making changes

1. Fork the repository and create a branch: `git checkout -b feat/your-change`
2. Write tests first — all new behaviour must be covered in `tests/`.
3. Run the test suite: `npm test` — it must pass with 0 failures.
4. Open a pull request with a clear description of what changes and why.

## Adding a PII detector

1. Add the regex (and optional validator) to `src/pii.ts`.
2. Register the detector type in `LOCALE_DETECTORS` or `UNIVERSAL`.
3. Add it to the `detectPii()` dispatcher.
4. Add tests in `tests/pii.test.js` — include at least one true positive and one false positive that should NOT match.
5. Document the new type in the PII types table in `README.md`.

## Code style

- TypeScript strict mode — no `any`.
- No runtime dependencies beyond Node.js built-ins.
- Run `npm run build` before committing to verify the TypeScript compiles.

## Reporting issues

Please open a GitHub issue with:
- The text sample (anonymised or synthetic) that triggered the problem.
- Expected vs. actual output.
- Node.js version and OS.
