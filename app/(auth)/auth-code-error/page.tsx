import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="headline-sm text-error">Authentication Error</CardTitle>
          <CardDescription className="body-md">
            The authentication process encountered an issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="body-sm text-on-surface-variant">
              This could be due to:
            </p>
            <ul className="list-disc list-inside space-y-2 body-sm text-on-surface-variant">
              <li>Google OAuth not yet configured (requires deployment URL)</li>
              <li>Invalid or expired authentication code</li>
              <li>Network connectivity issues</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/login">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
