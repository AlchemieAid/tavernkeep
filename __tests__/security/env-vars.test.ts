/**
 * Environment Variable Security Tests
 * 
 * Ensures API keys and secrets are never exposed to the client bundle.
 * This is a CRITICAL security test that prevents API key leaks.
 */

import fs from 'fs'
import path from 'path'

describe('Environment Variable Security', () => {
  test('OPENAI_API_KEY never appears in source code', () => {
    const srcFiles = getAllSourceFiles('app')
    
    srcFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      
      // Normalize path separators for cross-platform compatibility
      const normalizedPath = file.replace(/\\/g, '/')
      
      // Check for direct API key usage (should only be in API routes)
      if (normalizedPath.includes('/api/')) {
        // API routes can use process.env.OPENAI_API_KEY
        return
      }
      
      // Client components should NEVER reference OPENAI_API_KEY
      expect(content).not.toContain('OPENAI_API_KEY')
      expect(content).not.toMatch(/sk-[a-zA-Z0-9]{32,}/) // OpenAI key pattern
    })
  })
  
  test('Only NEXT_PUBLIC_ vars used in client components', () => {
    const clientComponents = getAllSourceFiles('app').filter(file => 
      !file.includes('/api/') && file.endsWith('.tsx')
    )
    
    clientComponents.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      const envMatches = content.match(/process\.env\.([A-Z_]+)/g) || []
      
      envMatches.forEach(match => {
        const varName = match.replace('process.env.', '')
        if (!varName.startsWith('NEXT_PUBLIC_')) {
          throw new Error(
            `Non-public env var "${varName}" used in client component: ${file}`
          )
        }
      })
    })
  })
  
  test('Supabase service role key never reaches the client bundle', () => {
    // The service role key bypasses RLS and must NEVER ship to the browser.
    // It is allowed in:
    //   - Server-only files under /app/api/** (API routes)
    //   - Server Components (files without "use client")
    //   - Documentation strings in JSX (e.g. "set SUPABASE_SERVICE_ROLE_KEY in .env")
    //
    // The real risk is `process.env.SUPABASE_SERVICE_ROLE_KEY` being read in
    // a Client Component, which would inline `undefined` and silently break
    // admin features — or worse, ship a real value if someone mistakenly
    // exposes it via `NEXT_PUBLIC_*`.
    const clientFiles = getAllSourceFiles('app').filter(file => {
      if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return false
      const content = fs.readFileSync(file, 'utf-8')
      // Only Client Components are at risk of bundling secrets.
      return /^['"]use client['"]/m.test(content)
    })

    clientFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).not.toMatch(/process\.env\.SUPABASE_SERVICE_ROLE_KEY/)
      expect(content).not.toMatch(/process\.env\.[A-Z_]*SERVICE_ROLE[A-Z_]*/)
    })

    // Defence-in-depth: no NEXT_PUBLIC_* exposure of the service role key.
    const allFiles = [
      ...getAllSourceFiles('app'),
      ...(fs.existsSync('lib') ? getAllSourceFiles('lib') : []),
    ]
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).not.toMatch(/NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/)
    })
  })
})

// Helper function to recursively get all source files
function getAllSourceFiles(dir: string): string[] {
  const files: string[] = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    
    if (item.isDirectory()) {
      // Skip node_modules and .next
      if (item.name === 'node_modules' || item.name === '.next') continue
      files.push(...getAllSourceFiles(fullPath))
    } else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }
  
  return files
}
