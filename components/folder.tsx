"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { ExpandingArrowButton } from "./local/motion/expanding-arrow-button"
import { motion } from "motion/react"
import { useWorkspace } from "@/hooks/use-workspace"
import {
  useAnimatedToastStack,
  AnimatedToastStack,
} from "./local/motion/animated-toast-stack"

type MenuPos = { x: number; y: number } | null

const MENU_ITEMS = ["Open", "Rename", "Properties", "Quit"] as const

function DocCard({
  rotate,
  translateX,
  translateY,
  delay,
  expanded,
  baseRotate = 0,
  baseTranslateX = 0,
}: {
  rotate: number
  translateX: number
  translateY: number
  delay: number
  expanded: boolean
  baseRotate?: number
  baseTranslateX?: number
}) {
  return (
    <motion.div
      animate={{
        rotate: expanded ? rotate : baseRotate,
        translateX: expanded ? translateX : baseTranslateX,
        translateY: expanded ? translateY : 0,
        y: expanded ? -8 : 0,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay }}
      className="absolute left-1/2 -translate-x-1/2"
      style={{ top: expanded ? 0 : -8, zIndex: 0 }}
    >
      <div className="flex h-[64px] w-[52px] flex-col gap-[5px] rounded-[8px] bg-gradient-to-b from-[#f0f0f8] to-[#dcdcea] px-[7px] pt-[10px] shadow-md">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-[4px] w-full rounded-full bg-[#b0b0cc]/60"
          />
        ))}
      </div>
    </motion.div>
  )
}

type Palette = {
  tab: string
  back: [string, string]
  front: [string, string]
}

const BLUE_PALETTE: Palette = {
  tab: "#2f78c9",
  back: ["#3f93e6", "#3585d8"],
  front: ["#6cc3fa", "#4fa8f0"],
}

