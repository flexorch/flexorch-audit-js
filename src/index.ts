/**
 * @flexorch/audit — zero-dependency PII + quality + noise audit for LLM datasets.
 *
 * @example
 * import { audit, mask } from "@flexorch/audit"
 * import { readFileSync } from "fs"
 *
 * const text = readFileSync("contract.txt", "utf8")
 * const result = audit(text)               // locale defaults to "und" (all detectors)
 * const result = audit(text, { locale: "tr" })  // Turkish-only detectors
 *
 * result.quality_grade      // "A"
 * result.quality_score      // 0.91
 * result.noise_ratio        // 0.03  (line-level noise fraction)
 * result.detected_language  // "und" (locale passed in — caller controls language)
 * result.pii_summary        // [{ type: "national_id_tr", count: 3 }, ...]
 *
 * // Raw findings and metrics also available:
 * result.pii             // [{ type, value, start, end }, ...]
 * result.quality         // { completeness, avg_length, duplicate_ratio }
 * result.noise           // { garbage_ratio, encoding_ok }
 *
 * const clean = mask(text, result.pii, { strategy: "redact" })
 * // "Contact: [REDACTED_EMAIL]"
 */

export type { PiiFinding } from "./pii.js";
export type { QualityMetrics } from "./quality.js";
export type { NoiseMetrics } from "./noise.js";
export type { MaskStrategy } from "./mask.js";
export { detectPii } from "./pii.js";
export { qualityMetrics } from "./quality.js";
export { noiseMetrics, noiseRatio } from "./noise.js";
export { applyMask } from "./mask.js";

import { detectPii, type PiiFinding } from "./pii.js";
import { qualityMetrics, type QualityMetrics } from "./quality.js";
import { noiseMetrics, noiseRatio, type NoiseMetrics } from "./noise.js";
import { applyMask, type MaskStrategy } from "./mask.js";

export const version = "0.6.0";

export type QualityGrade = "A" | "B" | "C" | "D";

export interface PiiSummaryEntry {
  type: string;
  count: number;
}

export interface AuditOptions {
  /**
   * Active locale-specific detectors.
   * - "und" — All detectors combined (default; use when language is unknown)
   * - "all" — Alias for "und"
   * - "tr"  — Turkish: TCKN, VKN, phone_tr, name, iban_tr, company_name_tr, mersis_no, postal_code_tr, province_tr
   * - "us"  — US: SSN, EIN, ITIN, E.164 phone, company_name_intl
   * - "eu"  — EU: E.164 phone, iban_intl, company_name_intl
   * - "de" / "fr" / "it" / "nl" / "es" / "uk" — country-specific detectors
   *
   * Universal detectors (email, iban, credit_card, ip, ip_v6) are always active.
   */
  locale?: string;
}

export interface AuditResult {
  /** A/B/C/D overall LLM-readiness grade. */
  quality_grade: QualityGrade;
  /** 0.0–1.0 composite score (completeness + length + noise). */
  quality_score: number;
  /** PII findings aggregated by type: [{ type, count }]. */
  pii_summary: PiiSummaryEntry[];
  /** Raw PII findings sorted by position: [{ type, value, start, end }]. */
  pii: PiiFinding[];
  quality: QualityMetrics;
  noise: NoiseMetrics;
  /** Fraction of lines that are blank or contain symbol noise (>0.20 = low quality). */
  noise_ratio: number;
  /** The locale value passed to audit() — caller-controlled language selection. */
  detected_language: string;
}

export interface MaskOptions {
  /** @default "redact" */
  strategy?: MaskStrategy;
}

function computeQualityScore(
  completeness: number,
  avgLength: number,
  garbageRatio: number
): number {
  const lengthScore = Math.min(avgLength / 500, 1.0);
  const noiseScore = Math.max(0.0, 1.0 - garbageRatio * 10);
  return Math.round(completeness * (0.4 * noiseScore + 0.4 * lengthScore + 0.2) * 10000) / 10000;
}

function computeQualityGrade(score: number): QualityGrade {
  if (score >= 0.85) return "A";
  if (score >= 0.65) return "B";
  if (score >= 0.40) return "C";
  return "D";
}

/**
 * Audit *text* for LLM dataset readiness.
 */
