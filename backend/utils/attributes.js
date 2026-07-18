const normalizeAttributesInput = (value) => {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return normalizeAttributesInput(parsed);
    } catch (error) {
      // Fallback for comma separated values in legacy strings
      if (value.includes(':')) {
        const parts = value.split(';');
        const obj = {};
        parts.forEach(p => {
          const [k, v] = p.split(':');
          if (k && v) obj[k.trim()] = v.split(',').map(x => x.trim());
        });
        return normalizeAttributesInput(obj);
      }
      return {};
    }
  }

  if (Array.isArray(value)) {
    return {};
  }

  if (typeof value !== 'object') {
    return {};
  }

  const normalized = {};
  Object.entries(value).forEach(([key, rawValue]) => {
    const cleanKey = String(key).trim().toLowerCase();
    if (!cleanKey || rawValue === undefined || rawValue === null) {
      return;
    }

    let valuesArray = [];
    if (Array.isArray(rawValue)) {
      valuesArray = rawValue.map((item) => String(item).trim()).filter(Boolean);
    } else {
      valuesArray = [String(rawValue).trim()].filter(Boolean);
    }

    // Deduplicate and filter out empty values
    const uniqueValues = Array.from(new Set(valuesArray));
    if (uniqueValues.length > 0) {
      normalized[cleanKey] = uniqueValues;
    }
  });

  return normalized;
};

export { normalizeAttributesInput };
