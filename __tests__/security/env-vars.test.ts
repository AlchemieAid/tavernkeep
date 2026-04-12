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
      
      // Check for direct API key usage (should only be in API routes)
      if (file.includes('/api/')) {
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
  
  test('Supabase service role key is never used', () => {
    const allFiles = getAllSourceFiles('app')
    
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(content).not.toContain('SERVICE_ROLE')
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
