// ── Universal patterns ───────────────────────────────────────────────────────

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// E.164 international phone — requires + prefix, 7-15 total digits, TR (+90) excluded.
// Capturing group validated by validPhoneIntl(); type: "phone_intl" in eu/us locales.
const PHONE_INTL_RE = /(?<![+\d])(\+[1-9][\d\s\-.()]{5,18}\d)(?!\d)/g;

// IBAN — ISO 13616 generic; mod-97 validated below
const IBAN_RE = /\b[A-Z]{2}\d{2}[0-9A-Z]{11,30}\b/g;

// IBAN for locale-specific intl detection — same pattern, separate stateful object
const IBAN_INTL_RE = /\b([A-Z]{2}\d{2}[0-9A-Z]{11,30})\b/g;

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

// Turkish IBAN — TR + 2 check digits + 22 BBAN chars (total 26); mod-97 validated
const IBAN_TR_RE = /\bTR\d{2}[0-9A-Z]{22}\b/g;

// Turkish company names with legal suffixes
const _TR_COMPANY_SUFFIX =
  "(?:A\\.Ş\\.|Ltd\\.\\s*Şti\\.|Koll\\.\\s*Şti\\.|Koop\\.|T\\.A\\.Ş\\.)";
const _TR_NAME_TOKEN =
  "(?:ve|ile|[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğışöşü]*\\.?)";
const COMPANY_NAME_TR_RE = new RegExp(
  `(?<![A-Za-zÇĞİÖŞÜçğışöşü])` +
  `([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğışöşü]*` +
  `(?:\\s+${_TR_NAME_TOKEN}){0,6}` +
  `\\s+${_TR_COMPANY_SUFFIX})`,
  "gu"
);

// MERSIS — 16-digit Turkish company registry number, first digit non-zero
const MERSIS_RE = /\b([1-9]\d{15})\b/g;

// Turkish postal codes — province plate 01-81
const POSTAL_CODE_TR_RE = /\b((?:0[1-9]|[1-7]\d|80|81)\d{3})\b/g;

// All 81 Turkish provinces — sorted longest-first to prevent partial matches
const _TR_PROVINCES_SORTED = [
  "Afyonkarahisar", "Kahramanmaraş", "Kırıkkale", "Kırklareli",
  "Diyarbakır", "Gaziantep", "Şanlıurfa", "Nevşehir",
  "Kastamonu", "Gümüşhane", "Eskişehir", "Erzincan",
  "Erzurum", "Denizli", "Çanakkale", "Adıyaman",
  "Zonguldak", "Tekirdağ", "Trabzon", "Tunceli",
  "Karaman", "Karabük", "Aksaray", "Antalya",
  "Kırşehir", "Osmaniye", "Kocaeli", "Sakarya",
  "Bartın", "Bayburt", "Ardahan", "Yozgat",
  "Ankara", "Amasya", "Artvin", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Burdur",
  "Çankırı", "Edirne", "Elazığ", "Giresun",
  "Hakkari", "Isparta", "İstanbul", "İzmir",
  "Kayseri", "Kütahya", "Malatya", "Manisa",
  "Mardin", "Samsun", "Şırnak", "Sinop",
  "Tokat", "Hatay", "Konya", "Muğla",
  "Niğde", "Rize", "Siirt", "Sivas",
  "Adana", "Aydın", "Bursa", "Çorum",
  "Iğdır", "Kilis", "Mersin", "Batman",
  "Yalova", "Düzce", "Ordu", "Kars",
  "Ağrı", "Bolu", "Van", "Uşak", "Muş",
].sort((a, b) => b.length - a.length);
// Use lookarounds instead of \b — JS \b is ASCII-only; Turkish letters (İ, ş, ğ…) are \W.
const PROVINCE_TR_RE = new RegExp(
  `(?<!\\w)(${_TR_PROVINCES_SORTED.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?!\\w)`,
  "gu"
);

// Label-prefixed name detection (TR and EN labels)
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

// ── EU / International patterns ───────────────────────────────────────────────

// ISO 13616 country+length table — EU member states + GB, CH, NO. TR excluded.
const _IBAN_INTL_LENGTHS: Record<string, number> = {
  AT: 20, BE: 16, BG: 22, HR: 21, CY: 28, CZ: 24,
  DK: 18, EE: 20, FI: 18, FR: 27, DE: 22, GR: 27,
  HU: 28, IE: 22, IT: 27, LV: 21, LT: 20, LU: 20,
  MT: 31, NL: 18, PL: 28, PT: 25, RO: 24, SK: 24,
  SI: 19, ES: 24, SE: 24, GB: 22, CH: 21, NO: 15,
};

