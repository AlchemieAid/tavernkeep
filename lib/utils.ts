import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize and parse JSON from AI responses
 * Handles common formatting issues from Gemini and other LLMs
 */
export function sanitizeAndParseJSON(jsonString: string): any {
  let sanitized = jsonString.trim()

  // Remove markdown code block wrappers if present
  if (sanitized.startsWith('```json')) {
    sanitized = sanitized.slice(7)
  } else if (sanitized.startsWith('```')) {
    sanitized = sanitized.slice(3)
  }
  if (sanitized.endsWith('```')) {
    sanitized = sanitized.slice(0, -3)
  }

  sanitized = sanitized.trim()

  // Remove trailing commas before closing brackets/braces
  sanitized = sanitized.replace(/,\s*([}\]])/g, '$1')

  // Replace single quotes with double quotes (but not inside strings)
  // This is a simplified approach - handle escaped quotes
  sanitized = sanitized.replace(/(?<=[{\[,]\s*)'([^']*?)'(?=\s*[:}\],])/g, '"$1"')

  // Handle unquoted property names (common in AI responses)
  sanitized = sanitized.replace(/([{\[,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '')

  try {
    return JSON.parse(sanitized)
  } catch (error) {
    console.error('[JSON-SANITIZE] Failed to parse sanitized JSON:', error)
    console.error('[JSON-SANITIZE] Original:', jsonString.slice(0, 500))
    console.error('[JSON-SANITIZE] Sanitized:', sanitized.slice(0, 500))
    throw error
  }
}
