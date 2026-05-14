import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectPii } from "../dist/index.js";

describe("email", () => {
  it("detects standard email", () => {
    const f = detectPii("Contact: test@example.com today");
    assert.ok(f.some((x) => x.type === "email" && x.value === "test@example.com"));
  });

  it("detects subdomain email", () => {
    const f = detectPii("Send to ali@mail.co.uk");
    assert.ok(f.some((x) => x.type === "email"));
  });

  it("no false positive on clean text", () => {
    const f = detectPii("Hello world, no PII here.");
    assert.equal(f.filter((x) => x.type === "email").length, 0);
  });
});

describe("phone_tr", () => {
  it("detects +90 prefix", () => {
    const f = detectPii("Ara: +90 532 123 45 67", "tr");
    assert.ok(f.some((x) => x.type === "phone_tr"));
  });

  it("detects domestic 0 prefix", () => {
    const f = detectPii("GSM: 0532 123 45 67", "tr");
    assert.ok(f.some((x) => x.type === "phone_tr"));
  });

  it("not detected in us locale", () => {
    const f = detectPii("GSM: 0532 123 45 67", "us");
    assert.equal(f.filter((x) => x.type === "phone_tr").length, 0);
  });
});

describe("national_id_tr (TCKN)", () => {
  it("detects valid TCKN", () => {
    const f = detectPii("TC: 12345678950", "tr");
    assert.ok(f.some((x) => x.type === "national_id_tr" && x.value === "12345678950"));
  });

  it("rejects invalid checksum", () => {
    const f = detectPii("TC: 12345678900", "tr");
    assert.equal(f.filter((x) => x.type === "national_id_tr").length, 0);
  });

  it("not detected in us locale", () => {
    const f = detectPii("TC: 12345678950", "us");
    assert.equal(f.filter((x) => x.type === "national_id_tr").length, 0);
  });
});

describe("iban", () => {
  it("detects TR IBAN as iban_tr in tr locale", () => {
    const f = detectPii("IBAN: TR330006100519786457841326", "tr");
    assert.ok(f.some((x) => x.type === "iban_tr" && x.value === "TR330006100519786457841326"));
  });

  it("generic iban suppressed by iban_tr at same span", () => {
    const f = detectPii("IBAN: TR330006100519786457841326", "tr");
    assert.equal(f.filter((x) => x.type === "iban").length, 0);
  });

  it("detects DE IBAN as generic iban in tr locale", () => {
    const f = detectPii("Bank: DE89370400440532013000", "tr");
    assert.ok(f.some((x) => x.type === "iban"));
  });
});

describe("credit_card", () => {
  it("detects Luhn-valid card", () => {
    const f = detectPii("Card: 4532 0151 1283 0366");
    assert.ok(f.some((x) => x.type === "credit_card"));
  });

  it("rejects Luhn-invalid number", () => {
    const f = detectPii("Ref: 1234 5678 9012 3456");
    assert.equal(f.filter((x) => x.type === "credit_card").length, 0);
  });
});

describe("ip", () => {
  it("detects valid IPv4", () => {
    const f = detectPii("Server: 192.168.1.100");
    assert.ok(f.some((x) => x.type === "ip" && x.value === "192.168.1.100"));
  });

  it("rejects invalid octet", () => {
    const f = detectPii("Bad: 999.999.999.999");
    assert.equal(f.filter((x) => x.type === "ip").length, 0);
  });
});

describe("ssn", () => {
  it("detects SSN in us locale", () => {
    const f = detectPii("SSN: 123-45-6789", "us");
    assert.ok(f.some((x) => x.type === "ssn" && x.value === "123-45-6789"));
  });

  it("not detected in tr locale", () => {
    const f = detectPii("SSN: 123-45-6789", "tr");
    assert.equal(f.filter((x) => x.type === "ssn").length, 0);
  });

  it("rejects 000 prefix", () => {
    const f = detectPii("SSN: 000-45-6789", "us");
    assert.equal(f.filter((x) => x.type === "ssn").length, 0);
  });
});

