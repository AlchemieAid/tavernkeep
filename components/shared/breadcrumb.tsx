'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BreadcrumbItem {
  label: string
  href: string
}

export function Breadcrumb() {
  const pathname = usePathname()
  const [campaignId, setCampaignId] = useState<string | null>(null)
  
  // Fetch campaign ID when on a shop page
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean)
    const shopIndex = segments.indexOf('shops')
    
    if (shopIndex !== -1 && segments[shopIndex + 1]) {
      const shopId = segments[shopIndex + 1]
      // Fetch campaign ID for this shop
      fetch(`/api/dm/shops/${shopId}`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.campaign_id) {
            setCampaignId(data.data.campaign_id)
          }
        })
        .catch(err => console.error('Failed to fetch campaign ID:', err))
    }
  }, [pathname])
  
  // Don't show breadcrumbs on login or root pages
  if (pathname === '/' || pathname === '/login' || pathname === '/callback') {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []
  
  // Track IDs for building proper hierarchy
  let currentCampaignId: string | null = null
  let shopId: string | null = null
  
  // Parse the URL to build hierarchical breadcrumbs
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isId = segment.length > 20 || /^[a-zA-Z0-9-_]{10,}$/.test(segment)
    
    // Skip 'dm' and 'dashboard'
    if (segment === 'dm' || segment === 'dashboard') continue
    
    // Track campaign ID
    if (segments[i - 1] === 'campaigns' && isId) {
      currentCampaignId = segment
      breadcrumbs.push({
        label: 'Campaign',
        href: `/dm/campaigns/${currentCampaignId}`,
      })
    }
    // Track shop ID
    else if (segments[i - 1] === 'shops' && isId) {
      shopId = segment
      // If we have a fetched campaign ID and no campaign in breadcrumbs yet, add it
      if (campaignId && !currentCampaignId) {
        breadcrumbs.push({
          label: 'Campaign',
          href: `/dm/campaigns/${campaignId}`,
        })
      }
      breadcrumbs.push({
        label: 'Shop',
        href: `/dm/shops/${shopId}`,
      })
    }
    // Handle 'new' pages - show what's being created
    else if (segment === 'new') {
      if (segments[i - 1] === 'campaigns') {
        breadcrumbs.push({
          label: 'New Campaign',
          href: pathname,
        })
      } else if (segments[i - 1] === 'shops') {
        breadcrumbs.push({
          label: 'New Shop',
          href: pathname,
        })
      } else if (segments[i - 1] === 'items') {
        breadcrumbs.push({
          label: 'New Item',
          href: pathname,
        })
      }
    }
    // Handle QR code page
    else if (segment === 'qr') {
      breadcrumbs.push({
        label: 'QR Code',
        href: pathname,
      })
    }
  }

  // Don't show breadcrumbs if there's nothing to show
  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-on-surface-variant mb-4">
      <Link 
        href="/dm/dashboard" 
        className="hover:text-gold transition-colors flex items-center"
        title="Dashboard"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        return (
          <div key={index} className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4" />
            <Link 
              href={crumb.href}
              className={`hover:text-gold transition-colors ${isLast ? 'text-gold font-medium' : ''}`}
            >
              {crumb.label}
            </Link>
          </div>
        )
      })}
    </nav>
  )
}
