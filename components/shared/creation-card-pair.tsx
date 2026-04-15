/**
 * Creation Card Pair
 * 
 * @fileoverview
 * Layout component that displays AI generator and manual creation options side-by-side.
 * Used throughout DM interface for entity creation.
 * 
 * @features
 * - Side-by-side AI vs manual options
 * - Consistent layout pattern
 * - Reusable across entity types
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ReactNode } from 'react'

interface CreationCardPairProps {
  aiGenerator: ReactNode
  manualTitle: string
  manualDescription: string
  manualButtonText: string
  manualButtonHref: string
}

export function CreationCardPair({
  aiGenerator,
  manualTitle,
  manualDescription,
  manualButtonText,
  manualButtonHref,
}: CreationCardPairProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 mb-6">
      {aiGenerator}
      
      <Card>
        <CardHeader>
          <CardTitle>{manualTitle}</CardTitle>
          <CardDescription>{manualDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={manualButtonHref}>{manualButtonText}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
