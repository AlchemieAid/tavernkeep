import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="headline-lg text-gold">TavernKeep</h1>
        <p className="body-lg text-on-surface-variant">
          D&D Shop Management & Sharing Platform
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href="/login"
            className="gold-gradient px-8 py-4 rounded-md text-on-gold title-md hover:opacity-90 transition-opacity"
          >
            DM Sign In
          </Link>
          <Link
            href="/shop/demo"
            className="ghost-border px-8 py-4 rounded-md text-gold title-md hover:bg-surface-container-low transition-colors"
          >
            View Demo Shop
          </Link>
        </div>

        <p className="body-sm text-muted pt-8">
          Create fantasy shops, generate AI-powered inventory, and share with your players via QR code.
        </p>
      </div>
    </main>
  )
}
