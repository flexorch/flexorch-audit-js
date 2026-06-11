import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { audit, mask, version } from "../dist/index.js";

describe("public API", () => {
  it("version is present", () => {
    assert.match(version, /^\d+\.\d+\.\d+$/);
  });

  it("audit returns all three pillars", () => {
    const r = audit("Hello world");
    assert.ok("pii" in r);
    assert.ok("quality" in r);
    assert.ok("noise" in r);
  });

  it("clean text — no PII, full quality, zero noise", () => {
    const r = audit("The quick brown fox jumps over the lazy dog.");
    assert.deepEqual(r.pii, []);
    assert.equal(r.quality.completeness, 1.0);
    assert.equal(r.noise.garbage_ratio, 0.0);
  });

  it("detects email", () => {
    const r = audit("Contact us: hello@flexorch.com");
    assert.ok(r.pii.some((f) => f.type === "email"));
  });

  it("detects TCKN in tr locale", () => {
    const r = audit("TC kimlik: 12345678950", { locale: "tr" });
    assert.ok(r.pii.some((f) => f.type === "national_id_tr"));
  });

  it("mask redact round-trip", () => {
    const text = "Email: test@example.com";
    const r = audit(text);
    const clean = mask(text, r.pii, { strategy: "redact" });
    assert.ok(!clean.includes("test@example.com"));
    assert.ok(clean.includes("[REDACTED_EMAIL]"));
  });

  it("mask with no PII returns original", () => {
    const text = "Clean text with no personal data.";
    const r = audit(text);
    assert.equal(mask(text, r.pii), text);
  });

  it("empty string", () => {
    const r = audit("");
    assert.deepEqual(r.pii, []);
    assert.equal(r.quality.completeness, 0.0);
    assert.equal(r.noise.encoding_ok, true);
  });

  it("us locale detects SSN", () => {
    const r = audit("SSN: 123-45-6789", { locale: "us" });
    assert.ok(r.pii.some((f) => f.type === "ssn"));
  });

  it("all locale detects TCKN + SSN + email", () => {
    const text = "TC: 12345678950, SSN: 123-45-6789, email: x@y.com";
    const r = audit(text, { locale: "all" });
    const types = new Set(r.pii.map((f) => f.type));
    assert.ok(types.has("national_id_tr"));
    assert.ok(types.has("ssn"));
    assert.ok(types.has("email"));
  });

  it("all mask strategies remove PII", () => {
    const text = "Contact: ali@example.com";
    const r = audit(text);
    for (const strategy of ["redact", "replace", "token", "hash"]) {
      const clean = mask(text, r.pii, { strategy });
      assert.ok(!clean.includes("ali@example.com"), `PII present with strategy=${strategy}`);
    }
  });
});

// ── New fields: quality_grade, quality_score, pii_summary ────────────────────

describe("quality grade and score", () => {
  it("quality_grade is A/B/C/D", () => {
    const r = audit("Hello world");
    assert.ok(["A", "B", "C", "D"].includes(r.quality_grade));
  });

  it("quality_score is in [0.0, 1.0]", () => {
    const r = audit("Hello world");
    assert.ok(r.quality_score >= 0.0 && r.quality_score <= 1.0);
  });

  it("empty text → grade D, score 0.0", () => {
    const r = audit("");
    assert.equal(r.quality_grade, "D");
    assert.equal(r.quality_score, 0.0);
  });

  it("long clean text → grade A", () => {
    const r = audit("a".repeat(600));
    assert.equal(r.quality_grade, "A");
    assert.ok(r.quality_score >= 0.85);
  });
});

describe("pii_summary", () => {
  it("aggregates findings by type with count", () => {
    const r = audit("Email: a@b.com, c@d.com");
    const entry = r.pii_summary.find((s) => s.type === "email");
    assert.ok(entry !== undefined);
    assert.equal(entry.count, 2);
  });

  it("empty array when no PII found", () => {
    const r = audit("Clean text with no personal data.");
    assert.deepEqual(r.pii_summary, []);
  });

  it("pii_summary count matches pii array length", () => {
    const r = audit("a@b.com c@d.com e@f.com");
    const total = r.pii_summary.reduce((sum, s) => sum + s.count, 0);
    assert.equal(total, r.pii.length);
  });
});

// ── v0.5.0: noise_ratio, detected_language, "und" locale ─────────────────────

describe("v0.5.0 new fields", () => {
  it("noise_ratio field is present and a number", () => {
    const r = audit("clean text\nmore text");
    assert.ok("noise_ratio" in r);
    assert.ok(typeof r.noise_ratio === "number");
    assert.ok(r.noise_ratio >= 0.0 && r.noise_ratio <= 1.0);
  });

  it("noise_ratio is 0.0 for clean text", () => {
    const r = audit("clean\nclean\nclean");
    assert.equal(r.noise_ratio, 0.0);
  });

  it("noise_ratio > 0 for noisy text", () => {
    const r = audit("clean\n@@@symbol noise\n\nclean");
    assert.ok(r.noise_ratio > 0.0);
  });

  it("detected_language reflects locale option", () => {
    const r = audit("some text", { locale: "tr" });
    assert.equal(r.detected_language, "tr");
  });

  it("detected_language defaults to und", () => {
    const r = audit("some text");
    assert.equal(r.detected_language, "und");
  });

  it("und locale activates all detectors", () => {
    const text = "TC: 12345678950, SSN: 123-45-6789, email: x@y.com";
    const r = audit(text, { locale: "und" });
    const types = new Set(r.pii.map((f) => f.type));
    assert.ok(types.has("national_id_tr"));
    assert.ok(types.has("ssn"));
    assert.ok(types.has("email"));
  });

  it("default locale (und) same as explicit und", () => {
    const text = "TC: 12345678950, SSN: 123-45-6789";
    const rDefault = audit(text);
    const rUnd = audit(text, { locale: "und" });
    assert.deepEqual(rDefault.pii, rUnd.pii);
  });
});

