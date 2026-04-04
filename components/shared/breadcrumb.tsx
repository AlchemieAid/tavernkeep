'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

export function Breadcrumb() {
  const pathname = usePathname()
  
  // Don't show breadcrumbs on login or root pages
  if (pathname === '/' || pathname === '/login' || pathname === '/callback') {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  
  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    
    // Format segment name
    let label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
    
    // Special cases for better labels
    if (segment === 'dm') label = 'DM'
    if (segment === 'new') label = 'New'
    if (segment === 'qr') label = 'QR Code'
    
    // Don't link UUIDs or slugs (they're not meaningful navigation)
    const isId = segment.length > 20 || /^[a-zA-Z0-9-_]{10,}$/.test(segment)
    
    return {
      label: isId ? '...' : label,
      href: isId ? null : href,
      isLast,
    }
  })

  return (
    <nav className="flex items-center space-x-2 text-sm text-on-surface-variant mb-4">
      <Link 
        href="/dm/dashboard" 
        className="hover:text-gold transition-colors flex items-center"
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
            <span className={crumb.isLast ? 'text-gold font-medium' : ''}>
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
