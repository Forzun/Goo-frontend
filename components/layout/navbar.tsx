import pixel from "@/app/page"

interface NavItem {
  icon?: string
  label: string
  href?: string
}

const navbar: NavItem[] = [
  {
    label: "Docs",
    href: "https://github.com/forzun/googo",
  },
  {
    label: "Models",
    href: "https://ollama.com/search",
  },
]

export default function Navbar() {
  return (
    <>
      <nav
        className="flex items-center justify-between px-70 py-4"
        style={{ ...pixel, fontSize: "14px" }}
      >
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-1 font-semibold">
            <span
              style={{
                ...pixel,
                fontSize: "50px",
                color: "#FF8D52",
                lineHeight: 1,
              }}
            >
              G
            </span>
            <span style={{ fontSize: "20px" }}>GooCli</span>
          </a>

          {navbar.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="opacity-80 transition-opacity hover:opacity-100 text-lg"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-5">
          {/* <a
            href="https://x.com/ForZun_/status/2079052568697991390"
            className="opacity-80 transition-opacity hover:opacity-100"
          >
            Try the demo
          </a> */}
          <a
            href="https://github.com/forzun/googo"
            className="rounded-full border border-white/10 bg-black/60 px-5 py-2 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
            style={{ ...pixel, fontSize: "14px" }}
          >
            Try out
          </a>
        </div>
      </nav>
    </>
  )
}
