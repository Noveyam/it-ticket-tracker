const ALLOWED_STATUSES = new Set(["open", "resolved"]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

function validationError(field, code, message) {
  return { field, code, message };
}

function isValidId(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim()
  );
}

export function validateTicketRecord(record) {
  const errors = [];

  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    errors.push(
      validationError(
        "record",
        "record.invalid_type",
        "Ticket records must be non-null objects."
      )
    );

    return { isValid: false, errors };
  }

  if (typeof record.title !== "string" || record.title.trim() === "") {
    errors.push(
      validationError(
        "title",
        "title.invalid",
        "Title must be a non-empty string."
      )
    );
  }

  if (
    typeof record.status !== "string" ||
    !ALLOWED_STATUSES.has(record.status)
  ) {
    errors.push(
      validationError(
        "status",
        "status.invalid",
        "Status must be open or resolved."
      )
    );
  }

  if (
    typeof record.priority !== "string" ||
    !ALLOWED_PRIORITIES.has(record.priority)
  ) {
    errors.push(
      validationError(
        "priority",
        "priority.invalid",
        "Priority must be low, medium, or high."
      )
    );
  }

  if (
    Object.hasOwn(record, "description") &&
    typeof record.description !== "string"
  ) {
    errors.push(
      validationError(
        "description",
        "description.invalid",
        "Description must be a string when present."
      )
    );
  }

  if (!isValidId(record.id)) {
    errors.push(
      validationError(
        "id",
        "id.invalid",
        "ID must be a non-empty, trimmed string."
      )
    );
  }

  return { isValid: errors.length === 0, errors };
}

export function classifyTicketRecords(records) {
  if (!Array.isArray(records)) {
    throw new TypeError("Saved ticket records must be an array.");
  }

  const classified = records.map((record, index) => {
    const validation = validateTicketRecord(record);

    return {
      index,
      record,
      errors: [...validation.errors],
    };
  });

  const indexesById = new Map();

  for (const entry of classified) {
    if (!isValidId(entry.record?.id)) {
      continue;
    }

    const matchingIndexes = indexesById.get(entry.record.id) ?? [];
    matchingIndexes.push(entry.index);
    indexesById.set(entry.record.id, matchingIndexes);
  }

  for (const [id, indexes] of indexesById) {
    if (indexes.length < 2) {
      continue;
    }

    for (const index of indexes) {
      classified[index].errors.push(
        validationError(
          "id",
          "id.duplicate",
          `ID ${id} is used by more than one ticket.`
        )
      );
    }
  }

  return classified.map((entry) => {
    if (entry.errors.length === 0) {
      return {
        kind: "valid",
        index: entry.index,
        ticket: entry.record,
        errors: [],
      };
    }

    return {
      kind: "invalid",
      index: entry.index,
      rawRecord: entry.record,
      errors: entry.errors,
    };
  });
}
