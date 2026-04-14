/**
 * Request queue to manage OpenAI API rate limits
 * Ensures we stay under requests-per-minute (RPM) limits
 */

interface QueuedRequest<T> {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: any) => void
  priority: number
  addedAt: number
}

interface QueueConfig {
  requestsPerMinute: number
  requestsPerDay?: number
  tokensPerMinute?: number
}

export class RequestQueue {
  private queue: QueuedRequest<any>[] = []
  private processing = false
  private requestCount = 0
  private dailyRequestCount = 0
  private tokenCount = 0
  private resetTime = Date.now() + 60000
  private dailyResetTime = Date.now() + 86400000
  private config: Required<QueueConfig>

  constructor(config: QueueConfig) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute,
      requestsPerDay: config.requestsPerDay || Infinity,
      tokensPerMinute: config.tokensPerMinute || Infinity,
    }
  }

  /**
   * Add a request to the queue
   * @param fn Function to execute
   * @param priority Higher priority requests are processed first (default: 0)
   * @returns Promise that resolves with the function result
   */
  async add<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        priority,
        addedAt: Date.now(),
      })

      // Sort queue by priority (higher first), then by time added (earlier first)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return a.addedAt - b.addedAt
      })

      this.process()
    })
  }

  /**
   * Get current queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      requestsThisMinute: this.requestCount,
      requestsToday: this.dailyRequestCount,
      tokensThisMinute: this.tokenCount,
      timeUntilReset: Math.max(0, this.resetTime - Date.now()),
      timeUntilDailyReset: Math.max(0, this.dailyResetTime - Date.now()),
    }
  }

  /**
   * Process the queue
   */
  private async process() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()

      // Reset counters if minute has passed
      if (now > this.resetTime) {
        this.requestCount = 0
        this.tokenCount = 0
        this.resetTime = now + 60000
      }

      // Reset daily counter if day has passed
      if (now > this.dailyResetTime) {
        this.dailyRequestCount = 0
        this.dailyResetTime = now + 86400000
      }

      // Check if we've hit daily limit
      if (this.dailyRequestCount >= this.config.requestsPerDay) {
        const waitTime = this.dailyResetTime - now
        console.warn(
          `[Queue] Daily limit reached (${this.config.requestsPerDay} requests). ` +
          `Waiting ${Math.round(waitTime / 1000)}s until reset...`
        )
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.dailyRequestCount = 0
        this.dailyResetTime = Date.now() + 86400000
        continue
      }

      // Check if we've hit per-minute limit
      if (this.requestCount >= this.config.requestsPerMinute) {
        const waitTime = this.resetTime - now
        console.log(
          `[Queue] Rate limit reached (${this.config.requestsPerMinute} RPM). ` +
          `Waiting ${Math.round(waitTime / 1000)}s until reset...`
        )
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.requestCount = 0
        this.resetTime = Date.now() + 60000
        continue
      }

      // Process next request
      const request = this.queue.shift()
      if (!request) continue

      try {
        this.requestCount++
        this.dailyRequestCount++

        const result = await request.fn()
        request.resolve(result)

        // Small delay between requests to avoid bursting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        request.reject(error)
      }
    }

    this.processing = false
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'))
    })
    this.queue = []
  }

  /**
   * Wait for all pending requests to complete
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.processing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}

/**
 * Global OpenAI request queue
 * Configure based on your OpenAI tier:
 * - Free: 3 RPM
 * - Tier 1: 500 RPM
 * - Tier 2: 5,000 RPM
 * - Tier 3: 10,000 RPM
 */
export const openaiQueue = new RequestQueue({
  requestsPerMinute: 50, // Conservative default for Tier 1
  requestsPerDay: 10000, // Adjust based on your usage
  tokensPerMinute: 200000, // Tier 1 default
})

/**
 * Helper to wrap OpenAI calls with queue
 */
export async function queueOpenAI<T>(
  fn: () => Promise<T>,
  priority = 0
): Promise<T> {
  return openaiQueue.add(fn, priority)
}
