/**
 * Basic @flexorch/audit usage — single document.
 *
 * Run:
 *   node examples/basicAudit.js
 */
import { audit, mask } from "../dist/index.js";

const SAMPLE_TEXT = `
Employment Agreement — Flexorch Technology

Employee: Adı Soyadı: Ali Yıldız
TC Kimlik No: 12345678950
E-posta: ali.yildiz@example.com
IBAN: TR330006100519786457841326

This agreement is entered into between Flexorch Technology and the above employee.
The terms outlined herein govern the employment relationship, including confidentiality,
intellectual property, and termination clauses. Both parties agree to comply with
applicable laws and regulations, including KVKK (Turkish Personal Data Protection Law).
`;

const result = audit(SAMPLE_TEXT, { locale: "tr" });

console.log("Quality grade :", result.quality_grade);
console.log("Quality score :", result.quality_score);
console.log("PII summary   :", result.pii_summary);
console.log("Noise         :", result.noise);
console.log();

if (result.pii_summary.length > 0) {
  console.log("Masked output:");
  const clean = mask(SAMPLE_TEXT, result.pii, { strategy: "redact" });
  console.log(clean);
}
