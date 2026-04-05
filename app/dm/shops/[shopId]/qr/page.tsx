'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function QRCodePage() {
  const params = useParams()
  const router = useRouter()
  const shopId = params.shopId as string
  const [shop, setShop] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [shopUrl, setShopUrl] = useState('')

  useEffect(() => {
    async function loadShop() {
      try {
        const response = await fetch(`/api/dm/shops/${shopId}`)
        const data = await response.json()
        
        if (data.error) {
          router.push('/dm/dashboard')
          return
        }

        setShop(data.data)
        const url = `${window.location.origin}/shop/${data.data.slug}`
        setShopUrl(url)
      } catch (error) {
        console.error('Error loading shop:', error)
        router.push('/dm/dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadShop()
  }, [shopId, router])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shopUrl)
  }

  const downloadQR = () => {
    const svg = document.getElementById('qr-code')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')

      const downloadLink = document.createElement('a')
      downloadLink.download = `${shop.slug}-qr.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-surface p-6">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-48 skeleton rounded-md mb-8" />
          <Card>
            <CardContent className="py-12">
              <div className="h-64 w-64 skeleton rounded-md mx-auto" />
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (!shop) return null

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href={`/dm/shops/${shopId}`} className="body-md text-gold hover:underline">
            ← Back to Shop
          </Link>
          <h1 className="headline-lg text-gold mt-4">Share Shop</h1>
          <p className="body-md text-on-surface-variant mt-2">
            {shop.name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center p-8 bg-white rounded-lg">
              <QRCodeSVG
                id="qr-code"
                value={shopUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-2">
              <label className="label-sm text-on-surface-variant">Shop URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shopUrl}
                  readOnly
                  className="flex-1 h-9 rounded-md bg-surface-container-lowest px-3 py-1 text-sm"
                />
                <Button onClick={copyToClipboard} variant="outline">
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={downloadQR} className="flex-1">
                Download QR Code
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={shopUrl} target="_blank">
                  Preview Shop
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t border-outline">
              <p className="body-sm text-on-surface-variant">
                💡 <strong>Tip:</strong> Players can scan this QR code with their phone camera to instantly access the shop. No login required!
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </main>
  )
}
