/**
 * Campaign Not Found Page
 * @description 404 page for missing or unauthorized campaigns
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-error">Campaign Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="body-md text-on-surface-variant">
            This campaign does not exist or you do not have permission to view it.
          </p>
          <Button asChild>
            <Link href="/dm/dashboard">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
