/**
 * Bulk dataset audit — aggregate quality stats and duplicate ratio.
 *
 * Useful when you have a list of extracted text records (e.g., from a JSONL file)
 * and want to triage them before loading into a fine-tuning or RAG pipeline.
 *
 * Run:
 *   node examples/bulkAudit.js
 */
import { audit } from "../dist/index.js";

const RECORDS = [
  "The transformer architecture introduced self-attention, enabling parallel processing " +
    "of sequences and significantly improving performance on NLP tasks.",
  "IBAN: TR330006100519786457841326 — please transfer funds by Friday.",
  "   ", // empty / whitespace only
  "The transformer architecture introduced self-attention, enabling parallel processing " +
    "of sequences and significantly improving performance on NLP tasks.", // duplicate
  "Retrieval-augmented generation (RAG) combines a retrieval component with a generative " +
    "model, allowing the system to ground responses in external knowledge bases.",
];

const results = RECORDS.map((r) => audit(r, { locale: "tr" }));

// Duplicate ratio across the dataset
const seen = new Set();
let duplicates = 0;
for (const r of RECORDS) {
  const key = r.trim();
  if (seen.has(key)) duplicates++;
  else seen.add(key);
}
const duplicateRatio = (duplicates / RECORDS.length).toFixed(4);

console.log("#    Grade   Score    PII   Record preview");
console.log("-".repeat(65));
RECORDS.forEach((record, i) => {
  const r = results[i];
  const preview = record.trim().slice(0, 40).replace(/\n/g, " ") || "(empty)";
  console.log(
    `${String(i).padEnd(4)} ${r.quality_grade.padEnd(7)} ${String(r.quality_score).padEnd(8)} ${String(r.pii.length).padEnd(5)} ${preview}`
  );
});

console.log();
console.log(`Duplicate ratio (dataset-level): ${duplicateRatio}`);
const grades = results.map((r) => r.quality_grade);
for (const g of ["A", "B", "C", "D"]) {
  console.log(`  Grade ${g}: ${grades.filter((x) => x === g).length} record(s)`);
}
