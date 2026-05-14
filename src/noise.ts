export interface NoiseMetrics {
  garbage_ratio: number;
  encoding_ok: boolean;
}

const SAFE_WHITESPACE = new Set([" ", "\t", "\n", "\r", "\x0b", "\x0c"]);
const REPLACEMENT_CHAR = "�";

function isGarbage(ch: string): boolean {
  if (SAFE_WHITESPACE.has(ch)) return false;
  const cp = ch.codePointAt(0) ?? 0;
  // Control characters (U+0000–U+001F, U+007F–U+009F), private use, surrogates
  return (
    ch === REPLACEMENT_CHAR ||
    cp <= 0x1f ||
    (cp >= 0x7f && cp <= 0x9f) ||
    (cp >= 0xe000 && cp <= 0xf8ff) || // private use area
    (cp >= 0xd800 && cp <= 0xdfff)    // surrogates
  );
}

const LINE_NOISE_RE = /[@#!~*=]{3,}/;

/**
 * Fraction of lines that are blank or contain symbol noise (`[@#!~*=]{3+}`).
 * Mirrors the FlexOrch pipeline quality-step threshold — values above 0.20
 * indicate a document likely to reduce extraction quality.
 */
export function noiseRatio(text: string): number {
  if (!text) return 0.0;
  const lines = text.split("\n");
  const total = lines.length;
  if (total === 0) return 0.0;
  const noisy = lines.filter((line) => !line.trim() || LINE_NOISE_RE.test(line)).length;
  return Math.round((noisy / total) * 10000) / 10000;
}

export function noiseMetrics(text: string): NoiseMetrics {
  if (!text) return { garbage_ratio: 0.0, encoding_ok: true };

  const n = text.length;
  let garbage = 0;
  for (const ch of text) {
    if (isGarbage(ch)) garbage++;
  }

  return {
    garbage_ratio: Math.round((garbage / n) * 10000) / 10000,
    encoding_ok: !text.includes(REPLACEMENT_CHAR),
  };
}
