/** JSON-only boundaries shared by the headless rule systems. */
export function cloneRuleData(value) {
  const seen = new Set();
  function copy(v) {
    if (v === null || typeof v === "string" || typeof v === "boolean") return v;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (!v || typeof v !== "object" || seen.has(v))
      throw new TypeError("Expected acyclic JSON data.");
    if (
      !Array.isArray(v) &&
      ![Object.prototype, null].includes(Object.getPrototypeOf(v))
    )
      throw new TypeError("Expected a plain JSON object.");
    seen.add(v);
    const out = Array.isArray(v) ? [] : {};
    for (const [key, entry] of Object.entries(v)) {
      ruleId(key);
      out[key] = copy(entry);
    }
    seen.delete(v);
    return out;
  }
  return copy(value);
}

export function ruleId(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 200 ||
    ["__proto__", "constructor", "prototype"].includes(value)
  )
    throw new TypeError("Invalid identifier.");
  return value;
}

export function ruleNumber(value, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new RangeError(`Expected a number between ${min} and ${max}.`);
  return value;
}

export function ruleRecord(value) {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== "object" ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw new TypeError("Expected a plain record.");
  return value;
}
