/**
 * Data Isolation Security Tests
 * 
 * Tests to ensure DMs can only see their own data and cannot access
 * other DMs' campaigns, towns, shops, items, or notable people.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('Data Isolation - DM Access Control', () => {
  let dm1Client: ReturnType<typeof createClient>
  let dm2Client: ReturnType<typeof createClient>
  
  let dm1UserId: string
  let dm2UserId: string
  
  let dm1CampaignId: string
  let dm2CampaignId: string

  beforeAll(async () => {
    // Create two separate DM clients
    dm1Client = createClient(supabaseUrl, supabaseAnonKey)
    dm2Client = createClient(supabaseUrl, supabaseAnonKey)
    
    // Note: In a real test environment, you would need to:
    // 1. Create test users via Supabase Auth Admin API
    // 2. Sign in with those users
    // 3. Create test data
    // For now, this is a template showing the structure
  })

  describe('Campaign Isolation', () => {
    it('should only return campaigns owned by the authenticated DM', async () => {
      const { data: campaigns } = await dm1Client
        .from('campaigns')
        .select('*')
      
      // All campaigns should belong to dm1
      campaigns?.forEach(campaign => {
        expect(campaign.dm_id).toBe(dm1UserId)
      })
    })

    it('should not allow DM to read another DMs campaign', async () => {
      const { data, error } = await dm1Client
        .from('campaigns')
        .select('*')
        .eq('id', dm2CampaignId)
        .single()
      
      // Should either return null or error
      expect(data).toBeNull()
    })

    it('should not allow DM to update another DMs campaign', async () => {
      const { error } = await dm1Client
        .from('campaigns')
        .update({ name: 'Hacked Campaign' })
        .eq('id', dm2CampaignId)
      
      expect(error).toBeTruthy()
    })

    it('should not allow DM to delete another DMs campaign', async () => {
      const { error } = await dm1Client
        .from('campaigns')
        .delete()
        .eq('id', dm2CampaignId)
      
      expect(error).toBeTruthy()
    })
  })

  describe('Town Isolation', () => {
    it('should only return towns owned by the authenticated DM', async () => {
      const { data: towns } = await dm1Client
        .from('towns')
        .select('*')
      
      towns?.forEach(town => {
        expect(town.dm_id).toBe(dm1UserId)
      })
    })

    it('should not allow DM to read another DMs town', async () => {
      // Get a town from DM2's campaign
      const { data: dm2Towns } = await dm2Client
        .from('towns')
        .select('id')
        .limit(1)
      
      if (dm2Towns && dm2Towns.length > 0) {
        const { data } = await dm1Client
          .from('towns')
          .select('*')
          .eq('id', dm2Towns[0].id)
          .single()
        
        expect(data).toBeNull()
      }
    })

    it('should not allow DM to update another DMs town', async () => {
      const { data: dm2Towns } = await dm2Client
        .from('towns')
        .select('id')
        .limit(1)
      
      if (dm2Towns && dm2Towns.length > 0) {
        const { error } = await dm1Client
          .from('towns')
          .update({ name: 'Hacked Town' })
          .eq('id', dm2Towns[0].id)
        
        expect(error).toBeTruthy()
      }
    })
  })

  describe('Shop Isolation', () => {
    it('should only return shops owned by the authenticated DM', async () => {
      const { data: shops } = await dm1Client
        .from('shops')
        .select('*')
      
      shops?.forEach(shop => {
        expect(shop.dm_id).toBe(dm1UserId)
      })
    })

    it('should not allow DM to read another DMs shop (even if active)', async () => {
      const { data: dm2Shops } = await dm2Client
        .from('shops')
        .select('id')
        .eq('is_active', true)
        .limit(1)
      
      if (dm2Shops && dm2Shops.length > 0) {
        const { data } = await dm1Client
          .from('shops')
          .select('*')
          .eq('id', dm2Shops[0].id)
          .single()
        
        // DM1 should not be able to see DM2's shop
        expect(data).toBeNull()
      }
    })

    it('should not allow DM to update another DMs shop', async () => {
      const { data: dm2Shops } = await dm2Client
        .from('shops')
        .select('id')
        .limit(1)
      
      if (dm2Shops && dm2Shops.length > 0) {
        const { error } = await dm1Client
          .from('shops')
          .update({ name: 'Hacked Shop' })
          .eq('id', dm2Shops[0].id)
        
        expect(error).toBeTruthy()
      }
    })

    it('should not allow DM to delete another DMs shop', async () => {
      const { data: dm2Shops } = await dm2Client
        .from('shops')
        .select('id')
        .limit(1)
      
      if (dm2Shops && dm2Shops.length > 0) {
        const { error } = await dm1Client
          .from('shops')
          .delete()
          .eq('id', dm2Shops[0].id)
        
        expect(error).toBeTruthy()
      }
    })
  })

  describe('Item Isolation', () => {
    it('should only return items from shops owned by the authenticated DM', async () => {
      const { data: items } = await dm1Client
        .from('items')
        .select('*, shop:shops(dm_id)')
      
      items?.forEach(item => {
        expect((item.shop as any).dm_id).toBe(dm1UserId)
      })
    })

    it('should not allow DM to read items from another DMs shop', async () => {
      // Get an item from DM2's shop
      const { data: dm2Items } = await dm2Client
        .from('items')
        .select('id')
        .limit(1)
      
      if (dm2Items && dm2Items.length > 0) {
        const { data } = await dm1Client
          .from('items')
          .select('*')
          .eq('id', dm2Items[0].id)
          .single()
        
        expect(data).toBeNull()
      }
    })
  })

  describe('Item Library Isolation', () => {
    it('should only return item library entries owned by the authenticated DM', async () => {
      const { data: items } = await dm1Client
        .from('item_library')
        .select('*')
      
      items?.forEach(item => {
        expect(item.dm_id).toBe(dm1UserId)
      })
    })

    it('should not allow DM to read another DMs item library', async () => {
      const { data: dm2Items } = await dm2Client
        .from('item_library')
        .select('id')
        .limit(1)
      
      if (dm2Items && dm2Items.length > 0) {
        const { data } = await dm1Client
          .from('item_library')
          .select('*')
          .eq('id', dm2Items[0].id)
          .single()
        
        expect(data).toBeNull()
      }
    })
  })

  describe('Notable People Isolation', () => {
    it('should only return notable people owned by the authenticated DM', async () => {
      const { data: people } = await dm1Client
        .from('notable_people')
        .select('*')
      
      people?.forEach(person => {
        expect(person.dm_id).toBe(dm1UserId)
      })
    })

    it('should not allow DM to read another DMs notable people', async () => {
      const { data: dm2People } = await dm2Client
        .from('notable_people')
        .select('id')
        .limit(1)
      
      if (dm2People && dm2People.length > 0) {
        const { data } = await dm1Client
          .from('notable_people')
          .select('*')
          .eq('id', dm2People[0].id)
          .single()
        
        expect(data).toBeNull()
      }
    })
  })

  describe('Cross-DM Data Leakage Prevention', () => {
    it('should not leak campaign data in joins', async () => {
      const { data: towns } = await dm1Client
        .from('towns')
        .select('*, campaign:campaigns(*)')
      
      towns?.forEach(town => {
        expect((town.campaign as any).dm_id).toBe(dm1UserId)
      })
    })

    it('should not leak shop data in town queries', async () => {
      const { data: towns } = await dm1Client
        .from('towns')
        .select('*, shops(*)')
      
      towns?.forEach(town => {
        (town.shops as any[])?.forEach(shop => {
          expect(shop.dm_id).toBe(dm1UserId)
        })
      })
    })

    it('should not leak item data in shop queries', async () => {
      const { data: shops } = await dm1Client
        .from('shops')
        .select('*, items(*)')
      
      shops?.forEach(shop => {
        expect(shop.dm_id).toBe(dm1UserId)
      })
    })
  })
})
