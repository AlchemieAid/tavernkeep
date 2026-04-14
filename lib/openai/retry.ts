/**
 * Retry utility with exponential backoff for handling rate limits
 * Automatically retries on 429 (rate limit) and 500+ (server errors)
 */

interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  onRetry?: (attempt: number, error: any, delay: number) => void
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly originalError?: any
  ) {
    super(message)
    this.name = 'RetryableError'
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result of the function
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
