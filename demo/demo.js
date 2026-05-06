import { audit, mask } from "../dist/index.js";

const TEXT = `\
Contract #1042  —  Employment Agreement

Full Name: Ali Yıldız
TC Kimlik: 12345678950
E-mail: ali.yildiz@flexorch.com
IBAN: TR330006100519786457841326

This agreement governs the employment relationship between
Flexorch Technology and the employee named above, including
confidentiality obligations and IP assignment clauses.
`;

const result = audit(TEXT, { locale: "tr" });

console.log();
console.log(`  Grade  : ${result.quality_grade}   (score: ${result.quality_score})`);
console.log(`  PII    : ${result.pii.length} finding(s)`);
for (const s of result.pii_summary) {
  console.log(`           ${s.type.padEnd(22)} ×${s.count}`);
}
console.log();
console.log("  Masked output:");
const clean = mask(TEXT, result.pii, { strategy: "redact" });
for (const line of clean.trim().split("\n")) {
  console.log(`  ${line}`);
}
console.log();
