import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google"
import { connection } from "next/server"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
})

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"),
  title: { default: "CrubolDocs", template: "%s · CrubolDocs" },
  description: "Control documental y gestión de riesgos para tu sistema de gestión.",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render por petición en todas las páginas: el nonce de la CSP (src/proxy.ts) es por petición.
  await connection()
  return (
    <html lang="es-CO" className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" mobileOffset={{ top: 16 }} />
      </body>
    </html>
  )
}
