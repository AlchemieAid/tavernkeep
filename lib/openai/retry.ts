/**
 * Retry Utility with Exponential Backoff
 * 
 * @fileoverview
 * Provides automatic retry logic for handling transient failures in API calls,
 * particularly rate limits (429) and server errors (500+). Uses exponential
 * backoff with jitter to avoid thundering herd problems.
 * 
 * @algorithm Exponential Backoff
 * ```
 * delay = min(baseDelay * 2^attempt + jitter, maxDelay)
 * 
 * Example with baseDelay=1000ms:
 * - Attempt 1: 1000ms + jitter
 * - Attempt 2: 2000ms + jitter
 * - Attempt 3: 4000ms + jitter
 * - Attempt 4: 8000ms + jitter (capped at maxDelay)
 * ```
 * 
 * @example
 * ```typescript
 * // Retry an OpenAI call
 * const completion = await retryOpenAI(() =>
 *   openai.chat.completions.create({
 *     model: 'gpt-4o',
 *     messages: [{ role: 'user', content: 'Hello' }]
 *   })
 * )
 * 
 * // Retry a Supabase query
 * const data = await retrySupabase(() =>
 *   supabase.from('campaigns').select('*').eq('id', campaignId)
 * )
 * ```
 */

/**
 * Configuration options for retry behavior
 */
interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds (default: 1000) */
  baseDelay?: number
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelay?: number
  /** Callback invoked before each retry attempt */
  onRetry?: (attempt: number, error: any, delay: number) => void
}

/**
 * Custom error class for retryable failures
 * 
 * @class RetryableError
 * @description
 * Wraps errors that should trigger a retry. Preserves the original error
 * and HTTP status code for debugging.
 */
export class RetryableError extends Error {
  constructor(
    message: string,
    /** HTTP status code (e.g., 429, 500) */
    public readonly status?: number,
    /** The original error that was caught */
    public readonly originalError?: any
  ) {
    super(message)
    this.name = 'RetryableError'
  }
}

/**
 * Retry a function with exponential backoff
 * 
 * @template T The return type of the function being retried
 * @param fn - Async function to retry on failure
 * @param options - Retry configuration (maxRetries, delays, callbacks)
 * @returns Promise resolving to the function's result
 * @throws {Error} The last error if all retries are exhausted
 * 
 * @description
 * **Retry Logic:**
 * - Retries on 429 (rate limit) and 500+ (server errors)
 * - Uses exponential backoff: delay doubles with each attempt
 * - Adds random jitter (0-1000ms) to prevent synchronized retries
 * - Caps delay at maxDelay to avoid excessive wait times
 * 
 * **Non-Retryable Errors:**
 * - 400-499 (except 429): Client errors like invalid requests
 * - Network errors without status codes
 * - Errors explicitly marked as non-retryable
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Check if error is retryable
      const isRateLimitError = error?.status === 429 || error?.code === 'rate_limit_exceeded'
      const isServerError = error?.status >= 500
      const isNetworkError = error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT'

      if (!isRateLimitError && !isServerError && !isNetworkError) {
        // Not a retryable error, throw immediately
        throw error
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      const jitter = Math.random() * 1000 // Add up to 1s of jitter
      const delay = Math.floor(exponentialDelay + jitter)

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delay)
      } else {
        console.warn(
          `[Retry] Attempt ${attempt + 1}/${maxRetries} failed with ${error?.status || error?.code}. Retrying in ${delay}ms...`
        )
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // All retries exhausted
  throw new RetryableError(
    `Failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`,
    lastError?.status,
    lastError
  )
}

/**
 * Wrapper for OpenAI API calls with automatic retry
 * @param fn OpenAI API call function
 * @param options Retry configuration
 * @returns Result of the API call
 */
export async function retryOpenAI<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 5, // More retries for OpenAI
    baseDelay: 2000, // Start with 2s delay
    maxDelay: 60000, // Max 60s delay
    ...options,
    onRetry: (attempt, error, delay) => {
      console.log(
        `[OpenAI Retry] Attempt ${attempt} failed (${error?.status || error?.code}). ` +
        `Waiting ${Math.round(delay / 1000)}s before retry...`
      )
      if (options.onRetry) {
        options.onRetry(attempt, error, delay)
      }
    }
  })
}

/**
 * Wrapper for Supabase operations with automatic retry
 * @param fn Supabase operation function
 * @param options Retry configuration
 * @returns Result of the operation
 */
export async function retrySupabase<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    ...options,
    onRetry: (attempt, error, delay) => {
      console.log(
        `[Supabase Retry] Attempt ${attempt} failed. ` +
        `Waiting ${Math.round(delay / 1000)}s before retry...`
      )
      if (options.onRetry) {
        options.onRetry(attempt, error, delay)
      }
    }
  })
}
