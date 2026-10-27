"use client"

import { useCallback, useEffect, useRef } from "react"
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
  const hovering = useRef(false)
  const idleAnimations = useRef<ReturnType<typeof animate>[]>([])

  const stopIdleAnimations = useCallback(() => {
    for (const controls of idleAnimations.current) controls.stop()
    idleAnimations.current = []
    eyeBlink.set(1)
  }, [eyeBlink])

  useEffect(() => {
    if (reduceMotion) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let resetTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleGlance = () => {
      timer = setTimeout(
        () => {
          if (cancelled) return

          if (!hovering.current) {
            stopIdleAnimations()

            const direction = Math.random() < 0.5 ? -1 : 1
            const x = direction * MAX_EYE_SHIFT * (0.55 + Math.random() * 0.45)
            const y = (Math.random() - 0.5) * MAX_EYE_SHIFT * 0.8

            idleAnimations.current.push(
              animate(eyeX, x, { duration: 0.45, ease: "easeInOut" }),
              animate(eyeY, y, { duration: 0.45, ease: "easeInOut" })
            )

            if (Math.random() < 0.7) {
              idleAnimations.current.push(
                animate(eyeBlink, [1, 0.12, 1], {
                  duration: 0.28,
                  times: [0, 0.45, 1],
                  ease: "easeInOut",
                })
              )
            }

            resetTimer = setTimeout(() => {
              if (cancelled || hovering.current) return
              idleAnimations.current.push(
                animate(eyeX, 0, { duration: 0.55, ease: "easeInOut" }),
                animate(eyeY, 0, { duration: 0.55, ease: "easeInOut" })
              )
            }, 900)
          }

          scheduleGlance()
        },
        3400 + Math.random() * 3600
      )
    }

    scheduleGlance()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (resetTimer) clearTimeout(resetTimer)
      for (const controls of idleAnimations.current) controls.stop()
      idleAnimations.current = []
      eyeBlink.set(1)
    }
  }, [eyeBlink, eyeX, eyeY, reduceMotion, stopIdleAnimations])

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!canTrack) return

    hovering.current = true
    stopIdleAnimations()

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
    hovering.current = false
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
