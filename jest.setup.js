// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Next.js unconditionally skips .env.local when NODE_ENV=test (dotenv convention),
// even when using @next/env's loadEnvConfig directly. Parse it manually with fs
// so integration tests that need real Supabase credentials can find them.
// Only sets vars NOT already defined — .env.test.local takes priority over this.
;(function loadEnvLocal() {
  const fs = require('fs')
  const path = require('path')
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key && !(key in process.env)) process.env[key] = val
  }
})()

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
