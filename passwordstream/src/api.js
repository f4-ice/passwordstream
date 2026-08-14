const API_UNAVAILABLE_STATUSES = new Set([502, 503, 504]);

export async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';

  if (!contentType.includes('application/json')) {
    if (API_UNAVAILABLE_STATUSES.has(response.status)) {
      throw new Error('The PasswordStream API is currently unavailable. Please try again after the backend has started.');
    }

    throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('The server returned invalid JSON.', { cause: error });
  }
}
