import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { qualityMetrics } from "../dist/index.js";

describe("qualityMetrics", () => {
  it("non-empty text", () => {
    const r = qualityMetrics("Hello, world!");
    assert.equal(r.completeness, 1.0);
    assert.equal(r.avg_length, 13);
    assert.equal(r.duplicate_ratio, null);
  });

  it("empty string", () => {
    const r = qualityMetrics("");
    assert.equal(r.completeness, 0.0);
    assert.equal(r.avg_length, 0);
  });

  it("whitespace only", () => {
    const r = qualityMetrics("   \t\n  ");
    assert.equal(r.completeness, 0.0);
    assert.equal(r.avg_length, 0);
  });

  it("strips leading/trailing whitespace", () => {
    const r = qualityMetrics("  hello  ");
    assert.equal(r.avg_length, 5);
  });

  it("long text", () => {
    const r = qualityMetrics("a".repeat(10_000));
    assert.equal(r.completeness, 1.0);
    assert.equal(r.avg_length, 10_000);
  });
});
