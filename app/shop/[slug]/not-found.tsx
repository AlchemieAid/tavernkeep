import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-error">Shop Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="body-md text-on-surface-variant">
            This shop does not exist or is currently closed.
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
