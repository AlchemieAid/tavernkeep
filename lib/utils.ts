import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize and parse JSON from AI responses
 * Handles common formatting issues from Gemini and other LLMs
 * Also handles truncated/incomplete JSON
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

  // Check if JSON appears truncated (ends mid-property or mid-value)
  const lastChar = sanitized.slice(-1)
  const openBraces = (sanitized.match(/\{/g) || []).length
  const closeBraces = (sanitized.match(/\}/g) || []).length
  const openBrackets = (sanitized.match(/\[/g) || []).length
  const closeBrackets = (sanitized.match(/\]/g) || []).length

  // If unbalanced braces/brackets, try to fix truncated JSON
  if (openBraces > closeBraces || openBrackets > closeBrackets || lastChar === ',' || lastChar === ':' || lastChar === '"') {
    console.warn('[JSON-SANITIZE] Detected truncated JSON, attempting to repair...')
    sanitized = repairTruncatedJSON(sanitized)
  }

  // Remove trailing commas before closing brackets/braces
  sanitized = sanitized.replace(/,\s*([}\]])/g, '$1')

  // Replace single quotes with double quotes (but not inside strings)
  sanitized = sanitized.replace(/(?<=[{\[,]\s*)'([^']*?)'(?=\s*[:}\],])/g, '"$1"')

  // Handle unquoted property names
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

/**
 * Attempt to repair truncated JSON by closing open structures
 * This handles cases where Gemini cuts off mid-response
 */
function repairTruncatedJSON(json: string): string {
  let repaired = json.trim()

  // Find position of last complete property (look for patterns like "value", or "value"]
  // and work backwards from there
  const lastCompletePattern = /"[^"]*"\s*[\]:}\,]/.exec(repaired)

  if (lastCompletePattern) {
    // Cut off at the last complete value and close structures
    const cutIndex = lastCompletePattern.index + lastCompletePattern[0].length
    repaired = repaired.slice(0, cutIndex)

    // Remove trailing comma if present
    repaired = repaired.replace(/,\s*$/, '')
  }

  // Count and close open structures
  const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length
  const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length

  // Close any unclosed strings (odd number of unescaped quotes)
  const quoteMatches = repaired.match(/(?<!\\)"/g)
  if (quoteMatches && quoteMatches.length % 2 !== 0) {
    // Find the last property name and close it
    const lastColon = repaired.lastIndexOf(':')
    if (lastColon > repaired.lastIndexOf('"')) {
      // We're in a value position, add empty string
      repaired += '""'
    } else {
      // We're at a property name, this is malformed - remove the partial property
      const lastComma = repaired.lastIndexOf(',')
      const lastBrace = repaired.lastIndexOf('{')
      const cutPoint = Math.max(lastComma, lastBrace)
      if (cutPoint > 0) {
        repaired = repaired.slice(0, cutPoint + 1)
      }
    }
  }

  // Close brackets first (they're inner), then braces
  for (let i = 0; i < openBrackets; i++) {
    repaired += ']'
  }
  for (let i = 0; i < openBraces; i++) {
    repaired += '}'
  }

  console.log('[JSON-SANITIZE] Repaired JSON:', repaired.slice(0, 200) + '...')
  return repaired
}
