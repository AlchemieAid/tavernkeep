/**
 * Join Landing Page
 * @page /join
 * @description Landing page explaining campaign invitations
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function JoinPage() {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.trim()) {
      router.push(`/join/${inviteCode.trim()}`)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="headline-md text-gold">Join a Campaign</CardTitle>
          <CardDescription className="body-md">
            Enter the invite code from your DM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <p className="text-xs text-muted">
                Your DM can find this code in their campaign settings
              </p>
            </div>

            <Button type="submit" className="w-full">
              Join Campaign
            </Button>

            <div className="text-center">
              <Link href="/player/campaigns" className="body-sm text-gold hover:underline">
                Back to My Campaigns
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
