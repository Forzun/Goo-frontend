"use client"

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react"

import { useHoverCapable } from "@/hooks/use-hover-capable"
import { SPRING_MOUSE } from "@/lib/ease"

const MAX_EYE_SHIFT = 1.2

export function GooFaceIcon({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const canHover = useHoverCapable()
  const canTrack = !reduceMotion && canHover
  const eyeX = useMotionValue(0)
  const eyeY = useMotionValue(0)
  const eyeBlink = useMotionValue(1)
  const springX = useSpring(eyeX, SPRING_MOUSE)
  const springY = useSpring(eyeY, SPRING_MOUSE)

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!canTrack) return

    const rect = event.currentTarget.getBoundingClientRect()
    const clamp = (value: number) => Math.max(-1, Math.min(1, value))

    eyeX.set(
      clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2) *
        MAX_EYE_SHIFT
    )
    eyeY.set(
      clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2) *
        MAX_EYE_SHIFT
    )
  }

  function handlePointerLeave() {
    eyeX.set(0)
    eyeY.set(0)
  }

  function handleClick() {
    animate(eyeBlink, [1, 0.12, 1], {
      duration: 0.28,
      times: [0, 0.45, 1],
      ease: "easeInOut",
    })
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <motion.line
        x1="9.5"
        y1="9.5"
        x2="9.5"
        y2="14.5"
        stroke="var(--sidebar)"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          x: springX,
          y: springY,
          scaleY: eyeBlink,
          transformBox: "fill-box",
          transformOrigin: "center",
        }}
      />
      <motion.line
        x1="14.5"
        y1="9.5"
        x2="14.5"
        y2="14.5"
        stroke="var(--sidebar)"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          x: springX,
          y: springY,
          scaleY: eyeBlink,
          transformBox: "fill-box",
          transformOrigin: "center",
        }}
      />
    </svg>
  )
}
