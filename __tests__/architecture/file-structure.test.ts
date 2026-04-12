/**
 * File Structure Convention Tests
 * 
 * Ensures the codebase follows the conventions defined in .windsurfrules
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

describe('File Structure Conventions', () => {
  test('All AI prompts are in /lib/prompts/', () => {
    const promptFiles = glob.sync('lib/prompts/**/*.ts')
    expect(promptFiles.length).toBeGreaterThan(0)
    
    // Verify no inline prompts in API routes
    const apiRoutes = glob.sync('app/api/**/*.ts')
    
    apiRoutes.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      
      // Check for common AI prompt patterns
      const hasInlinePrompt = 
        content.includes('You are a') ||
        content.includes('system:') ||
        content.includes('role: "system"')
      
      if (hasInlinePrompt) {
        // Allow if it's importing from /lib/prompts/
        const importsPrompts = content.includes('from \'@/lib/prompts/')
        expect(importsPrompts).toBe(true)
      }
    })
  })
  
  test('All Zod validators are in /lib/validators/', () => {
    const validatorFiles = glob.sync('lib/validators/**/*.ts')
    expect(validatorFiles.length).toBeGreaterThan(0)
    
    // Check for expected validators
    const validatorNames = validatorFiles.map(f => path.basename(f, '.ts'))
    expect(validatorNames).toContain('campaign')
    expect(validatorNames).toContain('town')
    expect(validatorNames).toContain('shop')
  })
  
  test('Components use kebab-case naming', () => {
    const componentFiles = glob.sync('components/**/*.tsx')
    
    componentFiles.forEach(file => {
      const basename = path.basename(file, '.tsx')
      const isKebabCase = /^[a-z]+(-[a-z]+)*$/.test(basename)
      
      if (!isKebabCase) {
        throw new Error(`Component ${file} does not use kebab-case naming`)
      }
    })
  })
  
  test('Database types exist in /types/database.ts', () => {
    expect(fs.existsSync('types/database.ts')).toBe(true)
    
    const content = fs.readFileSync('types/database.ts', 'utf-8')
    
    // Check for key type exports
    expect(content).toContain('export type Campaign')
    expect(content).toContain('export type Town')
    expect(content).toContain('export type Shop')
    expect(content).toContain('export type Item')
  })
  
  test('Supabase client helpers exist', () => {
    expect(fs.existsSync('lib/supabase/server.ts')).toBe(true)
    expect(fs.existsSync('lib/supabase/client.ts')).toBe(true)
    expect(fs.existsSync('lib/supabase/database.types.ts')).toBe(true)
  })
  
  test('No TypeScript files in /public/', () => {
    const tsFiles = glob.sync('public/**/*.{ts,tsx}')
    expect(tsFiles).toHaveLength(0)
  })
  
  test('All API routes are in /app/api/', () => {
    const apiRoutes = glob.sync('app/api/**/*.ts')
    expect(apiRoutes.length).toBeGreaterThan(0)
    
    // Verify they export HTTP method handlers
    apiRoutes.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      const hasHandler = 
        content.includes('export async function GET') ||
        content.includes('export async function POST') ||
        content.includes('export async function PATCH') ||
        content.includes('export async function DELETE')
      
      expect(hasHandler).toBe(true)
    })
  })
})
