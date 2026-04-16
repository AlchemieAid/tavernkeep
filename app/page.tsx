/**
 * Home Page
 * 
 * @page /
 * @description Landing page with hero section and feature highlights
 */

import Link from "next/link"
import { Sparkles, Store, Users, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
        <div className="max-w-4xl text-center space-y-8">
          <h1 className="headline-lg text-gold">TavernKeep</h1>
          <p className="body-lg text-on-surface-variant max-w-2xl mx-auto">
            The ultimate D&D shop management platform for Dungeon Masters. Create campaigns, towns, and shops with AI-powered generation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link
              href="/login"
              className="gold-gradient px-8 py-4 rounded-md text-on-gold title-md hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
            <Link
              href="/shop/demo"
              className="ghost-border px-8 py-4 rounded-md text-gold title-md hover:bg-surface-container-low transition-colors"
            >
              View Demo Shop
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="headline-md text-center mb-12">Features</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-surface-container p-6 rounded-lg border border-outline">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-gold" />
            </div>
            <h3 className="title-md mb-2">AI Generation</h3>
            <p className="body-sm text-on-surface-variant">
              Generate campaigns, towns, shops, and items with AI. Smart caching saves costs.
            </p>
          </div>

          <div className="bg-surface-container p-6 rounded-lg border border-outline">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-gold" />
            </div>
            <h3 className="title-md mb-2">Shop Management</h3>
            <p className="body-sm text-on-surface-variant">
              Organize shops by campaigns and towns. Track inventory, pricing, and shopkeeper details.
            </p>
          </div>

          <div className="bg-surface-container p-6 rounded-lg border border-outline">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-gold" />
            </div>
            <h3 className="title-md mb-2">Player Sharing</h3>
            <p className="body-sm text-on-surface-variant">
              Share shops with players via QR codes. Control what items are visible and when.
            </p>
          </div>

          <div className="bg-surface-container p-6 rounded-lg border border-outline">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-gold" />
            </div>
            <h3 className="title-md mb-2">Cost Optimized</h3>
            <p className="body-sm text-on-surface-variant">
              Built-in rate limiting, prompt caching, and smart brevity reduce AI costs by 95%+.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-surface-container border-t border-outline py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="headline-md mb-4">Ready to enhance your D&D campaign?</h2>
          <p className="body-md text-on-surface-variant mb-8">
            Join DMs who are using TavernKeep to create immersive shopping experiences.
          </p>
          <Link
            href="/login"
            className="inline-block gold-gradient px-8 py-4 rounded-md text-on-gold title-md hover:opacity-90 transition-opacity"
          >
            Start Creating
          </Link>
        </div>
      </div>
    </main>
  )
}
