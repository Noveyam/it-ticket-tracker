import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyTicketRecords,
  validateTicketRecord,
} from "./ticket-validation.mjs";

function validTicket(overrides = {}) {
  return {
    id: "TKT-001",
    title: "Printer won't connect",
    status: "open",
    priority: "low",
    description: "The printer is unavailable.",
    ...overrides,
  };
}

function errorCodes(result) {
  return result.errors.map((error) => error.code);
}

test("accepts valid tickets and every supported priority", () => {
  for (const priority of ["low", "medium", "high"]) {
    const result = validateTicketRecord(validTicket({ priority }));
    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, []);
  }
});

test("requires each record to be a non-null, non-array object", () => {
  for (const record of [null, "ticket", 42, true, []]) {
    const result = validateTicketRecord(record);
    assert.equal(result.isValid, false);
    assert.deepEqual(errorCodes(result), ["record.invalid_type"]);
  }
});

test("rejects missing, non-string, empty, and whitespace-only titles", () => {
  for (const title of [undefined, null, 42, "", "   "]) {
    const result = validateTicketRecord(validTicket({ title }));
    assert.equal(result.isValid, false);
    assert.ok(errorCodes(result).includes("title.invalid"));
  }
});

test("rejects missing, non-string, and unsupported statuses", () => {
  for (const status of [undefined, null, 42, "", "all", "in progress"]) {
    const result = validateTicketRecord(validTicket({ status }));
    assert.equal(result.isValid, false);
    assert.ok(errorCodes(result).includes("status.invalid"));
  }
});

test("rejects missing, non-string, and unsupported priorities", () => {
  for (const priority of [undefined, null, 42, "", "urgent"]) {
    const result = validateTicketRecord(validTicket({ priority }));
    assert.equal(result.isValid, false);
    assert.ok(errorCodes(result).includes("priority.invalid"));
  }
});

test("allows a missing or empty description", () => {
  const withoutDescription = validTicket();
  delete withoutDescription.description;

  assert.equal(validateTicketRecord(withoutDescription).isValid, true);
  assert.equal(
    validateTicketRecord(validTicket({ description: "" })).isValid,
    true
  );
});

test("rejects a present description that is not a string", () => {
  for (const description of [undefined, null, 42, false, {}]) {
    const result = validateTicketRecord(validTicket({ description }));
    assert.equal(result.isValid, false);
    assert.ok(errorCodes(result).includes("description.invalid"));
  }
});

test("rejects missing, non-string, empty, and untrimmed IDs", () => {
  for (const id of [undefined, null, 42, "", "   ", " TKT-001", "TKT-001 "]) {
    const result = validateTicketRecord(validTicket({ id }));
    assert.equal(result.isValid, false);
    assert.ok(errorCodes(result).includes("id.invalid"));
  }
});

test("classifies every duplicate-ID participant as invalid", () => {
  const firstDuplicate = validTicket({ id: "DUPLICATE", title: "First" });
  const secondDuplicate = validTicket({ id: "DUPLICATE", title: "Second" });
  const unique = validTicket({ id: "UNIQUE", title: "Third" });

  const result = classifyTicketRecords([
    firstDuplicate,
    secondDuplicate,
    unique,
  ]);

  assert.equal(result[0].kind, "invalid");
  assert.equal(result[1].kind, "invalid");
  assert.equal(result[2].kind, "valid");
  assert.ok(errorCodes(result[0]).includes("id.duplicate"));
  assert.ok(errorCodes(result[1]).includes("id.duplicate"));
});

test("marks all duplicate participants even when one has another error", () => {
  const invalidTitle = validTicket({ id: "DUPLICATE", title: "" });
  const otherwiseValid = validTicket({ id: "DUPLICATE", title: "Valid title" });

  const result = classifyTicketRecords([invalidTitle, otherwiseValid]);

  assert.equal(result[0].kind, "invalid");
  assert.equal(result[1].kind, "invalid");
  assert.deepEqual(errorCodes(result[0]).sort(), [
    "id.duplicate",
    "title.invalid",
  ]);
  assert.deepEqual(errorCodes(result[1]), ["id.duplicate"]);
});

test("preserves invalid records, original order, and input values", () => {
  const valid = validTicket({ id: "VALID" });
  const missingPriority = validTicket({ id: "INVALID", priority: undefined });
  const records = [valid, null, missingPriority, "not a ticket"];
  const snapshot = structuredClone(records);

  const result = classifyTicketRecords(records);

  assert.deepEqual(records, snapshot);
  assert.deepEqual(
    result.map((entry) => entry.index),
    [0, 1, 2, 3]
  );
  assert.equal(result[0].kind, "valid");
  assert.strictEqual(result[0].ticket, valid);
  assert.equal(result[1].kind, "invalid");
  assert.strictEqual(result[1].rawRecord, null);
  assert.equal(result[2].kind, "invalid");
  assert.strictEqual(result[2].rawRecord, missingPriority);
  assert.equal(result[3].kind, "invalid");
  assert.strictEqual(result[3].rawRecord, "not a ticket");
});

test("does not repair a missing ID", () => {
  const missingId = validTicket();
  delete missingId.id;

  const result = classifyTicketRecords([missingId]);

  assert.equal(result[0].kind, "invalid");
  assert.equal(Object.hasOwn(missingId, "id"), false);
  assert.ok(errorCodes(result[0]).includes("id.invalid"));
});

test("rejects a non-array record collection", () => {
  assert.throws(
    () => classifyTicketRecords({}),
    /Saved ticket records must be an array\./
  );
});