describe("name", () => {
  it("detects TR label prefix", () => {
    const f = detectPii("Adı Soyadı: Ahmet Yıldız", "tr");
    assert.ok(f.some((x) => x.type === "name" && x.value.includes("Ahmet")));
  });

  it("detects EN label prefix", () => {
    const f = detectPii("Full Name: John Smith", "tr");
    assert.ok(f.some((x) => x.type === "name"));
  });

  it("not detected in us locale", () => {
    const f = detectPii("Adı: Ahmet Yıldız", "us");
    assert.equal(f.filter((x) => x.type === "name").length, 0);
  });
});

describe("locale: all", () => {
  it("includes TCKN and SSN", () => {
    const f = detectPii("TC: 12345678950 and SSN: 123-45-6789", "all");
    const types = new Set(f.map((x) => x.type));
    assert.ok(types.has("national_id_tr"));
    assert.ok(types.has("ssn"));
  });
});

describe("output ordering", () => {
  it("findings sorted by start position", () => {
    const f = detectPii("Email: a@b.com phone: 0532 123 45 67", "tr");
    const starts = f.map((x) => x.start);
    assert.deepEqual(starts, [...starts].sort((a, b) => a - b));
  });

  it("empty string returns empty array", () => {
    assert.deepEqual(detectPii(""), []);
    assert.deepEqual(detectPii("   "), []);
  });
});

describe("tax_id_tr (VKN)", () => {
  it("detects valid VKN in tr locale", () => {
    const f = detectPii("VKN: 1234567890", "tr");
    assert.ok(f.some((x) => x.type === "tax_id_tr" && x.value === "1234567890"));
  });

  it("rejects invalid VKN checksum", () => {
    const f = detectPii("VKN: 1234567891", "tr");
    assert.equal(f.filter((x) => x.type === "tax_id_tr").length, 0);
  });

  it("rejects leading-zero VKN", () => {
    const f = detectPii("0123456789", "tr");
    assert.equal(f.filter((x) => x.type === "tax_id_tr").length, 0);
  });

  it("11-digit TCKN does not trigger VKN match", () => {
    const f = detectPii("TC: 12345678950", "tr");
    assert.equal(f.filter((x) => x.type === "tax_id_tr").length, 0);
  });

  it("not detected in us locale", () => {
    const f = detectPii("VKN: 1234567890", "us");
    assert.equal(f.filter((x) => x.type === "tax_id_tr").length, 0);
  });
});

describe("ip_v6", () => {
  it("detects full IPv6", () => {
    const f = detectPii("Server: 2001:0db8:85a3:0000:0000:8a2e:0370:7334", "tr");
    assert.ok(f.some((x) => x.type === "ip_v6"));
  });

  it("detects compressed IPv6", () => {
    const f = detectPii("Host: 2001:db8::1", "tr");
    assert.ok(f.some((x) => x.type === "ip_v6" && x.value.includes("2001:db8::1")));
  });

  it("detects loopback ::1", () => {
    const f = detectPii("Loopback: ::1", "tr");
    assert.ok(f.some((x) => x.type === "ip_v6"));
  });

  it("no false positive on version strings", () => {
    const f = detectPii("Version 1:2 available", "tr");
    assert.equal(f.filter((x) => x.type === "ip_v6").length, 0);
  });
});

describe("iban mod-97", () => {
  it("accepts valid TR IBAN as iban_tr in tr locale", () => {
    const f = detectPii("IBAN: TR330006100519786457841326", "tr");
    assert.ok(f.some((x) => x.type === "iban_tr"));
  });

  it("accepts valid DE IBAN as iban in tr locale", () => {
    const f = detectPii("Bank: DE89370400440532013000", "tr");
    assert.ok(f.some((x) => x.type === "iban"));
  });

  it("rejects IBAN with invalid mod-97 checksum", () => {
    const f = detectPii("IBAN: DE89370400440532013001");
    assert.equal(f.filter((x) => x.type === "iban").length, 0);
  });
});

