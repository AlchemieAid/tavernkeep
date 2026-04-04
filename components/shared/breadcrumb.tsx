'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string | null
  isLast: boolean
}

export function Breadcrumb() {
  const pathname = usePathname()
  
  // Don't show breadcrumbs on login or root pages
  if (pathname === '/' || pathname === '/login' || pathname === '/callback') {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []
  
  // Build smart breadcrumbs based on route structure
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isLast = i === segments.length - 1
    
    // Check if this is an ID (UUID or slug)
    const isId = segment.length > 20 || /^[a-zA-Z0-9-_]{10,}$/.test(segment)
    
    // Skip 'dm' segment - it's not a meaningful breadcrumb
    if (segment === 'dm') continue
    
    // Handle campaigns
    if (segment === 'campaigns') {
      // Don't link to /dm/campaigns (doesn't exist)
      breadcrumbs.push({
        label: 'Campaigns',
        href: null,
        isLast: isLast,
      })
    }
    // Handle campaign ID
    else if (i > 0 && segments[i - 1] === 'campaigns' && isId) {
      // Link back to the campaign page
      breadcrumbs.push({
        label: 'Campaign',
        href: `/dm/campaigns/${segment}`,
        isLast: isLast,
      })
    }
    // Handle shops
    else if (segment === 'shops') {
      // Don't link to /dm/shops (doesn't exist)
      breadcrumbs.push({
        label: 'Shops',
        href: null,
        isLast: isLast,
      })
    }
    // Handle shop ID
    else if (i > 0 && segments[i - 1] === 'shops' && isId) {
      // Link back to the shop page
      breadcrumbs.push({
        label: 'Shop',
        href: `/dm/shops/${segment}`,
        isLast: isLast,
      })
    }
    // Handle items
    else if (segment === 'items') {
      breadcrumbs.push({
        label: 'Items',
        href: null,
        isLast: isLast,
      })
    }
    // Handle 'new' pages
    else if (segment === 'new') {
      breadcrumbs.push({
        label: 'New',
        href: null,
        isLast: isLast,
      })
    }
    // Handle 'qr' pages
    else if (segment === 'qr') {
      breadcrumbs.push({
        label: 'QR Code',
        href: null,
        isLast: isLast,
      })
    }
    // Handle dashboard
    else if (segment === 'dashboard') {
      // Skip - home icon already links here
      continue
    }
    // Handle other segments
    else if (!isId) {
      const label = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
      
      breadcrumbs.push({
        label,
        href: null,
        isLast: isLast,
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
      
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4" />
          {crumb.href && !crumb.isLast ? (
            <Link 
              href={crumb.href}
              className="hover:text-gold transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className={crumb.isLast ? 'text-gold font-medium' : 'text-on-surface-variant'}>
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
