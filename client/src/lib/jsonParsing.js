export async function parseRawFetchResponse(response) {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText };
  }
}

export function parseJsonInput(rawValue, { allowEmpty = false, emptyValue = null } = {}) {
  const safeText = String(rawValue ?? "").trim();
  if (!safeText) {
    if (allowEmpty) {
      return {
        ok: true,
        value: emptyValue,
        error: "",
      };
    }

    return {
      ok: false,
      value: null,
      error: "JSON input is empty.",
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(safeText),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: error?.message || "Invalid JSON.",
    };
  }
}