describe("auditBatch", () => {
  it("empty array returns zeros", async () => {
    const { auditBatch } = await import("../dist/index.js");
    const r = auditBatch([]);
    assert.equal(r.duplicate_ratio, 0);
    assert.deepEqual(r.results, []);
  });

  it("no duplicates → ratio 0", async () => {
    const { auditBatch } = await import("../dist/index.js");
    const r = auditBatch(["Hello", "World", "Different"]);
    assert.equal(r.duplicate_ratio, 0);
    assert.equal(r.results.length, 3);
  });

  it("one duplicate out of three → ratio 0.3333", async () => {
    const { auditBatch } = await import("../dist/index.js");
    const r = auditBatch(["same", "same", "different"]);
    assert.ok(Math.abs(r.duplicate_ratio - 1 / 3) < 0.001);
  });

  it("aggregates pii_summary across texts", async () => {
    const { auditBatch } = await import("../dist/index.js");
    const texts = ["Email: a@b.com", "Email: c@d.com and e@f.com"];
    const r = auditBatch(texts, { locale: "tr" });
    const email = r.pii_summary.find((x) => x.type === "email");
    assert.ok(email);
    assert.equal(email.count, 3);
  });

  it("avg_quality_score is between 0 and 1", async () => {
    const { auditBatch } = await import("../dist/index.js");
    const r = auditBatch(["", "Hello world ".repeat(50)]);
    assert.ok(r.avg_quality_score >= 0 && r.avg_quality_score <= 1);
  });
});

describe("phone_intl", () => {
  it("detects E.164 US number in us locale", () => {
    const f = detectPii("+1 555 234 5678", "us");
    assert.ok(f.some((x) => x.type === "phone_intl"));
  });

  it("detects E.164 UK number in eu locale", () => {
    const f = detectPii("Call: +44 20 7946 0958", "eu");
    assert.ok(f.some((x) => x.type === "phone_intl"));
  });

  it("excludes TR +90 number", () => {
    const f = detectPii("+90 532 123 45 67", "eu");
    assert.equal(f.filter((x) => x.type === "phone_intl").length, 0);
  });

  it("not detected in tr locale", () => {
    const f = detectPii("+1 555 234 5678", "tr");
    assert.equal(f.filter((x) => x.type === "phone_intl").length, 0);
  });
});

describe("iban_tr", () => {
  it("detects TR IBAN as iban_tr", () => {
    const f = detectPii("IBAN: TR330006100519786457841326", "tr");
    assert.ok(f.some((x) => x.type === "iban_tr" && x.value === "TR330006100519786457841326"));
  });

  it("rejects TR IBAN with bad checksum", () => {
    const f = detectPii("IBAN: TR330006100519786457841327", "tr");
    assert.equal(f.filter((x) => x.type === "iban_tr").length, 0);
  });

  it("not detected in eu locale", () => {
    const f = detectPii("IBAN: TR330006100519786457841326", "eu");
    assert.equal(f.filter((x) => x.type === "iban_tr").length, 0);
  });
});

describe("iban_intl", () => {
  it("detects DE IBAN as iban_intl in eu locale", () => {
    const f = detectPii("Bank: DE89370400440532013000", "eu");
    assert.ok(f.some((x) => x.type === "iban_intl" && x.value === "DE89370400440532013000"));
  });

  it("generic iban suppressed by iban_intl at same span", () => {
    const f = detectPii("Bank: DE89370400440532013000", "eu");
    assert.equal(f.filter((x) => x.type === "iban").length, 0);
  });

  it("TR IBAN not matched as iban_intl", () => {
    const f = detectPii("IBAN: TR330006100519786457841326", "eu");
    assert.equal(f.filter((x) => x.type === "iban_intl").length, 0);
  });

  it("not detected in tr locale", () => {
    const f = detectPii("Bank: DE89370400440532013000", "tr");
    assert.equal(f.filter((x) => x.type === "iban_intl").length, 0);
  });
});

