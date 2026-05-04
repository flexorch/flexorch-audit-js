import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { noiseMetrics } from "../dist/index.js";

describe("noiseMetrics", () => {
  it("clean text", () => {
    const r = noiseMetrics("Hello, world!");
    assert.equal(r.garbage_ratio, 0.0);
    assert.equal(r.encoding_ok, true);
  });

  it("empty string", () => {
    const r = noiseMetrics("");
    assert.equal(r.garbage_ratio, 0.0);
    assert.equal(r.encoding_ok, true);
  });

  it("detects replacement character", () => {
    const r = noiseMetrics("Normal text � with replacement char");
    assert.equal(r.encoding_ok, false);
    assert.ok(r.garbage_ratio > 0);
  });

  it("control characters counted as garbage", () => {
    const r = noiseMetrics("abc\x01def");
    assert.ok(r.garbage_ratio > 0);
  });

  it("normal whitespace not garbage", () => {
    const r = noiseMetrics("line one\nline two\ttabbed");
    assert.equal(r.garbage_ratio, 0.0);
  });

  it("all garbage", () => {
    const r = noiseMetrics("\x00\x01\x02\x03\x04\x05");
    assert.equal(r.garbage_ratio, 1.0);
  });

  it("Turkish unicode text is clean", () => {
    const r = noiseMetrics("Türkçe metin: Çiğdem, Şükrü, İstanbul");
    assert.equal(r.garbage_ratio, 0.0);
    assert.equal(r.encoding_ok, true);
  });
});
