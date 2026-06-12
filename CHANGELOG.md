# Changelog

All notable changes to @flexorch/audit are documented here.
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.8.0] — 2026-06-12

### Added

**New PII detectors (TR SGK + EU PL/PT/SE/DK/FI)**

| Detector | Locale | Field | Algorithm |
|----------|--------|-------|-----------|
| `sgk_no` | `tr` | SGK Sicil Numarası | Label-prefix (`SGK No:`, `SSK No:`, `Sigortalı No:`) |
| `tax_id_pl` | `pl` | NIP (Numer Identyfikacji Podatkowej) | Label-prefix (`NIP:`) |
| `tax_id_pt` | `pt` | NIF (Número de Identificação Fiscal) | Label-prefix + mod-11 checksum |
| `national_id_se` | `sv` | Personnummer | Format `YYMMDD[-+]NNNN` or `YYYYMMDD-NNNN` |
| `national_id_dk` | `da` | CPR (Civil Personal Register) | Format `DDMMYY-XXXX` |
| `national_id_fi` | `fi` | HETU (Henkilötunnus) | Format `DDMMYY[+\-A]\d{3}[checksum]` |

Also:
- `tax_id_pl` added to `pl` locale detector set
- `national_id_be` added to `fr` and `nl` locale detector sets (Belgium is bilingual)
- `sgk_no` added to `tr` locale detector set
- 19 new tests across all new locales

---

## [0.7.0] — 2026-06-11

### Added

- **`redactForLlm(text, options)`** — one-shot audit + mask convenience wrapper; returns PII-free text ready for LLM processing in a single call
- **`estimateTokens(text)`** — word-based token count heuristic (words × 4/3); no external dependencies; accuracy ~15% for planning/cost estimates

---

## [0.6.0] — 2026-05-24

### Added

**New PII detectors (EU locales)**

| Detector | Locale | Field | Algorithm |
|----------|--------|-------|-----------|
| `national_id_pl` | `pl` | PESEL | 10-weight checksum, weights `[1,3,7,9,1,3,7,9,1,3]` |
| `social_id_at`   | `at` | Sozialversicherungsnummer | Luhn-style, 10 weights, check at position 3 |
| `national_id_be` | `be` | Rijksregisternummer/NISS | mod-97, pre- and post-2000 birth year branches |

All three are also active in the `und`/`all` locale.

**`auditStream()` — async generator API**

```typescript
for await (const result of auditStream(gen())) {
  console.log(result.quality_grade, result.pii_summary);
}
```

Audits texts one at a time from any `AsyncIterable<string>`.

**`complianceReport()` — KVKK/GDPR risk summary**

```typescript
const report = complianceReport(audit(text));
report.risk_level       // "none" | "low" | "medium" | "high"
report.masking_required // true when any PII was found
report.recommendations  // string[]
```

Risk classification:
- **high** — national IDs, SSN, credit card, tax IDs
- **medium** — email, phone, IBAN, name
- **low** — company names and other lower-risk types
- **none** — no PII detected

**`mask({ strategy: "replace" })` — deterministic synthetic values**

`replace` now produces checksum-valid synthetic replacements:

| PII type | Synthetic value |
|----------|----------------|
| `national_id_tr` | valid TCKN (checksum verified) |
| `iban_tr` / `iban_intl` | valid TR IBAN (mod-97 verified) |
| `name` | name from pool |
| `email`, `phone_tr`, `ssn`, `ip`, `ip_v6`, … | static safe values |

Replacement is deterministic: same original value always maps to the same synthetic replacement (SHA-256 seed).

---

## [0.5.1] — 2026-05-14

### Fixed

- Import declarations and type exports cleaned up for strict ESM/CJS dual build

---

## [0.5.0] — 2026-05-13

### Added

- `noise_ratio` field in `AuditResult`
- `detected_language` field in `AuditResult`
- `locale: "und"` default (all detectors active when language is unknown)
- EU locale detectors: `de`, `fr`, `it`, `nl`, `es`, `uk`
- `auditBatch()` — batch processing with `duplicate_ratio` and `avg_quality_score`