function FolderShell({
  p,
  topOffset,
  children,
}: {
  p: Palette
  topOffset: number
  children?: React.ReactNode
}) {
  const t = "background 300ms ease"
  return (
    <div className="relative h-[72px] w-[128px]" aria-hidden="true">
      <div
        className="absolute -top-[14px] left-0 h-[26px] w-[56px] rounded-t-[9px]"
        style={{ background: p.tab, transition: t }}
      />
      <div
        className="absolute inset-0 rounded-[10px]"
        style={{
          background: `linear-gradient(to bottom, ${p.back[0]}, ${p.back[1]})`,
          transition: t,
          zIndex: 0,
        }}
      />
      {children && (
        <div className="absolute inset-0" style={{ zIndex: 5 }}>
          {children}
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 rounded-[10px] shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
        style={{
          top: topOffset,
          background: `linear-gradient(to bottom, ${p.front[0]}, ${p.front[1]})`,
          transition: t,
          zIndex: 10,
        }}
      >
        <div className="absolute inset-x-3 bottom-[6px] h-px rounded-full bg-white/30" />
      </div>
    </div>
  )
}

function FolderWithFiles({
  filled,
  hovered,
}: {
  filled: boolean
  hovered: boolean
}) {
  const expanded = filled && hovered
  const docs = [
    {
      rotate: -14,
      translateX: -22,
      translateY: -4,
      delay: 0,
      baseRotate: -10,
      baseTranslateX: -18,
    },
    {
      rotate: 0,
      translateX: 0,
      translateY: -10,
      delay: 0.04,
      baseRotate: 0,
      baseTranslateX: 0,
    },
    {
      rotate: 14,
      translateX: 22,
      translateY: -4,
      delay: 0.08,
      baseRotate: 10,
      baseTranslateX: 18,
    },
  ]

  return (
    <div className="relative h-[88px] w-[128px]" aria-hidden="true">
      <div className="absolute inset-0" style={{ zIndex: 10 }}>
        <FolderShell p={BLUE_PALETTE} topOffset={expanded ? 32 : 10}>
          {/* DocCards live inside the front panel (div 3) */}
          {filled &&
            docs.map((d, i) => <DocCard key={i} expanded={expanded} {...d} />)}
        </FolderShell>
      </div>
    </div>
  )
}

export default function Folder() {
  const [menu, setMenu] = useState<MenuPos>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const folderRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [blink, setBlink] = useState<boolean>(false)
  const [isHoveringStart, setIsHoveringStart] = useState(false)
  const [isFolderHovered, setIsFolderHovered] = useState(false)
  const { showToast, toasts } = useAnimatedToastStack({
    defaultDuration: 3600,
    limit: 5,
  })

  const ws = useWorkspace()

  const handleSelect = useCallback(async () => {
    setMenu(null)
    if (inputValue == "") {
      showToast({
        status: "error",
        title: "Folder can't be Untitled",
        duration: 1501,
      })
      setBlink(false)
      return
    }

    try {
      await ws.selectWorkspace(inputValue)
      setBlink(true)
      showToast({
        status: "success",
        title: "Click on start button to Go",
        duration: 1500,
      })
    } catch (err) {
      setBlink(false)
      showToast({
        status: "error",
        title: "Failed to open workspace" + err,
      })
    }
  }, [inputValue, showToast, ws])

  const handleStart = useCallback(async () => {
    setBlink(false)
    if (inputValue == "") {
      showToast({
        status: "error",
        title: "Folder can't be Untitled",
      })
      return
    }
    try {
      if (blink) {
        window.location.reload()
        //pre-loader animation
      } else {
        await ws.selectWorkspace(inputValue)
        setBlink(true)
        showToast({
                status: "success",
                title: "Click on start button to Go",
                duration: 1500,
              })
      }
    } catch (err) {
      showToast({
        status: "error",
        title: "Failed to open workspace" + err,
      })
    }
  }, [inputValue, ws, blink, showToast])

  const handleProperties = useCallback(() => {}, [])

  const handleRename = useCallback(() => {
    setMenu(null)
    inputRef.current?.focus()
  }, [])

  const close = useCallback(
    (value?: (typeof MENU_ITEMS)[number]) => {
      switch (value) {
        case "Open":
          handleSelect()
          break

        case "Quit":
          setMenu(null)
          break

        case "Properties":
          handleProperties()
          break

        case "Rename":
          handleRename()
          break

        default:
          setMenu(null)
          break
      }
    },
    [handleSelect, handleProperties, handleRename]
  )

  // close on outside click / Escape / scroll
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    const onClick = () => close()
    const onScroll = () => close()
    window.addEventListener("click", onClick)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("click", onClick)
      window.removeEventListener("scroll", onScroll, false)
      window.removeEventListener("keydown", onKey)
    }
  }, [menu, close , ws.status])

  // Right click
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY })
  }

  // Long-press (touch / pen)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return
    const { clientX: x, clientY: y } = e
    pressTimer.current = setTimeout(() => setMenu({ x, y }), 500)
  }
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  // Shift + F10 (keyboard)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.shiftKey && e.key === "F10") {
      e.preventDefault()
      const r = folderRef.current?.getBoundingClientRect()
      if (r) setMenu({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center">
      <AnimatedToastStack
        toasts={toasts}
        position="top-center"
        className="absolute top-10"
      />
      <div className="flex flex-col items-center">
        <motion.button
          ref={folderRef}
          type="button"
          onContextMenu={onContextMenu}
          onPointerDown={onPointerDown}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onKeyDown={onKeyDown}
          onHoverStart={() => setIsFolderHovered(true)}
          onHoverEnd={() => setIsFolderHovered(false)}
          className="rounded-xl px-4 py-0 outline-none select-none [-webkit-touch-callout:none]"
          aria-haspopup="menu"
          aria-label="Folder. Right click, long-press, or press Shift F10 for options"
        >
          <FolderWithFiles filled={blink} hovered={isFolderHovered} />
        </motion.button>

        <div className="relative w-[128px]">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="relative z-10 h-[24px] w-full border-none bg-transparent text-center text-[15px] font-semibold tracking-tight outline-none"
            placeholder=""
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{ caretColor: "#3585d8" }}
          />
          {inputValue === "" && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
              animate={{ opacity: isFocused ? 0 : 1 }}
              transition={{ duration: 0.15 }}
            >
              <PopPlaceholder workspaceName={inputValue || "Untitled"} />
            </motion.div>
          )}
        </div>

        <p className="mt-1 text-[12px] text-neutral-500">
          long-press · Shift + F10
        </p>
      </div>

      {menu && (
        <ul
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 min-w-44 rounded-lg border border-white/10 bg-[#232323]/95 p-1 text-sm shadow-xl backdrop-blur"
        >
          {MENU_ITEMS.map((item) => (
            <li key={item} role="none">
              <button
                role="menuitem"
                onClick={() => close(item)}
                value={item as string}
                className="w-full rounded-md px-3 py-1.5 text-left text-neutral-200 hover:bg-[#3585d8] hover:text-white"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Start Button*/}
      <motion.div
        className="mt-2 flex w-full scale-78 justify-center p-6"
        animate={
          blink && !isHoveringStart ? { opacity: [1, 0.4, 1] } : { opacity: 1 }
        }
        transition={
          blink && !isHoveringStart
            ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
            : {}
        }
        onHoverStart={() => setIsHoveringStart(true)}
        onHoverEnd={() => setIsHoveringStart(false)}
      >
        <ExpandingArrowButton swipeHint={blink} onClick={handleStart}>
          Start
        </ExpandingArrowButton>
      </motion.div>
    </main>
  )
}

function PopPlaceholder({ workspaceName }: { workspaceName: string }) {
  const [visibleChars, setVisibleChars] = useState<number[]>([])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    workspaceName.split("").forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleChars((prev) => [...prev, i])
      }, i * 100)
      timers.push(t)
    })
    return () => timers.forEach(clearTimeout)
  }, [workspaceName])

  return (
    <span
      className="pointer-events-none text-[15px] font-semibold tracking-tight text-neutral-400 select-none"
      aria-hidden="true"
    >
      {workspaceName.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ scale: 1, opacity: 0 }}
          animate={
            visibleChars.includes(i)
              ? { scale: 1, opacity: 1 }
              : { scale: 0, opacity: 0 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  )
}
