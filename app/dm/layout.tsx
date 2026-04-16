/**
 * DM Layout
 * @description Layout wrapper for all DM pages with navigation and breadcrumbs
 */

import { NavHeader } from '@/components/shared/nav-header'
import { Breadcrumb } from '@/components/shared/breadcrumb'

export default function DMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <NavHeader />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Breadcrumb />
        {children}
      </div>
    </div>
  )
}
