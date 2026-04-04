import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="h-12 w-64 skeleton rounded-md" />
          <div className="h-6 w-96 skeleton rounded-md" />
        </div>

        <div className="h-10 w-40 skeleton rounded-md" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-48 skeleton rounded-md" />
                <div className="h-4 w-full skeleton rounded-md mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-10 w-full skeleton rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
