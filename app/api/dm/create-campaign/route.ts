/**
 * Create Campaign API Route
 * @route POST /api/dm/create-campaign
 * @description Simple campaign creation without AI generation
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  currency: z.string().max(20).default('gp'),
  setting: z.string().max(2000).optional(),
  tone: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { name, description, currency, setting, tone } = parsed.data

    // Generate invite token and slug
    const inviteToken = crypto.randomUUID()
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        dm_id: user.id,
        name,
        description: description || null,
        currency: currency || 'gp',
        setting: setting || null,
        // Store tone in the campaign record (we may need to add this column)
        invite_token: inviteToken,
        slug,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json(
        { data: null, error: { message: `Failed to create campaign: ${error.message}` } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: campaign, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    )
  }
}
