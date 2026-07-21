import bg from "@/assets/bg-mountain.jpg"
import HeroSection from "@/components/layout/hero"
import Navbar from "@/components/layout/navbar"

export const pixel = { fontFamily: "var(--font-vt323), monospace" } as const
export const serif = { fontFamily: "var(--font-cormorant), serif" } as const

export default function Page() {
  return (
    <div
      className="relative z-0 min-h-screen w-full bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `url(${bg.src})`, ...pixel, fontSize: "13px" }}
    >
      {/* Top Banner Gradient from Figma */}

      <div
        className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[375px] w-full -translate-x-1/2"
        style={{
          background:
            "linear-gradient(to bottom, rgba(56, 23, 12, 0.7), rgba(91, 37, 19, 0.35), rgba(92, 37, 19, 0))",
        }}
      />

      <Navbar />
      {/* Hero */}
      <HeroSection />
    </div>
  )
}
