'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, QrCode, Users } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface CampaignInviteModalProps {
  campaignId: string
  campaignName: string
  inviteToken: string
}

export function CampaignInviteModal({ campaignId, campaignName, inviteToken }: CampaignInviteModalProps) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteToken}`

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="w-4 h-4 mr-2" />
          Invite Players
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-gold" />
            Invite Players to {campaignName}
          </DialogTitle>
          <DialogDescription>
            Share this link or QR code with your players to invite them to join your campaign.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center p-6 bg-white rounded-lg">
            <QRCodeSVG value={inviteUrl} size={200} level="H" />
          </div>

          {/* Invite Link */}
          <div className="space-y-2">
            <Label htmlFor="invite-link">Invite Link</Label>
            <div className="flex gap-2">
              <Input
                id="invite-link"
                value={inviteUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600">Copied to clipboard!</p>
            )}
          </div>

          {/* Invite Code */}
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <div className="flex gap-2">
              <Input
                id="invite-code"
                value={inviteToken}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(inviteToken)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted">
              Players can enter this code at /join
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-surface p-4 space-y-2">
            <h4 className="font-semibold text-sm">How to share:</h4>
            <ul className="text-sm text-muted space-y-1 list-disc list-inside">
              <li>Show the QR code to players in person</li>
              <li>Copy and share the invite link via Discord/Slack</li>
              <li>Share the invite code for manual entry</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
