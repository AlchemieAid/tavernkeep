/**
 * Server Action Closure Pattern Tests
 * 
 * These tests verify that server actions properly capture resolved param values
 * rather than Promises. In Next.js 15, params are Promises and must be awaited
 * BEFORE being used in server action closures.
 */

import * as fs from 'fs'
import * as path from 'path'

const DM_APP_DIR = path.join(process.cwd(), 'app', 'dm')

describe('Server Action Closure Pattern', () => {
  // Find all page.tsx files in the DM app directory
  const pageFiles: string[] = []
  
  function findPageFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        findPageFiles(fullPath)
      } else if (entry.name === 'page.tsx') {
        pageFiles.push(fullPath)
      }
    }
  }
  
  if (fs.existsSync(DM_APP_DIR)) {
    findPageFiles(DM_APP_DIR)
  }

  test.each(pageFiles)('%s - server actions should capture resolved params', (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Skip files without server actions
    if (!content.includes("'use server'")) {
      return
    }
    
    // Skip files without dynamic route params
    if (!filePath.includes('[')) {
      return
    }

    // Check for the pattern: async function inside component using outer scope params
    // This regex looks for server actions that use variables from outer scope
    const serverActionRegex = /async function\s+\w+\s*\([^)]*\)\s*\{\s*['"]use server['"]([\s\S]*?)\}/g
    
    let match
    while ((match = serverActionRegex.exec(content)) !== null) {
      const serverActionBody = match[1]
      
      // Check if the server action uses common param names without proper capture
      const problematicPatterns = [
        /\bcampaignId\b(?!\s*=)/,  // Uses campaignId but not assignment
        /\btownId\b(?!\s*=)/,      // Uses townId but not assignment  
        /\bshopId\b(?!\s*=)/,      // Uses shopId but not assignment
        /\bitemId\b(?!\s*=)/,      // Uses itemId but not assignment
      ]
      
      const hasProblematicUsage = problematicPatterns.some(pattern => 
        pattern.test(serverActionBody)
      )
      
      if (hasProblematicUsage) {
        // Check if there's a corresponding capture variable
        const hasCapturePattern = 
          content.includes('const currentCampaignId') ||
          content.includes('const currentTownId') ||
          content.includes('const currentShopId') ||
          content.includes('const currentItemId') ||
          // Or the pattern uses await params inside (alternative valid approach)
          serverActionBody.includes('await params')
        
        if (!hasCapturePattern) {
          throw new Error(
            `Server action in ${filePath} appears to use dynamic route params from outer scope ` +
            `without proper capture. Use: const currentXId = xId before the server action closure, ` +
            `or await params inside the server action.\n` +
            `Server action body: ${serverActionBody.slice(0, 200)}...`
          )
        }
      }
    }
  })

  test('all DM page files should be testable', () => {
    expect(pageFiles.length).toBeGreaterThan(0)
    console.log(`Found ${pageFiles.length} page files to check`)
  })
})

describe('Resolved Param Capture Pattern', () => {
  test('example of correct pattern should pass', () => {
    const correctCode = `
      export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
        const { campaignId } = await params
        const currentCampaignId = campaignId // ✅ Proper capture
        
        async function createTown(formData: FormData) {
          'use server'
          await supabase.from('towns').insert({ campaign_id: currentCampaignId })
        }
      }
    `
    
    // Should not throw
    expect(() => {
      const serverActionRegex = /async function\s+\w+\s*\([^)]*\)\s*\{\s*['"]use server['"]([\s\S]*?)\}/g
      let match
      while ((match = serverActionRegex.exec(correctCode)) !== null) {
        const body = match[1]
        if (/\bcampaignId\b(?!\s*=)/.test(body)) {
          // Has problematic pattern, but check for capture
          if (!correctCode.includes('const currentCampaignId')) {
            throw new Error('Should have capture variable')
          }
        }
      }
    }).not.toThrow()
  })

  test('example of incorrect pattern should be caught', () => {
    const incorrectCode = `
      export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
        const { campaignId } = await params
        // ❌ No capture variable!
        
        async function createTown(formData: FormData) {
          'use server'
          await supabase.from('towns').insert({ campaign_id: campaignId })
        }
      }
    `
    
    // Should detect the problematic pattern
    let detectedProblem = false
    const serverActionRegex = /async function\s+\w+\s*\([^)]*\)\s*\{\s*['"]use server['"]([\s\S]*?)\}/g
    let match
    while ((match = serverActionRegex.exec(incorrectCode)) !== null) {
      const body = match[1]
      if (/\bcampaignId\b(?!\s*=)/.test(body)) {
        if (!incorrectCode.includes('const currentCampaignId')) {
          detectedProblem = true
        }
      }
    }
    
    expect(detectedProblem).toBe(true)
  })
})
