/**
 * Mock for nanoid
 * 
 * Jest can't handle ES modules from this package.
 */

export function nanoid(size?: number): string {
  return 'mock-nanoid-' + Math.random().toString(36).substring(2, 11)
}

export default nanoid
