// ── Universal patterns ───────────────────────────────────────────────────────

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// E.164 international phone — requires + prefix, 10+ total digits
const PHONE_INTL_RE = /\+\d{1,3}[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{4}\b/g;

// IBAN — ISO 13616 (all countries); mod-97 validated below
const IBAN_RE = /\b[A-Z]{2}\d{2}[0-9A-Z]{11,30}\b/g;

// Credit card — 16 digits with separator groups (Luhn-validated)
const CC_RE = /\b\d{4}[ \-]\d{4}[ \-]\d{4}[ \-]\d{4}\b/g;

// IPv4
const IPV4_RE =
  /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;

// IPv6 — full, compressed (::), and loopback forms
const _H = "[0-9a-fA-F]{1,4}";
const IPV6_RE = new RegExp(
  `(?<![:\\.\\w])` +
  `(?:` +
  `(?:${_H}:){7}${_H}` +                      // full 8 groups
  `|(?:${_H}:){1,7}:` +                        // trailing :: e.g. 2001:db8::
  `|::(?:(?:${_H}:){0,6}${_H})?` +             // leading :: e.g. ::1
  `|(?:${_H}:){1,6}:${_H}` +                   // one :: in middle
  `|(?:${_H}:){1,5}(?::${_H}){1,2}` +
  `|(?:${_H}:){1,4}(?::${_H}){1,3}` +
  `|(?:${_H}:){1,3}(?::${_H}){1,4}` +
  `|(?:${_H}:){1,2}(?::${_H}){1,5}` +
  `|${_H}:(?::${_H}){1,6}` +
  `)` +
  `(?![:\\.\\w])`,
  "gi"
);

// ── Turkish patterns ─────────────────────────────────────────────────────────

const PHONE_TR_RE = /\b(?:\+90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}\b/g;

// TCKN — 11 digits, first non-zero, modular arithmetic checksum
const TCKN_RE = /\b([1-9]\d{10})\b/g;

// VKN — 10 digits, first non-zero, Luhn-variant checksum
const VKN_RE = /\b([1-9]\d{9})\b/g;

const NAME_PREFIX_TR =
  "(?:Ad[ıi]\\s*(?:Soyad[ıi])?|Soyad[ıi]|İsim|" +
  "Müşteri\\s+Ad[ıi]|Yetkili(?:\\s+Kişi)?|Çalışan\\s+Ad[ıi]|" +
  "Personel\\s+Ad[ıi]|Kişi\\s+Ad[ıi]|Satıcı\\s+Ad[ıi]|" +
  "Alıcı\\s+Ad[ıi]|İlgili\\s+Kişi|Hesap\\s+Sahibi)";
const NAME_PREFIX_EN =
  "(?:Full\\s+Name|Customer\\s+Name|Employee\\s+Name|" +
  "Contact\\s+Name|Authorized\\s+(?:By|Person)|Account\\s+Holder|" +
  "(?<!\\bUser\\s)Name)";
const NAME_VALUE = "([A-ZÇĞİÖŞÜ][a-zçğışöşü]+(?:\\s+[A-ZÇĞİÖŞÜ][a-zçğışöşü]+){0,2})";
const NAME_RE = new RegExp(
  `(?:${NAME_PREFIX_TR}|${NAME_PREFIX_EN})\\s*[:\\-]\\s*${NAME_VALUE}`,
  "gu"
);

// ── US patterns ──────────────────────────────────────────────────────────────

// SSN — hyphens required to minimise false positives
const SSN_RE = /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g;

// ── Validation helpers ────────────────────────────────────────────────────────

function validTckn(s: string): boolean {
  // TR Nüfus Müdürlüğü modular arithmetic
  if (s.length !== 11 || s[0] === "0") return false;
  const d = s.split("").map(Number);
  const sumOdd = d[0] + d[2] + d[4] + d[6] + d[8];
  const sumEven = d[1] + d[3] + d[5] + d[7];
  if ((sumOdd * 7 - sumEven) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

function validVkn(s: string): boolean {
  // VKN Luhn-variant: weighted sum of first 9 digits, mod-9 reduction, check 10th
  if (s.length !== 10 || !/^\d+$/.test(s) || s[0] === "0") return false;
  const d = s.split("").map(Number);
  let total = 0;
  for (let i = 0; i < 9; i++) {
    const x = (d[i] + (9 - i)) % 10;
    if (x !== 0) {
      let y = (x * Math.pow(2, 9 - i)) % 9;
      if (y === 0) y = 9;
      total += y;
    }
  }
  return (10 - (total % 10)) % 10 === d[9];
}

function luhn(number: string): boolean {
  // ISO/IEC 7812 Luhn checksum
  const digits = number.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = parseInt(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
  }
  return total % 10 === 0;
}

function validIban(s: string): boolean {
  // ISO 7064 mod-97 IBAN checksum — chunk processing avoids float precision issues
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged
    .toUpperCase()
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 65 && code <= 90 ? String(code - 55) : c;
    })
    .join("");
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 9) {
    const chunk = Number(String(remainder) + numeric.slice(i, i + 9));
    if (!Number.isFinite(chunk)) return false;
    remainder = chunk % 97;
  }
  return remainder === 1;
}

