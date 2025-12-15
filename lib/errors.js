// lib/errors.js

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

// ✅ default export too (prevents “is not a function” if imported as default)
export default getErrorMessage;
