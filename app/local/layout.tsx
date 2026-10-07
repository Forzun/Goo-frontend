import { Geist, Geist_Mono, VT323, Cormorant } from "next/font/google"

import "./local.css"
import { cn } from "@/lib/utils"
import GetLocalLocation from "@/components/get-local"
import { useWorkspace } from "@/hooks/use-workspace"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const {status} = useWorkspace()


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
      <body suppressHydrationWarning>
        {status == "no-workspace" ? < GetLocalLocation /> : status === "loading" ? "": <ChatAppExample />
        }
      {children}
      </body>
    </html>
  )
}