// International company names — GmbH, LLC, SAS, B.V., S.r.l., Inc., etc.
// Latin Extended range (U+00C0–U+024F) covers German/French/Italian/Spanish umlauts.
const _INTL_SUFFIX =
  "(?:KGaA|GmbH|OHG|GbR|SARL|EURL" +
  "|S\\.p\\.A\\.|S\\.r\\.l\\.|S\\.n\\.c\\.|S\\.a\\.s\\." +
  "|B\\.V\\.|N\\.V\\.|S\\.A\\.|S\\.L\\." +
  "|Corp\\.|Inc\\.|Ltd\\.|LLP|LLC|PLC" +
  "|SpA|Srl|SNC|SAS|BV|NV|SL|SA" +
  "|Corp|Inc|Ltd|KG|AG|UG)";
const _UC = "[A-ZÀ-ɏ]";
const _WC = "[A-Za-z0-9À-ɏ\\-]";
const _INTL_NAME_TOKEN = `(?:and|&|${_UC}${_WC}*\\.?)`;
const COMPANY_NAME_INTL_RE = new RegExp(
  `(?<![A-Za-zÀ-ɏ])` +
  `(${_UC}${_WC}*` +
  `(?:\\s+${_INTL_NAME_TOKEN}){0,6}` +
  `\\s+${_INTL_SUFFIX})`,
  "gu"
);

// ── US patterns ──────────────────────────────────────────────────────────────

// SSN — hyphens required to minimise false positives
const SSN_RE = /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g;
// EIN — employer identification: XX-XXXXXXX
const EIN_US_RE = /\b(\d{2}-\d{7})\b/g;
// ITIN — individual TIN: 9XX-7X/8X/9X-XXXX
const ITIN_US_RE = /\b(9\d{2}-(?:7[0-9]|8[0-8]|9[0-24-9])-\d{4})\b/g;

// ── DE patterns ──────────────────────────────────────────────────────────────
const STEUER_ID_DE_RE = /\b([1-9]\d{10})\b/g;
const SVNR_DE_RE = /\b(\d{4}[01]\d[0-3]\d[A-Z]\d{4})\b/g;

