# @flexorch/audit

Zero-dependency PII + quality + noise audit for LLM datasets. Answers one question: **is this dataset ready for LLM training?**

- **Quality grade** — A/B/C/D score that signals LLM-readiness at a glance
- **PII detection** — email, phone (TR + E.164), credit card (Luhn), IPv4/IPv6, TCKN, VKN, IBAN (mod-97), SSN, label-prefixed names
- **Quality metrics** — completeness, average length, duplicate ratio
- **Noise metrics** — garbage character ratio, encoding health
- **Masking** — redact / replace / token / hash strategies
- **Zero runtime dependencies** — pure Node.js built-ins, Node 18+

```ts
import { audit, auditBatch, mask } from "@flexorch/audit"
import { readFileSync } from "fs"

const text = readFileSync("contract.txt", "utf8")
const result = audit(text, { locale: "tr" })

result.quality_grade   // "A"
result.quality_score   // 0.91  (0.0–1.0 composite)
result.pii_summary     // [{ type: "national_id_tr", count: 3 }, { type: "email", count: 1 }]

// Raw findings and metrics — also available:
result.pii             // [{ type: "email", value: "...", start: 8, end: 23 }]
result.quality         // { completeness: 1.0, avg_length: 342, duplicate_ratio: null }
result.noise           // { garbage_ratio: 0.0, encoding_ok: true }

const clean = mask(text, result.pii, { strategy: "redact" })
// "Contact: [REDACTED_EMAIL]"
```

## Install

```bash
npm install @flexorch/audit
```

![demo](assets/demo.svg)

## Locale support

| `locale` | Active detectors |
|----------|-----------------|
| `"tr"` (default) | email, iban, credit_card, ip, ip_v6 + TCKN, VKN, phone_tr, name |
| `"us"` | email, iban, credit_card, ip, ip_v6 + SSN, E.164 phone |
| `"eu"` | email, iban, credit_card, ip, ip_v6 + E.164 phone |
| `"all"` | All of the above (phone_tr takes precedence over generic phone) |

## PII types

| Type | Description | Locale |
|------|-------------|--------|
| `email` | RFC-5321 address | all |
| `iban` | ISO 13616 IBAN — mod-97 checksum validated | all |
| `credit_card` | 16-digit groups, Luhn-validated | all |
| `ip` | IPv4 address | all |
| `ip_v6` | IPv6 address (full, compressed, loopback) | all |
| `phone_tr` | Turkish mobile (+90/0 prefix + 10 digits) | tr |
| `national_id_tr` | TCKN — 11-digit modular arithmetic checksum | tr |
| `tax_id_tr` | VKN — 10-digit Luhn-variant checksum | tr |
| `name` | Label-prefixed name (e.g. "Adı: Ali Yıldız", "Full Name: Jane Doe") | tr |
| `phone` | E.164 international phone | us, eu |
| `ssn` | US Social Security Number (###-##-####) | us |

## Batch audit

Use `auditBatch()` to audit a list of texts and get aggregate metrics — including `duplicate_ratio`:

```ts
import { auditBatch } from "@flexorch/audit"

const texts = dataset.map((r) => r.text)
const batch = auditBatch(texts, { locale: "tr" })

batch.duplicate_ratio    // 0.12  — fraction of exact-duplicate records
batch.avg_quality_score  // 0.78
batch.pii_summary        // [{ type: "email", count: 47 }, ...]
batch.results            // AuditResult[], one per text
```

## Masking strategies

| Strategy | Example output |
|----------|----------------|
| `redact` (default) | `[REDACTED_EMAIL]` |
| `replace` | `user@example.com` (realistic synthetic) |
| `token` | `<PII_EMAIL_1>` (unique per type) |
| `hash` | `[3d4f9a1b2c8e7f0a]` (SHA-256 first 16 hex chars) |

## TypeScript

Full type definitions included. No `@types/` package needed.

```ts
import {
  audit, auditBatch, mask,
  type AuditResult, type BatchAuditResult, type PiiFinding,
} from "@flexorch/audit"
```

## Quality grade

The `quality_grade` (A–D) and `quality_score` (0.0–1.0) are composite signals derived from three dimensions:

| Grade | Score | Meaning |
|-------|-------|---------|
| A | ≥ 0.85 | Ready for LLM training or RAG |
| B | ≥ 0.65 | Usable with minor cleanup |
| C | ≥ 0.40 | Needs review before use |
| D | < 0.40 | Not suitable — empty, too short, or high noise |

Score formula: `completeness × (0.4 × noiseScore + 0.4 × lengthScore + 0.2)`
where `lengthScore = Math.min(charCount / 500, 1.0)` and `noiseScore = Math.max(0, 1 − garbageRatio × 10)`.

## Limitations (v0.4)

- Free-standing name detection (without a label prefix) requires NLP/NER — not included.
- `replace` masking strategy uses static synthetic values; per-type realistic synthesis is not yet implemented.

## Also available for Python

```bash
pip install flexorch-audit
```

## License

MIT
