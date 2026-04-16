/**
 * Root Layout
 * @description Global app layout with fonts, metadata, and styling
 */

import type { Metadata } from "next"
import { Noto_Serif, Manrope, Courier_Prime } from "next/font/google"
import "./globals.css"

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-serif",
  display: "swap",
})

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
})

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier-prime",
  display: "swap",
})

export const metadata: Metadata = {
  title: "TavernKeep - D&D Shop Management",
  description: "Create, manage, and share fantasy shops with your D&D players",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${notoSerif.variable} ${manrope.variable} ${courierPrime.variable} font-body antialiased bg-background text-on-surface`}
      >
        {children}
      </body>
    </html>
  )
}
