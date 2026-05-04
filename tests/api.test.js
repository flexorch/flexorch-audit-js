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
