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
