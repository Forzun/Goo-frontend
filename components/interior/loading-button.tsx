"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

const CELL = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.45,
} as const
const CROSSFADE = {
  type: "spring",
  stiffness: 260,
  damping: 34,
  mass: 0.8,
} as const
const INSTANT = { duration: 0 } as const

export type AsyncActionStatus = "idle" | "pending" | "success" | "error"

export type UseAsyncActionOptions = {
  action: () => unknown
  resetAfter?: number
  onError?: (error: unknown) => void
}

export function useAsyncAction({
  action,
  resetAfter = 1400,
  onError,
}: UseAsyncActionOptions) {
  const [status, setStatus] = useState<AsyncActionStatus>("idle")

  const phase = useRef<AsyncActionStatus>("idle")
  const runId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alive = useRef(true)

  const act = useRef(action)
  const fail = useRef(onError)

  useEffect(() => {
    act.current = action
    fail.current = onError
  })

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const reset = useCallback(() => {
    runId.current += 1
    clear()
    phase.current = "idle"
    setStatus("idle")
  }, [clear])

  const run = useCallback(() => {
    if (phase.current === "pending") return

    clear()
    const id = ++runId.current
    phase.current = "pending"
    setStatus("pending")

    const settle = (next: "success" | "error") => {
      if (!alive.current || id !== runId.current) return
      clear()
      phase.current = next
      setStatus(next)
      timer.current = setTimeout(() => {
        if (!alive.current || id !== runId.current) return
        phase.current = "idle"
        setStatus("idle")
      }, resetAfter)
    }

    Promise.resolve()
      .then(() => act.current())
      .then(
        () => settle("success"),
        (error: unknown) => {
          fail.current?.(error)
          settle("error")
        }
      )
  }, [clear, resetAfter])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clear()
    }
  }, [clear])

  return {
    status,
    run,
    reset,
    pending: status === "pending",
  }
}

function Spinner({ still }: { still: boolean }) {
  return (
    <motion.svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
      animate={still ? undefined : { rotate: 360 }}
      transition={
        still ? undefined : { duration: 0.85, repeat: Infinity, ease: "linear" }
      }
    >
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.22"
      />
      <path
        d="M10.5 6A4.5 4.5 0 0 0 6 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </motion.svg>
  )
}

function CheckMark() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M2.6 6.3 4.9 8.6 9.4 3.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AlertMark() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M6 2.9v3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6 9.05h.01"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export type LoadingButtonTone = "neutral" | "primary" | "destructive"

const TONE_CLASS: Record<LoadingButtonTone, string> = {
  neutral:
    "bg-white text-neutral-700 shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] hover:brightness-[0.98] dark:bg-[#282828] dark:text-neutral-200 dark:shadow-[0_0_0_1px_#333333,0_1px_2px_rgba(0,0,0,0.25)] dark:hover:brightness-110",
  primary:
    "bg-btn-bg text-text-primary shadow-[0_0_0_1px_var(--btn-border),0_1px_2px_rgba(0,0,0,0.25)] hover:brightness-125",
  destructive:
    "bg-[#dc2626] text-white shadow-[0_0_0_1px_#b91c1c,0_1px_2px_rgba(185,28,28,0.16)] hover:brightness-[1.06]",
}

const TONE_TEXT: Record<LoadingButtonTone, { idle: string; pending: string }> =
  {
    neutral: {
      idle: "text-neutral-700 dark:text-neutral-200",
      pending: "text-neutral-500 dark:text-neutral-400",
    },
    primary: {
      idle: "text-text-primary",
      pending: "text-text-muted",
    },
    destructive: {
      idle: "text-white",
      pending: "text-white/70",
    },
  }

export type LoadingButtonColors = {
  idle?: string
  pending?: string
  success?: string
  error?: string
}

export type LoadingButtonProps = {
  onAction: () => unknown
  children: string
  pendingLabel?: string
  successLabel?: string
  errorLabel?: string
  resetAfter?: number
  disabled?: boolean
  onError?: (error: unknown) => void
  tone?: LoadingButtonTone
  colors?: LoadingButtonColors
  className?: string
}

export function LoadingButton({
  onAction,
  children,
  pendingLabel = children,
  successLabel = "Done",
  errorLabel = "Try again",
  resetAfter = 1400,
  disabled = false,
  onError,
  tone = "neutral",
  colors,
  className = "",
}: LoadingButtonProps) {
  const reduced = useReducedMotion()

  const { status, run, pending } = useAsyncAction({
    action: onAction,
    resetAfter,
    onError,
  })

  const fade = reduced ? INSTANT : CROSSFADE

  const label =
    status === "pending"
      ? pendingLabel
      : status === "success"
        ? successLabel
        : status === "error"
          ? errorLabel
          : children

  const toneText = TONE_TEXT[tone]
  const stateText = {
    idle: colors?.idle ?? toneText.idle,
    pending: colors?.pending ?? toneText.pending,
    success: colors?.success ?? "text-emerald-600 dark:text-emerald-400",
    error: colors?.error ?? "text-red-600 dark:text-red-400",
  }

  const faces = [
    {
      key: "idle",
      text: children,
      tone: stateText.idle,
      icon: null,
    },
    {
      key: "pending",
      text: pendingLabel,
      tone: stateText.pending,
      icon: <Spinner still={reduced === true || status !== "pending"} />,
    },
    {
      key: "success",
      text: successLabel,
      tone: stateText.success,
      icon: <CheckMark />,
    },
    {
      key: "error",
      text: errorLabel,
      tone: stateText.error,
      icon: <AlertMark />,
    },
  ]

  return (
    <>
      <motion.button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-busy={pending || undefined}
        aria-disabled={pending || undefined}
        whileTap={disabled || pending || reduced ? undefined : { y: 1 }}
        transition={CELL}
        onClick={(event) => {
          if (pending) {
            event.preventDefault()
            return
          }
          run()
        }}
        className={`relative inline-flex h-9 items-center justify-center rounded-[9px] px-3.5 text-[13px] font-medium transition-[filter] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4568FF] focus-visible:outline-solid disabled:opacity-50 ${TONE_CLASS[tone]} ${className}`}
        style={{ borderRadius: 9, touchAction: "manipulation" }}
      >
        <span aria-hidden className="relative grid place-items-center">
          {faces.map((face) => (
            <motion.span
              key={face.key}
              initial={false}
              animate={
                face.key === status
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, y: 3, filter: "blur(3px)" }
              }
              transition={fade}
              className={`col-start-1 row-start-1 flex items-center justify-center gap-1.5 whitespace-nowrap ${face.tone}`}
            >
              {face.icon}
              {face.text}
            </motion.span>
          ))}
        </span>
      </motion.button>

      <span role="status" aria-live="polite" className="sr-only">
        {status === "success"
          ? successLabel
          : status === "error"
            ? errorLabel
            : ""}
      </span>
    </>
  )
}
