import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { noiseMetrics, noiseRatio } from "../dist/index.js";

describe("noiseRatio", () => {
  it("empty string returns 0.0", () => {
    assert.equal(noiseRatio(""), 0.0);
  });

  it("clean text returns 0.0", () => {
    assert.equal(noiseRatio("Hello\nworld\nno noise here"), 0.0);
  });

  it("blank lines counted as noisy", () => {
    // "line1", "", "", "line4" — 2 blank out of 4
    assert.equal(noiseRatio("line1\n\n\nline4"), 0.5);
  });

  it("symbol noise lines counted", () => {
    // "normal line", "@@@garbage", "===another", "clean" — 2 noisy of 4
    assert.equal(noiseRatio("normal line\n@@@garbage\n===another\nclean"), 0.5);
  });

  it("all clean lines returns 0.0", () => {
    assert.equal(noiseRatio("clean\nclean\nclean\nclean"), 0.0);
  });

  it("high noise above 0.20 threshold", () => {
    const noisy = Array.from({ length: 30 }, () => "@@@").concat(Array.from({ length: 10 }, () => "clean")).join("\n");
    assert.ok(noiseRatio(noisy) === 0.75);
  });
});

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
