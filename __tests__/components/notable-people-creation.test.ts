/**
 * Notable People Creation Tests
 * 
 * Regression test for: "Failed to create notable people in DB" error.
 * Root cause: Server action closure not capturing resolved townId param.
 */

import * as fs from 'fs'
import * as path from 'path'

const NOTABLE_PEOPLE_NEW_PAGE = path.join(
  process.cwd(), 
  'app', 'dm', 'towns', '[townId]', 'notable-people', 'new', 'page.tsx'
)

describe('Notable People Creation Page', () => {
  test('should have proper closure capture pattern', () => {
    if (!fs.existsSync(NOTABLE_PEOPLE_NEW_PAGE)) {
      throw new Error('Notable people new page not found at expected path')
    }
    
    const content = fs.readFileSync(NOTABLE_PEOPLE_NEW_PAGE, 'utf-8')
    
    // Must have the capture variable pattern
    expect(content).toContain('const currentTownId = townId')
    
    // Must NOT use raw townId in server action
    const serverActionMatch = content.match(/async function createNotablePerson[\s\S]*?revalidatePath/)
    expect(serverActionMatch).toBeTruthy()
    
    // The server action should use currentTownId, not townId
    const serverActionBody = serverActionMatch![0]
    expect(serverActionBody).toContain('currentTownId')
    expect(serverActionBody).not.toMatch(/townId(?!\s*=)/) // Should not reference townId except in assignment
  })

  test('should properly insert with correct town_id', () => {
    const content = fs.readFileSync(NOTABLE_PEOPLE_NEW_PAGE, 'utf-8')
    
    // Must insert with currentTownId
    expect(content).toMatch(/town_id:\s*currentTownId/)
    
    // Must revalidate with currentTownId
    expect(content).toMatch(/revalidatePath\(\s*[`'"].*\$\{currentTownId\}/)
  })
})

describe('Town Creation Page', () => {
  const TOWN_NEW_PAGE = path.join(
    process.cwd(),
    'app', 'dm', 'campaigns', '[campaignId]', 'towns', 'new', 'page.tsx'
  )
  
  test('should have proper closure capture pattern', () => {
    if (!fs.existsSync(TOWN_NEW_PAGE)) {
      throw new Error('Town new page not found at expected path')
    }
    
    const content = fs.readFileSync(TOWN_NEW_PAGE, 'utf-8')
    
    // Must have the capture variable pattern
    expect(content).toContain('const currentCampaignId = campaignId')
    
    // Must use currentCampaignId in insert
    expect(content).toMatch(/campaign_id:\s*currentCampaignId/)
  })
})

describe('Shop Creation Pages', () => {
  test('shops/new page should capture campaignId', () => {
    const SHOP_NEW_PAGE = path.join(
      process.cwd(),
      'app', 'dm', 'shops', 'new', 'page.tsx'
    )
    
    if (!fs.existsSync(SHOP_NEW_PAGE)) {
      throw new Error('Shop new page not found')
    }
    
    const content = fs.readFileSync(SHOP_NEW_PAGE, 'utf-8')
    expect(content).toContain('const currentCampaignId = campaignId')
    expect(content).toMatch(/campaign_id:\s*currentCampaignId/)
  })
  
  test('towns/[townId]/shops/new page should capture townId', () => {
    const TOWN_SHOP_NEW_PAGE = path.join(
      process.cwd(),
      'app', 'dm', 'towns', '[townId]', 'shops', 'new', 'page.tsx'
    )
    
    if (!fs.existsSync(TOWN_SHOP_NEW_PAGE)) {
      throw new Error('Town shop new page not found')
    }
    
    const content = fs.readFileSync(TOWN_SHOP_NEW_PAGE, 'utf-8')
    expect(content).toContain('const currentTownId = townId')
    expect(content).toMatch(/town_id:\s*currentTownId/)
  })
})