describe("company_name_tr", () => {
  it("detects A.Ş. suffix", () => {
    const f = detectPii("Şirket: Örnek A.Ş. fatura", "tr");
    assert.ok(f.some((x) => x.type === "company_name_tr" && x.value.includes("Örnek")));
  });

  it("detects Ltd. Şti. suffix", () => {
    const f = detectPii("Acme Ltd. Şti. ile sözleşme", "tr");
    assert.ok(f.some((x) => x.type === "company_name_tr"));
  });

  it("not detected in eu locale", () => {
    const f = detectPii("Örnek A.Ş.", "eu");
    assert.equal(f.filter((x) => x.type === "company_name_tr").length, 0);
  });
});

describe("mersis_no", () => {
  it("detects 16-digit MERSIS in tr locale", () => {
    const f = detectPii("MERSIS: 1234567890123456", "tr");
    assert.ok(f.some((x) => x.type === "mersis_no" && x.value === "1234567890123456"));
  });

  it("rejects 15-digit number", () => {
    const f = detectPii("Ref: 123456789012345", "tr");
    assert.equal(f.filter((x) => x.type === "mersis_no").length, 0);
  });

  it("not detected in eu locale", () => {
    const f = detectPii("1234567890123456", "eu");
    assert.equal(f.filter((x) => x.type === "mersis_no").length, 0);
  });
});

describe("postal_code_tr", () => {
  it("detects İstanbul postal code", () => {
    const f = detectPii("Adres: Levent 34330 İstanbul", "tr");
    assert.ok(f.some((x) => x.type === "postal_code_tr" && x.value === "34330"));
  });

  it("rejects invalid province prefix 00", () => {
    const f = detectPii("Kod: 00100", "tr");
    assert.equal(f.filter((x) => x.type === "postal_code_tr").length, 0);
  });

  it("rejects province prefix 82+", () => {
    const f = detectPii("Kod: 82000", "tr");
    assert.equal(f.filter((x) => x.type === "postal_code_tr").length, 0);
  });

  it("not detected in eu locale", () => {
    const f = detectPii("34330", "eu");
    assert.equal(f.filter((x) => x.type === "postal_code_tr").length, 0);
  });
});

describe("province_tr", () => {
  it("detects Ankara", () => {
    const f = detectPii("İl: Ankara", "tr");
    assert.ok(f.some((x) => x.type === "province_tr" && x.value === "Ankara"));
  });

  it("detects İstanbul", () => {
    const f = detectPii("Şehir: İstanbul", "tr");
    assert.ok(f.some((x) => x.type === "province_tr" && x.value === "İstanbul"));
  });

  it("detects Kahramanmaraş (longest name)", () => {
    const f = detectPii("İl: Kahramanmaraş", "tr");
    assert.ok(f.some((x) => x.type === "province_tr" && x.value === "Kahramanmaraş"));
  });

  it("not detected in eu locale", () => {
    const f = detectPii("Ankara", "eu");
    assert.equal(f.filter((x) => x.type === "province_tr").length, 0);
  });
});

describe("company_name_intl", () => {
  it("detects GmbH in eu locale", () => {
    const f = detectPii("Vendor: Volkswagen GmbH contract", "eu");
    assert.ok(f.some((x) => x.type === "company_name_intl" && x.value.includes("Volkswagen")));
  });

  it("detects LLC in us locale", () => {
    const f = detectPii("Acme LLC is the supplier", "us");
    assert.ok(f.some((x) => x.type === "company_name_intl" && x.value.includes("Acme")));
  });

  it("detects B.V. suffix", () => {
    const f = detectPii("ASML B.V. invoice", "eu");
    assert.ok(f.some((x) => x.type === "company_name_intl"));
  });

  it("not detected in tr locale", () => {
    const f = detectPii("Volkswagen GmbH", "tr");
    assert.equal(f.filter((x) => x.type === "company_name_intl").length, 0);
  });
});