// ── FR patterns ──────────────────────────────────────────────────────────────
const SIRET_FR_RE = /(?:SIRET|N°\s*SIRET|Num[eé]ro\s+SIRET|RCS)\s*[:#]*\s*(\d{14})\b/gi;
const SIREN_FR_RE = /(?:SIREN|N°\s*SIREN|Num[eé]ro\s+SIREN)\s*[:#]*\s*(\d{9})\b/gi;
const INSEE_FR_RE = /\b([12]\d{14})\b/g;

// ── IT patterns ──────────────────────────────────────────────────────────────
const CODICE_FISCALE_IT_RE = /\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/gi;
const PARTITA_IVA_IT_RE = /\b(\d{11})\b/g;

// ── NL patterns ──────────────────────────────────────────────────────────────
const BSN_NL_RE = /\b(\d{9})\b/g;
const KVK_NL_RE = /(?:KVK|KvK|Handelsregister(?:nummer)?)\s*[:#]*\s*(\d{8})\b/gi;

// ── ES patterns ──────────────────────────────────────────────────────────────
const _DNI_LETTER_TABLE = "TRWAGMYFPDXBNJZSQVHLCKE";
const DNI_ES_RE = /\b(\d{8}[A-Z])\b/g;
const NIE_ES_RE = /\b([XYZ]\d{7}[A-Z])\b/g;
const CIF_ES_RE = /\b([ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J])\b/g;

// ── UK patterns ──────────────────────────────────────────────────────────────
const NI_UK_RE = /\b([A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[ABCD])\b/g;
const UTR_UK_RE = /(?:UTR|Unique\s+Taxpayer(?:\s+Reference)?)\s*[:#]*\s*(\d{10})\b/gi;

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

function validIbanIntl(s: string): boolean {
  // ISO 13616: country existence, exact length, mod-97 checksum. Excludes TR.
  const country = s.slice(0, 2);
  if (country === "TR" || !(country in _IBAN_INTL_LENGTHS)) return false;
  if (s.length !== _IBAN_INTL_LENGTHS[country]) return false;
  return validIban(s);
}

function validPhoneIntl(raw: string): boolean {
  // E.164: 7-15 total digits, excludes TR country code (+90)
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && digits.slice(0, 2) !== "90";
}

function validSteuerIdDe(s: string): boolean {
  if (s.length !== 11 || s[0] === "0") return false;
  let product = 10;
  for (let i = 0; i < 10; i++) {
    let total = (parseInt(s[i]) + product) % 10;
    if (total === 0) total = 10;
    product = (total * 2) % 11;
  }
  let check = 11 - product;
  if (check === 10) check = 0;
  return check === parseInt(s[10]);
}

function validPartitaIvaIt(s: string): boolean {
  if (s.length !== 11 || !/^\d+$/.test(s)) return false;
  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < 10; i += 2) oddSum += parseInt(s[i]);
  for (let i = 1; i < 10; i += 2) {
    let v = parseInt(s[i]) * 2;
    evenSum += v < 10 ? v : v - 9;
  }
  return (10 - (oddSum + evenSum) % 10) % 10 === parseInt(s[10]);
}

function validBsnNl(s: string): boolean {
  if (s.length !== 9 || !/^\d+$/.test(s)) return false;
  let total = 0;
  for (let i = 0; i < 8; i++) total += (9 - i) * parseInt(s[i]);
  total -= parseInt(s[8]);
  return total > 0 && total % 11 === 0;
}

function validDniEs(s: string): boolean {
  if (s.length !== 9 || !/^\d{8}/.test(s)) return false;
  return _DNI_LETTER_TABLE[parseInt(s.slice(0, 8)) % 23] === s[8];
}

function validNieEs(s: string): boolean {
  if (s.length !== 9 || !"XYZ".includes(s[0])) return false;
  const prefix = { X: "0", Y: "1", Z: "2" }[s[0]] as string;
  return _DNI_LETTER_TABLE[parseInt(prefix + s.slice(1, 8)) % 23] === s[8];
}

const _NI_UK_FORBIDDEN = new Set(["BG", "GB", "KN", "NK", "NT", "TN", "ZZ"]);
function validNiUk(s: string): boolean {
  return !_NI_UK_FORBIDDEN.has(s.slice(0, 2).toUpperCase());
}

const _EIN_INVALID_PREFIXES = new Set([
  "00", "07", "08", "09", "17", "18", "19", "28", "29",
  "49", "69", "70", "78", "79", "89", "96", "97",
]);
function validEinUs(s: string): boolean {
  return !_EIN_INVALID_PREFIXES.has(s.slice(0, 2));
}

// ── Locale registry ───────────────────────────────────────────────────────────

const LOCALE_DETECTORS: Record<string, Set<string>> = {
  tr: new Set([
    "national_id_tr", "tax_id_tr", "phone_tr", "name",
    "iban_tr", "company_name_tr", "mersis_no", "postal_code_tr", "province_tr",
  ]),
  us: new Set(["ssn", "tax_id_us", "national_id_us", "phone_intl", "company_name_intl"]),
  eu: new Set(["phone_intl", "iban_intl", "company_name_intl"]),
  de: new Set(["tax_id_de", "social_id_de"]),
  fr: new Set(["siret_fr", "company_id_fr", "social_id_fr"]),
  it: new Set(["national_id_it", "tax_id_it"]),
  nl: new Set(["national_id_nl", "company_id_nl"]),
  es: new Set(["national_id_es", "tax_id_es"]),
  uk: new Set(["social_id_uk", "tax_id_uk"]),
};
const UNIVERSAL = new Set(["email", "iban", "credit_card", "ip", "ip_v6"]);

function activeDetectors(locale: string): Set<string> {
  if (locale === "all" || locale === "und") {
    const active = new Set(UNIVERSAL);
    for (const detectors of Object.values(LOCALE_DETECTORS)) {
      detectors.forEach((d) => active.add(d));
    }
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

export function detectPii(text: string, locale = "und"): PiiFinding[] {
  const active = activeDetectors(locale);
  const t = text ?? "";
  let findings: PiiFinding[] = [];

  if (active.has("email")) findings.push(...findAll(EMAIL_RE, t, "email"));

  if (active.has("phone_intl")) {
    PHONE_INTL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PHONE_INTL_RE.exec(t)) !== null) {
      const candidate = m[1];
      if (validPhoneIntl(candidate)) {
        findings.push({ type: "phone_intl", value: candidate, start: m.index, end: m.index + candidate.length });
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

  if (active.has("iban_tr")) {
    IBAN_TR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IBAN_TR_RE.exec(t)) !== null) {
      if (validIban(m[0])) {
        findings.push({ type: "iban_tr", value: m[0], start: m.index, end: m.index + m[0].length });
      }
    }
  }

  if (active.has("company_name_tr")) {
    COMPANY_NAME_TR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = COMPANY_NAME_TR_RE.exec(t)) !== null) {
      findings.push({ type: "company_name_tr", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("mersis_no")) {
    MERSIS_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MERSIS_RE.exec(t)) !== null) {
      findings.push({ type: "mersis_no", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("postal_code_tr")) {
    POSTAL_CODE_TR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = POSTAL_CODE_TR_RE.exec(t)) !== null) {
      findings.push({ type: "postal_code_tr", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("province_tr")) {
    PROVINCE_TR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PROVINCE_TR_RE.exec(t)) !== null) {
      findings.push({ type: "province_tr", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("ssn")) findings.push(...findAll(SSN_RE, t, "ssn"));

  if (active.has("tax_id_us")) {
    EIN_US_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EIN_US_RE.exec(t)) !== null) {
      if (validEinUs(m[1])) findings.push({ type: "tax_id_us", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("national_id_us")) {
    ITIN_US_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ITIN_US_RE.exec(t)) !== null) {
      findings.push({ type: "national_id_us", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("tax_id_de")) {
    STEUER_ID_DE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = STEUER_ID_DE_RE.exec(t)) !== null) {
      if (validSteuerIdDe(m[1])) findings.push({ type: "tax_id_de", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("social_id_de")) {
    SVNR_DE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SVNR_DE_RE.exec(t)) !== null) {
      findings.push({ type: "social_id_de", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("siret_fr")) {
    SIRET_FR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SIRET_FR_RE.exec(t)) !== null) {
      findings.push({ type: "siret_fr", value: m[1], start: m.index + m[0].indexOf(m[1]), end: m.index + m[0].indexOf(m[1]) + m[1].length });
    }
  }

  if (active.has("company_id_fr")) {
    SIREN_FR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SIREN_FR_RE.exec(t)) !== null) {
      findings.push({ type: "company_id_fr", value: m[1], start: m.index + m[0].indexOf(m[1]), end: m.index + m[0].indexOf(m[1]) + m[1].length });
    }
  }

  if (active.has("social_id_fr")) {
    INSEE_FR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = INSEE_FR_RE.exec(t)) !== null) {
      findings.push({ type: "social_id_fr", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("national_id_it")) {
    CODICE_FISCALE_IT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CODICE_FISCALE_IT_RE.exec(t)) !== null) {
      findings.push({ type: "national_id_it", value: m[1].toUpperCase(), start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("tax_id_it")) {
    PARTITA_IVA_IT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PARTITA_IVA_IT_RE.exec(t)) !== null) {
      if (validPartitaIvaIt(m[1])) findings.push({ type: "tax_id_it", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("national_id_nl")) {
    BSN_NL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BSN_NL_RE.exec(t)) !== null) {
      if (validBsnNl(m[1])) findings.push({ type: "national_id_nl", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("company_id_nl")) {
    KVK_NL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = KVK_NL_RE.exec(t)) !== null) {
      findings.push({ type: "company_id_nl", value: m[1], start: m.index + m[0].indexOf(m[1]), end: m.index + m[0].indexOf(m[1]) + m[1].length });
    }
  }

  if (active.has("national_id_es")) {
    DNI_ES_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DNI_ES_RE.exec(t)) !== null) {
      if (validDniEs(m[1])) findings.push({ type: "national_id_es", value: m[1], start: m.index, end: m.index + m[1].length });
    }
    NIE_ES_RE.lastIndex = 0;
    while ((m = NIE_ES_RE.exec(t)) !== null) {
      if (validNieEs(m[1])) findings.push({ type: "national_id_es", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("tax_id_es")) {
    CIF_ES_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CIF_ES_RE.exec(t)) !== null) {
      findings.push({ type: "tax_id_es", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("social_id_uk")) {
    NI_UK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = NI_UK_RE.exec(t)) !== null) {
      if (validNiUk(m[1])) findings.push({ type: "social_id_uk", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  if (active.has("tax_id_uk")) {
    UTR_UK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = UTR_UK_RE.exec(t)) !== null) {
      findings.push({ type: "tax_id_uk", value: m[1], start: m.index + m[0].indexOf(m[1]), end: m.index + m[0].indexOf(m[1]) + m[1].length });
    }
  }

  if (active.has("iban_intl")) {
    IBAN_INTL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IBAN_INTL_RE.exec(t)) !== null) {
      const candidate = m[1];
      if (validIbanIntl(candidate)) {
        findings.push({ type: "iban_intl", value: candidate, start: m.index, end: m.index + candidate.length });
      }
    }
  }

  if (active.has("company_name_intl")) {
    COMPANY_NAME_INTL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = COMPANY_NAME_INTL_RE.exec(t)) !== null) {
      findings.push({ type: "company_name_intl", value: m[1], start: m.index, end: m.index + m[1].length });
    }
  }

  findings.sort((a, b) => a.start - b.start);

  // Dedup: iban_tr/iban_intl at the same span overrides the generic iban finding.
  const specificIbanSpans = new Set(
    findings
      .filter((f) => f.type === "iban_tr" || f.type === "iban_intl")
      .map((f) => `${f.start}:${f.end}`)
  );
  if (specificIbanSpans.size > 0) {
    findings = findings.filter(
      (f) => !(f.type === "iban" && specificIbanSpans.has(`${f.start}:${f.end}`))
    );
  }

  return findings;
}