// ── Locale registry ───────────────────────────────────────────────────────────

const LOCALE_DETECTORS: Record<string, Set<string>> = {
  tr: new Set(["national_id_tr", "tax_id_tr", "phone_tr", "name"]),
  us: new Set(["ssn", "phone"]),
  eu: new Set(["phone"]),
};
const UNIVERSAL = new Set(["email", "iban", "credit_card", "ip", "ip_v6"]);

function activeDetectors(locale: string): Set<string> {
  if (locale === "all") {
    const active = new Set(UNIVERSAL);
    for (const detectors of Object.values(LOCALE_DETECTORS)) {
      detectors.forEach((d) => active.add(d));
    }
    // phone_tr is more specific; skip generic phone when both active
    if (active.has("phone_tr")) active.delete("phone");
    return active;
  }
  const active = new Set(UNIVERSAL);
  (LOCALE_DETECTORS[locale] ?? new Set()).forEach((d) => active.add(d));
  return active;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PiiFinding {
  type: string;
  value: string;
  start: number;
  end: number;
}

// ── Public detector ───────────────────────────────────────────────────────────

function findAll(re: RegExp, text: string, type: string): PiiFinding[] {
  const results: PiiFinding[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ type, value: m[0], start: m.index, end: m.index + m[0].length });
  }
  return results;
}

export function detectPii(text: string, locale = "tr"): PiiFinding[] {
  const active = activeDetectors(locale);
  const t = text ?? "";
  const findings: PiiFinding[] = [];

  if (active.has("email")) findings.push(...findAll(EMAIL_RE, t, "email"));

  if (active.has("phone")) {
    PHONE_INTL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PHONE_INTL_RE.exec(t)) !== null) {
      const digits = m[0].replace(/\D/g, "").length;
      if (digits >= 10) {
        findings.push({ type: "phone", value: m[0], start: m.index, end: m.index + m[0].length });
      }
    }
  }

  if (active.has("iban")) {
    IBAN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IBAN_RE.exec(t)) !== null) {
      if (validIban(m[0])) {
        findings.push({ type: "iban", value: m[0], start: m.index, end: m.index + m[0].length });
      }
    }
  }

  if (active.has("credit_card")) {
    CC_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CC_RE.exec(t)) !== null) {
      if (luhn(m[0])) {
        findings.push({ type: "credit_card", value: m[0], start: m.index, end: m.index + m[0].length });
      }
    }
  }

  if (active.has("ip")) findings.push(...findAll(IPV4_RE, t, "ip"));

  if (active.has("ip_v6")) findings.push(...findAll(IPV6_RE, t, "ip_v6"));

  if (active.has("phone_tr")) findings.push(...findAll(PHONE_TR_RE, t, "phone_tr"));

  if (active.has("national_id_tr")) {
    TCKN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TCKN_RE.exec(t)) !== null) {
      if (validTckn(m[1])) {
        findings.push({ type: "national_id_tr", value: m[1], start: m.index, end: m.index + m[0].length });
      }
    }
  }

  if (active.has("tax_id_tr")) {
    VKN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = VKN_RE.exec(t)) !== null) {
      if (validVkn(m[1])) {
        findings.push({ type: "tax_id_tr", value: m[1], start: m.index, end: m.index + m[0].length });
      }
    }
  }

  if (active.has("name")) {
    NAME_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = NAME_RE.exec(t)) !== null) {
      const idx = m.length - 1;
      const value = m[idx];
      const start = m.index + m[0].lastIndexOf(value);
      findings.push({ type: "name", value, start, end: start + value.length });
    }
  }

  if (active.has("ssn")) findings.push(...findAll(SSN_RE, t, "ssn"));

  return findings.sort((a, b) => a.start - b.start);
}
