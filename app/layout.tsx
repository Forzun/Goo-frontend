import { Geist, Geist_Mono, VT323, Cormorant } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { RootProvider } from "fumadocs-ui/provider/next"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
})

const cormorant = Cormorant({
  subsets: ["latin"],
  variable: "--font-cormorant",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        vt323.variable,
        cormorant.variable
      )}
    >
      <body   suppressHydrationWarning>
        <RootProvider
        theme={{enabled: true}}>{children}</RootProvider>
      </body>
    </html>
  )
}
