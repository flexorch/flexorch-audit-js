import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyMask } from "../dist/index.js";

const FINDINGS = [{ type: "email", value: "a@b.com", start: 7, end: 14 }];
const TEXT = "Email: a@b.com end";

describe("applyMask strategies", () => {
  it("redact", () => {
    const r = applyMask(TEXT, FINDINGS, "redact");
    assert.ok(!r.includes("a@b.com"));
    assert.ok(r.includes("[REDACTED_EMAIL]"));
  });

  it("replace", () => {
    const r = applyMask(TEXT, FINDINGS, "replace");
    assert.ok(!r.includes("a@b.com"));
    assert.ok(r.includes("example.com"));
  });

  it("token", () => {
    const r = applyMask(TEXT, FINDINGS, "token");
    assert.ok(!r.includes("a@b.com"));
    assert.ok(r.includes("<PII_EMAIL_1>"));
  });

  it("hash — 16 hex chars", () => {
    const r = applyMask(TEXT, FINDINGS, "hash");
    assert.ok(!r.includes("a@b.com"));
    assert.match(r, /\[[0-9a-f]{16}\]/);
  });

  it("default is redact", () => {
    const r = applyMask(TEXT, FINDINGS);
    assert.ok(r.includes("[REDACTED_EMAIL]"));
  });

  it("invalid strategy throws", () => {
    assert.throws(() => applyMask(TEXT, FINDINGS, "invalid"), /Unknown strategy/);
  });
});

describe("applyMask edge cases", () => {
  it("empty findings returns original", () => {
    assert.equal(applyMask(TEXT, []), TEXT);
  });

  it("empty text returns empty string", () => {
    assert.equal(applyMask("", FINDINGS), "");
  });

  it("multiple findings both replaced", () => {
    const text = "a@b.com and c@d.com";
    const findings = [
      { type: "email", value: "a@b.com", start: 0, end: 7 },
      { type: "email", value: "c@d.com", start: 12, end: 19 },
    ];
    const r = applyMask(text, findings, "redact");
    assert.ok(!r.includes("a@b.com"));
    assert.ok(!r.includes("c@d.com"));
    assert.equal((r.match(/\[REDACTED_EMAIL\]/g) ?? []).length, 2);
  });

  it("hash is deterministic", () => {
    const r1 = applyMask(TEXT, FINDINGS, "hash");
    const r2 = applyMask(TEXT, FINDINGS, "hash");
    assert.equal(r1, r2);
  });

  it("phone_tr replace uses synthetic value", () => {
    const text = "Tel: 0532 123 45 67";
    const findings = [{ type: "phone_tr", value: "0532 123 45 67", start: 5, end: 19 }];
    const r = applyMask(text, findings, "replace");
    assert.ok(!r.includes("0532 123 45 67"));
    assert.ok(r.includes("0500 000 00 00"));
  });
});