export function audit(text: string, options: AuditOptions = {}): AuditResult {
  const locale = options.locale ?? "und";
  const pii = detectPii(text, locale);
  const quality = qualityMetrics(text);
  const noise = noiseMetrics(text);
  const noise_ratio = noiseRatio(text);

  const quality_score = computeQualityScore(
    quality.completeness,
    quality.avg_length,
    noise.garbage_ratio
  );
  const quality_grade = computeQualityGrade(quality_score);

  const counts = new Map<string, number>();
  for (const f of pii) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
  const pii_summary: PiiSummaryEntry[] = Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => ({ type, count }));

  return { quality_grade, quality_score, pii_summary, pii, quality, noise, noise_ratio, detected_language: locale };
}

export interface BatchAuditResult {
  /** One AuditResult per input text, in order. */
  results: AuditResult[];
  /** Fraction of texts that are exact duplicates (0.0–1.0). */
  duplicate_ratio: number;
  /** PII counts aggregated across all texts. */
  pii_summary: PiiSummaryEntry[];
  /** Mean quality_score across all texts. */
  avg_quality_score: number;
}

/**
 * Audit a list of texts and aggregate metrics — including duplicate_ratio.
 */
export function auditBatch(texts: string[], options: AuditOptions = {}): BatchAuditResult {
  if (texts.length === 0) {
    return { results: [], duplicate_ratio: 0, pii_summary: [], avg_quality_score: 0 };
  }

  const results = texts.map((t) => audit(t, options));

  const seen = new Set<string>();
  let dupCount = 0;
  for (const t of texts) {
    if (seen.has(t)) dupCount++;
    else seen.add(t);
  }
  const duplicate_ratio = Math.round((dupCount / texts.length) * 10000) / 10000;

  const allPii = results.flatMap((r) => r.pii);
  const counts = new Map<string, number>();
  for (const f of allPii) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
  const pii_summary: PiiSummaryEntry[] = Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => ({ type, count }));

  const avg_quality_score =
    Math.round((results.reduce((sum, r) => sum + r.quality_score, 0) / results.length) * 10000) / 10000;

  return { results, duplicate_ratio, pii_summary, avg_quality_score };
}

/**
 * Apply masking to PII findings in *text*.
 */
export function mask(text: string, findings: PiiFinding[], options: MaskOptions = {}): string {
  return applyMask(text, findings, options.strategy ?? "redact");
}

/**
 * Async generator that audits texts one at a time from an async iterable.
 *
 * Yields one AuditResult per input text. Processing is sequential.
 *
 * @example
 * async function* lines() {
 *   for (const line of data) yield line;
 * }
 * for await (const result of auditStream(lines())) {
 *   console.log(result.quality_grade, result.pii_summary);
 * }
 */
export async function* auditStream(
  texts: AsyncIterable<string>,
  options: AuditOptions = {}
): AsyncGenerator<AuditResult> {
  for await (const text of texts) {
    yield audit(text, options);
  }
}

export type RiskLevel = "none" | "low" | "medium" | "high";

export interface ComplianceReport {
  has_pii: boolean;
  pii_types: string[];
  risk_level: RiskLevel;
  masking_required: boolean;
  recommendations: string[];
}

const HIGH_RISK_TYPES = new Set([
  "national_id_tr", "ssn", "credit_card",
  "national_id_pl", "national_id_be", "social_id_at",
  "social_id_de", "social_id_uk", "national_id_it",
  "national_id_nl", "national_id_es", "national_id_us",
  "tax_id_tr", "tax_id_de",
]);

const MEDIUM_RISK_TYPES = new Set([
  "email", "phone_tr", "phone_intl", "iban", "iban_tr", "iban_intl", "name",
]);

/**
 * Generate a KVKK/GDPR compliance summary for an AuditResult.
 *
 * This is a technical summary only — not a legal document or regulatory opinion.
 */
export function complianceReport(result: AuditResult): ComplianceReport {
  const types = [...new Set(result.pii.map((f) => f.type))].sort();

  let risk_level: RiskLevel = "none";
  if (types.length > 0) {
    if (types.some((t) => HIGH_RISK_TYPES.has(t))) risk_level = "high";
    else if (types.some((t) => MEDIUM_RISK_TYPES.has(t))) risk_level = "medium";
    else risk_level = "low";
  }

  const recommendations: string[] = [];
  if (risk_level === "high" || risk_level === "medium") {
    recommendations.push("Apply mask({ strategy: 'redact' }) before storing or sharing this text.");
  }
  if (risk_level === "high") {
    recommendations.push(
      "Review applicable regulations (KVKK Art. 6, GDPR Art. 9) for special category data handling."
    );
  }
  if (recommendations.length === 0) {
    recommendations.push("No PII detected — text is safe for LLM processing.");
  }

  return {
    has_pii: types.length > 0,
    pii_types: types,
    risk_level,
    masking_required: types.length > 0,
    recommendations,
  };
}
