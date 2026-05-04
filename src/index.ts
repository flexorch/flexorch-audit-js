/**
 * @flexorch/audit — zero-dependency PII + quality + noise audit for LLM datasets.
 *
 * @example
 * import { audit, mask } from "@flexorch/audit"
 *
 * const result = audit(text, { locale: "tr" })
 * // {
 * //   pii: [{ type: "email", value: "ali@example.com", start: 8, end: 23 }],
 * //   quality: { completeness: 1.0, avg_length: 342, duplicate_ratio: null },
 * //   noise: { garbage_ratio: 0.0, encoding_ok: true },
 * // }
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
export { noiseMetrics } from "./noise.js";
export { applyMask } from "./mask.js";

import { detectPii, type PiiFinding } from "./pii.js";
import { qualityMetrics, type QualityMetrics } from "./quality.js";
import { noiseMetrics, type NoiseMetrics } from "./noise.js";
import { applyMask, type MaskStrategy } from "./mask.js";

export const version = "0.1.0";

export interface AuditOptions {
  /**
   * Active locale-specific detectors.
   * - "tr"  — Turkish: TCKN, phone_tr, name  (default)
   * - "us"  — US: SSN, E.164 phone
   * - "eu"  — EU: E.164 phone
   * - "all" — All detectors
   *
   * Universal detectors (email, iban, credit_card, ip) are always active.
   */
  locale?: string;
}

export interface AuditResult {
  pii: PiiFinding[];
  quality: QualityMetrics;
  noise: NoiseMetrics;
}

export interface MaskOptions {
  /** @default "redact" */
  strategy?: MaskStrategy;
}

/**
 * Audit *text* for LLM dataset readiness.
 */
export function audit(text: string, options: AuditOptions = {}): AuditResult {
  const locale = options.locale ?? "tr";
  return {
    pii: detectPii(text, locale),
    quality: qualityMetrics(text),
    noise: noiseMetrics(text),
  };
}

/**
 * Apply masking to PII findings in *text*.
 */
export function mask(text: string, findings: PiiFinding[], options: MaskOptions = {}): string {
  return applyMask(text, findings, options.strategy ?? "redact");
}
