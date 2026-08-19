/**
 * TORK Safe Retry Policy & Exponential Backoff (Sprint 12)
 * 
 * Retry utility for transient network or read-only database queries.
 * Mutating or financial payout requests are strictly exempted to prevent duplicate transactions.
 */

export async function executeWithSafeRetry(
  asyncOperation,
  {
    maxRetries = 3,
    initialDelayMs = 150,
    maxDelayMs = 1500,
    isIdempotent = true,
    operationName = "Operation",
  } = {}
) {
  if (!isIdempotent) {
    // Non-idempotent operations must only run once
    return await asyncOperation();
  }

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      return await asyncOperation();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }

      // Check if error is non-retryable (e.g. 401 Unauthorized, 403 Forbidden, 422 Validation Error)
      const errStatus = error?.status || error?.httpStatus || error?.code;
      if (errStatus === 401 || errStatus === 403 || errStatus === 422 || errStatus === 409) {
        throw error;
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 50;
      const sleepTime = Math.min(delay + jitter, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
      delay *= 2;
    }
  }
}
