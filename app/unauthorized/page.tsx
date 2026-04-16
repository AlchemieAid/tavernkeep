import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-4">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-6">
            You do not have permission to access the admin panel. 
            This area is restricted to authorized administrators only.
          </p>

          <div className="space-y-3">
            <Link href="/dm">
              <Button className="w-full">
                Return to Dashboard
              </Button>
            </Link>
            
            <p className="text-sm text-gray-500">
              If you believe you should have access, please contact a system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
