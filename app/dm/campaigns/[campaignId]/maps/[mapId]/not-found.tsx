import Link from 'next/link'

export default function MapNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <h2 className="font-noto-serif text-2xl text-on-surface">Map Not Found</h2>
      <p className="text-sm font-manrope text-on-surface-variant">
        This map doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/dm/dashboard" className="text-sm font-manrope text-primary hover:underline">
        Back to Dashboard
      </Link>
    </div>
  )
}