// ── v0.6.0: auditStream, complianceReport ────────────────────────────────────

describe("auditStream", () => {
  it("yields one result per text", async () => {
    const { auditStream } = await import("../dist/index.js");
    async function* gen() { yield "Hello world"; yield "a@b.com"; yield ""; }
    const results = [];
    for await (const r of auditStream(gen())) results.push(r);
    assert.equal(results.length, 3);
  });

  it("each result has expected fields", async () => {
    const { auditStream } = await import("../dist/index.js");
    async function* gen() { yield "test text"; }
    for await (const r of auditStream(gen())) {
      assert.ok("quality_grade" in r);
      assert.ok("pii" in r);
      assert.ok("noise_ratio" in r);
    }
  });

  it("empty iterable yields nothing", async () => {
    const { auditStream } = await import("../dist/index.js");
    async function* empty() {}
    const results = [];
    for await (const r of auditStream(empty())) results.push(r);
    assert.equal(results.length, 0);
  });

  it("respects locale option", async () => {
    const { auditStream } = await import("../dist/index.js");
    async function* gen() { yield "PESEL: 44051401359"; }
    for await (const r of auditStream(gen(), { locale: "pl" })) {
      assert.ok(r.pii.some((f) => f.type === "national_id_pl"));
    }
  });
});

// ── v0.7.0: redactForLlm, estimateTokens ─────────────────────────────────────

describe("redactForLlm", () => {
  it("removes PII from text", async () => {
    const { redactForLlm } = await import("../dist/index.js");
    const clean = redactForLlm("TCKN: 12345678950, email: ali@example.com", { locale: "tr" });
    assert.ok(!clean.includes("12345678950"));
    assert.ok(!clean.includes("ali@example.com"));
  });

  it("returns original text when no PII found", async () => {
    const { redactForLlm } = await import("../dist/index.js");
    const text = "The quick brown fox jumps over the lazy dog.";
    assert.equal(redactForLlm(text), text);
  });

  it("empty string returns empty string", async () => {
    const { redactForLlm } = await import("../dist/index.js");
    assert.equal(redactForLlm(""), "");
  });

  it("respects strategy option", async () => {
    const { redactForLlm } = await import("../dist/index.js");
    const clean = redactForLlm("Email: hello@example.com", { strategy: "token" });
    assert.ok(!clean.includes("hello@example.com"));
    assert.ok(clean.includes("<PII_EMAIL"));
  });

  it("und locale removes SSN by default", async () => {
    const { redactForLlm } = await import("../dist/index.js");
    const clean = redactForLlm("SSN: 123-45-6789");
    assert.ok(!clean.includes("123-45-6789"));
  });
});

describe("estimateTokens", () => {
  it("empty string returns 0", async () => {
    const { estimateTokens } = await import("../dist/index.js");
    assert.equal(estimateTokens(""), 0);
    assert.equal(estimateTokens("   "), 0);
  });

  it("single word returns at least 1", async () => {
    const { estimateTokens } = await import("../dist/index.js");
    assert.ok(estimateTokens("hello") >= 1);
  });

  it("longer text returns larger estimate", async () => {
    const { estimateTokens } = await import("../dist/index.js");
    const short = estimateTokens("one two three");
    const long = estimateTokens("one two three ".repeat(10));
    assert.ok(long > short);
  });

  it("rough range for short sentence", async () => {
    const { estimateTokens } = await import("../dist/index.js");
    const result = estimateTokens("The quick brown fox");
    assert.ok(result >= 4 && result <= 8);
  });

  it("returns integer", async () => {
    const { estimateTokens } = await import("../dist/index.js");
    assert.equal(typeof estimateTokens("some text"), "number");
    assert.equal(estimateTokens("some text") % 1, 0);
  });
});

describe("complianceReport", () => {
  it("no PII → risk_level none", async () => {
    const { audit, complianceReport } = await import("../dist/index.js");
    const r = audit("Clean text with no personal data.");
    const report = complianceReport(r);
    assert.equal(report.risk_level, "none");
    assert.equal(report.has_pii, false);
    assert.equal(report.masking_required, false);
    assert.ok(report.recommendations.length > 0);
  });

  it("email → risk_level medium", async () => {
    const { audit, complianceReport } = await import("../dist/index.js");
    const r = audit("Contact: ali@example.com");
    const report = complianceReport(r);
    assert.equal(report.risk_level, "medium");
    assert.equal(report.has_pii, true);
    assert.equal(report.masking_required, true);
    assert.ok(report.pii_types.includes("email"));
  });

  it("TCKN → risk_level high", async () => {
    const { audit, complianceReport } = await import("../dist/index.js");
    const r = audit("TC: 12345678950", { locale: "tr" });
    const report = complianceReport(r);
    assert.equal(report.risk_level, "high");
    assert.ok(report.pii_types.includes("national_id_tr"));
  });

  it("credit card → risk_level high", async () => {
    const { audit, complianceReport } = await import("../dist/index.js");
    const r = audit("Card: 4532 0151 1283 0366");
    const report = complianceReport(r);
    assert.equal(report.risk_level, "high");
  });

  it("pii_types sorted alphabetically", async () => {
    const { audit, complianceReport } = await import("../dist/index.js");
    const r = audit("a@b.com card: 4532 0151 1283 0366");
    const report = complianceReport(r);
    assert.deepEqual(report.pii_types, [...report.pii_types].sort());
  });
});
