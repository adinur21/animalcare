export function jsonSuccess(res, statusCode, payload) {
  return res.status(statusCode).json({ success: true, ...payload });
}

export function jsonError(res, statusCode, message, details = null) {
  const response = { success: false, message };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
}