// ── S2.1 DE ───────────────────────────────────────────────────────────────────
describe("tax_id_de", () => {
  it("detects valid Steuer-IdNr", () => {
    const f = detectPii("IdNr 47036892816", "de");
    assert.ok(f.some((x) => x.type === "tax_id_de" && x.value === "47036892816"));
  });

  it("rejects invalid checksum", () => {
    const f = detectPii("47036892815", "de");
    assert.equal(f.filter((x) => x.type === "tax_id_de").length, 0);
  });

  it("not fired in tr locale", () => {
    const f = detectPii("47036892816", "tr");
    assert.equal(f.filter((x) => x.type === "tax_id_de").length, 0);
  });
});

describe("social_id_de", () => {
  it("detects valid SVNR", () => {
    const f = detectPii("SV-Nr 12800101A0001", "de");
    assert.ok(f.some((x) => x.type === "social_id_de" && x.value === "12800101A0001"));
  });

  it("not fired without letter in pattern", () => {
    const f = detectPii("12800101000001", "de");
    assert.equal(f.filter((x) => x.type === "social_id_de").length, 0);
  });
});

// ── S2.2 FR ───────────────────────────────────────────────────────────────────
describe("siret_fr", () => {
  it("detects SIRET with label", () => {
    const f = detectPii("SIRET: 12345678901234", "fr");
    assert.ok(f.some((x) => x.type === "siret_fr" && x.value === "12345678901234"));
  });

  it("standalone 14-digit not detected", () => {
    const f = detectPii("12345678901234", "fr");
    assert.equal(f.filter((x) => x.type === "siret_fr").length, 0);
  });
});

describe("company_id_fr", () => {
  it("detects SIREN with label", () => {
    const f = detectPii("SIREN: 123456789", "fr");
    assert.ok(f.some((x) => x.type === "company_id_fr" && x.value === "123456789"));
  });
});

describe("social_id_fr", () => {
  it("detects INSEE starting with 1", () => {
    const f = detectPii("NIR: 195127512345678", "fr");
    assert.ok(f.some((x) => x.type === "social_id_fr" && x.value === "195127512345678"));
  });

  it("rejects starting with 3", () => {
    const f = detectPii("395127512345678", "fr");
    assert.equal(f.filter((x) => x.type === "social_id_fr").length, 0);
  });
});

// ── S2.3 IT ───────────────────────────────────────────────────────────────────
describe("national_id_it", () => {
  it("detects Codice Fiscale", () => {
    const f = detectPii("CF: RSSMRA85M01H501Z", "it");
    assert.ok(f.some((x) => x.type === "national_id_it" && x.value === "RSSMRA85M01H501Z"));
  });

  it("uppercases value", () => {
    const f = detectPii("rssmra85m01h501z", "it");
    const matches = f.filter((x) => x.type === "national_id_it");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].value, "RSSMRA85M01H501Z");
  });

  it("not fired in eu locale", () => {
    const f = detectPii("RSSMRA85M01H501Z", "eu");
    assert.equal(f.filter((x) => x.type === "national_id_it").length, 0);
  });
});

describe("tax_id_it", () => {
  it("detects valid Partita IVA", () => {
    const f = detectPii("P.IVA 12345678903", "it");
    assert.ok(f.some((x) => x.type === "tax_id_it" && x.value === "12345678903"));
  });

  it("rejects wrong checksum", () => {
    const f = detectPii("12345678900", "it");
    assert.equal(f.filter((x) => x.type === "tax_id_it").length, 0);
  });
});

// ── S2.4 NL ───────────────────────────────────────────────────────────────────
describe("national_id_nl", () => {
  it("detects valid BSN", () => {
    const f = detectPii("BSN: 123456782", "nl");
    assert.ok(f.some((x) => x.type === "national_id_nl" && x.value === "123456782"));
  });

  it("rejects invalid 11-check", () => {
    const f = detectPii("123456780", "nl");
    assert.equal(f.filter((x) => x.type === "national_id_nl").length, 0);
  });
});

