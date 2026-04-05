'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { rateGeneration } from '@/lib/generation-cache'

interface GenerationRatingProps {
  cacheId: string
  userId: string
  onRated?: () => void
}

export function GenerationRating({ cacheId, userId, onRated }: GenerationRatingProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return

    setIsSubmitting(true)
    const success = await rateGeneration(cacheId, userId, rating, feedback)
    
    if (success) {
      setSubmitted(true)
      onRated?.()
    }
    setIsSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
        Thank you for rating this generation! Your feedback helps improve future results.
      </div>
    )
  }

  return (
    <div className="border border-outline rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium">Rate this AI generation</p>
      
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                star <= (hoveredRating || rating)
                  ? 'fill-gold text-gold'
                  : 'text-outline'
              }`}
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <>
          <Textarea
            placeholder="Optional: Share what you liked or what could be improved..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            className="text-sm"
          />
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="sm"
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </>
      )}
    </div>
  )
}
