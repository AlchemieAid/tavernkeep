// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill fetch for Supabase tests
if (typeof global.fetch === 'undefined') {
  global.fetch = require('node-fetch')
}
