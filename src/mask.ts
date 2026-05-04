import { createHash } from "crypto";
import type { PiiFinding } from "./pii.js";

export type MaskStrategy = "redact" | "replace" | "token" | "hash";

const SYNTHETIC: Record<string, string> = {
  email: "user@example.com",
  phone: "+1 000 000 0000",
  phone_tr: "0500 000 00 00",
  national_id_tr: "00000000000",
  ssn: "000-00-0000",
  iban: "XX00 0000 0000 0000 0000 00",
  credit_card: "0000 0000 0000 0000",
  ip: "0.0.0.0",
  name: "AD SOYAD",
};

const VALID_STRATEGIES = new Set<MaskStrategy>(["redact", "replace", "token", "hash"]);

export function applyMask(
  text: string,
  findings: PiiFinding[],
  strategy: MaskStrategy = "redact"
): string {
  if (!VALID_STRATEGIES.has(strategy)) {
    throw new Error(`Unknown strategy "${strategy}". Use: redact, replace, token, hash`);
  }
  if (!text || findings.length === 0) return text ?? "";

  let result = text;
  const counter: Record<string, number> = {};

  // Apply in reverse order so earlier indices stay valid
  const sorted = [...findings].sort((a, b) => b.start - a.start);

  for (const finding of sorted) {
    const { type, value, start, end } = finding;
    counter[type] = (counter[type] ?? 0) + 1;
    const tag = type.toUpperCase();

    let replacement: string;
    if (strategy === "redact") {
      replacement = `[REDACTED_${tag}]`;
    } else if (strategy === "replace") {
      replacement = SYNTHETIC[type] ?? `[${tag}]`;
    } else if (strategy === "token") {
      replacement = `<PII_${tag}_${counter[type]}>`;
    } else {
      // hash
      const h = createHash("sha256").update(value).digest("hex").slice(0, 16);
      replacement = `[${h}]`;
    }

    result = result.slice(0, start) + replacement + result.slice(end);
  }

  return result;
}
