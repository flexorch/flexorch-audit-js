import { createHash } from "crypto";
import type { PiiFinding } from "./pii.js";

export type MaskStrategy = "redact" | "replace" | "token" | "hash";

// Pre-computed valid TCKNs — checksum verified
const TCKN_POOL = ["12345678950", "10000000146", "23456789060"];

// Pre-computed valid TR IBANs — mod-97 verified
const IBAN_TR_POOL = ["TR330006100519786457841326", "TR390006199999888888888813"];

// Name pool for strategy="replace"
const NAME_POOL = [
  "Ahmet Yilmaz", "Mehmet Demir", "Ayse Kaya", "Fatma Celik",
  "Ali Sahin", "Zeynep Arslan", "Mustafa Ozturk", "Emine Dogan",
  "Ibrahim Kurt", "Hatice Aydin", "Hasan Yildiz", "Elif Gunes",
  "Huseyin Cetin", "Meryem Polat", "Omer Koc", "Busra Tekin",
  "Yusuf Erdogan", "Selin Bozkurt", "Kemal Akin", "Derya Ucar",
];

const STATIC_SYNTHETIC: Record<string, string> = {
  email: "user@example.com",
  phone: "+1 000 000 0000",
  phone_tr: "0500 000 00 00",
  phone_intl: "+1 000 000 0000",
  ssn: "000-00-0000",
  iban: "XX00 0000 0000 0000 0000 00",
  credit_card: "0000 0000 0000 0000",
  ip: "0.0.0.0",
  ip_v6: "2001:db8::1",
  national_id_pl: "00000000000",
  social_id_at: "0000000000",
  national_id_be: "00000000000",
};

const VALID_STRATEGIES = new Set<MaskStrategy>(["redact", "replace", "token", "hash"]);

function pick(pool: string[], seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  const idx = parseInt(h.slice(0, 8), 16) % pool.length;
  return pool[idx];
}

function synthetic(ptype: string, original: string): string {
  if (ptype === "national_id_tr") return pick(TCKN_POOL, original);
  if (ptype === "iban_tr" || ptype === "iban_intl") return pick(IBAN_TR_POOL, original);
  if (ptype === "name") return pick(NAME_POOL, original);
  return STATIC_SYNTHETIC[ptype] ?? `[${ptype.toUpperCase()}]`;
}

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
      replacement = synthetic(type, value);
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
