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
  it("detects TR IBAN", () => {
    const f = detectPii("IBAN: TR330006100519786457841326");
    assert.ok(f.some((x) => x.type === "iban"));
  });

  it("detects DE IBAN", () => {
    const f = detectPii("Bank: DE89370400440532013000");
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
