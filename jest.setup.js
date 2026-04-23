// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill fetch for Supabase tests
if (typeof global.fetch === 'undefined') {
  global.fetch = require('node-fetch')
}

// Polyfill TextEncoder/TextDecoder for AI generation tests
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}