describe("company_id_nl", () => {
  it("detects KvK with label", () => {
    const f = detectPii("KvK: 12345678", "nl");
    assert.ok(f.some((x) => x.type === "company_id_nl" && x.value === "12345678"));
  });

  it("standalone 8 digits not detected", () => {
    const f = detectPii("12345678", "nl");
    assert.equal(f.filter((x) => x.type === "company_id_nl").length, 0);
  });
});

// ── S2.5 ES ───────────────────────────────────────────────────────────────────
describe("national_id_es", () => {
  it("detects valid DNI", () => {
    const f = detectPii("DNI: 12345678Z", "es");
    assert.ok(f.some((x) => x.type === "national_id_es" && x.value === "12345678Z"));
  });

  it("rejects wrong DNI letter", () => {
    const f = detectPii("12345678A", "es");
    assert.equal(f.filter((x) => x.type === "national_id_es").length, 0);
  });

  it("detects valid NIE", () => {
    const f = detectPii("NIE: X1234567L", "es");
    assert.ok(f.some((x) => x.type === "national_id_es" && x.value === "X1234567L"));
  });
});

describe("tax_id_es", () => {
  it("detects valid CIF", () => {
    const f = detectPii("CIF: B12345674", "es");
    assert.ok(f.some((x) => x.type === "tax_id_es" && x.value === "B12345674"));
  });

  it("not fired in eu locale", () => {
    const f = detectPii("B12345674", "eu");
    assert.equal(f.filter((x) => x.type === "tax_id_es").length, 0);
  });
});

// ── S2.6 UK ───────────────────────────────────────────────────────────────────
describe("social_id_uk", () => {
  it("detects valid NI number", () => {
    const f = detectPii("NI: AB123456A", "uk");
    assert.ok(f.some((x) => x.type === "social_id_uk" && x.value === "AB123456A"));
  });

  it("rejects forbidden prefix BG", () => {
    const f = detectPii("BG123456A", "uk");
    assert.equal(f.filter((x) => x.type === "social_id_uk").length, 0);
  });

  it("not fired in eu locale", () => {
    const f = detectPii("AB123456A", "eu");
    assert.equal(f.filter((x) => x.type === "social_id_uk").length, 0);
  });
});

describe("tax_id_uk", () => {
  it("detects UTR with label", () => {
    const f = detectPii("UTR: 1234567890", "uk");
    assert.ok(f.some((x) => x.type === "tax_id_uk" && x.value === "1234567890"));
  });

  it("standalone 10 digits not detected", () => {
    const f = detectPii("1234567890", "uk");
    assert.equal(f.filter((x) => x.type === "tax_id_uk").length, 0);
  });
});

// ── S2.7 US ───────────────────────────────────────────────────────────────────
describe("tax_id_us", () => {
  it("detects valid EIN", () => {
    const f = detectPii("EIN: 12-3456789", "us");
    assert.ok(f.some((x) => x.type === "tax_id_us" && x.value === "12-3456789"));
  });

  it("rejects invalid prefix 00", () => {
    const f = detectPii("00-1234567", "us");
    assert.equal(f.filter((x) => x.type === "tax_id_us").length, 0);
  });

  it("not fired in eu locale", () => {
    const f = detectPii("12-3456789", "eu");
    assert.equal(f.filter((x) => x.type === "tax_id_us").length, 0);
  });
});

describe("national_id_us", () => {
  it("detects valid ITIN", () => {
    const f = detectPii("ITIN: 900-70-1234", "us");
    assert.ok(f.some((x) => x.type === "national_id_us" && x.value === "900-70-1234"));
  });

  it("rejects invalid middle group 60", () => {
    const f = detectPii("900-60-1234", "us");
    assert.equal(f.filter((x) => x.type === "national_id_us").length, 0);
  });
});
