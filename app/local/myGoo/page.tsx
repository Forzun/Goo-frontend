"use client"

import { useEffect, useMemo, useState } from "react"

import { ActivityGraph } from "@/components/local/agents/activity-graph"
import type { DailyActivity } from "@/components/local/agents/graph"
import { GooFaceIcon } from "@/components/local/agents/goo-face-icon"
import { workspaceFs } from "@/lib/filesystem/workspace-fs"
import { readDailyActivity } from "@/lib/memory/daily-activity"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const buttonClass =
  "rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 transition-colors hover:bg-white"

const ACTIVITY_CACHE_KEY = "localgoo:daily-activity"
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function readCachedActivity(): DailyActivity[] | null {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_CACHE_KEY)

    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null

    return parsed.filter(
      (day): day is DailyActivity =>
        typeof day === "object" &&
        day !== null &&
        typeof day.date === "string" &&
        DATE_KEY_PATTERN.test(day.date) &&
        typeof day.count === "number" &&
        Number.isFinite(day.count) &&
        typeof day.level === "number" &&
        day.level >= 0 &&
        day.level <= 4
    )
  } catch {
    return null
  }
}

function cacheActivity(activity: DailyActivity[]) {
  try {
    window.localStorage.setItem(ACTIVITY_CACHE_KEY, JSON.stringify(activity))
  } catch {
    // Caching is best-effort only.
  }
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function GrowthFace() {
  const columns = 13
  const rows = 10
  const dots: React.ReactNode[] = []

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const dx = column - (columns - 1) / 2
      const dy = row - (rows - 1) / 2
      const distance = Math.sqrt(dx * dx + dy * dy)
      const isEye =
        (column === 3 || column === 4 || column === 8 || column === 9) &&
        row >= 2 &&
        row <= 5

      dots.push(
        <span
          key={`${column}-${row}`}
          className="size-2 rounded-full"
          style={{
            backgroundColor: isEye ? "#ffffff" : "#1e90ff",
            opacity: isEye ? 1 : Math.max(0.14, 1 - distance / 6.5),
          }}
        />
      )
    }
  }

  return (
    <div className="relative flex items-center justify-center py-4">
      <div className="absolute size-44 rounded-full bg-[#1e90ff]/20 blur-3xl" />
      <div
        className="relative grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {dots}
      </div>
    </div>
  )
}

export default function MyGooPage() {
  const [activity, setActivity] = useState<DailyActivity[]>([])
  const [tab, setTab] = useState<"closeness" | "growth">("closeness")

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return
      const cached = readCachedActivity()
      if (cached?.length) setActivity(cached)
    })

    const restore = workspaceFs.hasWorkspace()
      ? Promise.resolve(true)
      : workspaceFs.restoreWorkspace().then((handle) => Boolean(handle))

    restore
      .then((hasWorkspace) => {
        if (!hasWorkspace) return null
        return readDailyActivity(workspaceFs)
      })
      .then((data) => {
        if (cancelled || !data || data.length === 0) return
        setActivity(data)
        cacheActivity(data)
      })
      .catch(() => {
        // Keep showing the cached activity when the daily notes can't be read.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const totalChats = activity.reduce((sum, day) => sum + day.count, 0)

    const countsByDate = new Map(activity.map((day) => [day.date, day.count]))
    const today = new Date()
    const cursor = new Date(today)
    cursor.setHours(0, 0, 0, 0)

    let streak = 0
    while ((countsByDate.get(dateKey(cursor)) ?? 0) > 0) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    const firstDay = activity[0]?.date
    const daysTogether = firstDay
      ? Math.max(
          1,
          Math.round(
            (today.getTime() - new Date(`${firstDay}T00:00:00`).getTime()) /
              86_400_000
          ) + 1
        )
      : 0

    return { totalChats, streak, daysTogether }
  }, [activity])

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <GooFaceIcon className="size-8 text-[#1e90ff]" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">MyGoo</h1>
          </div>
          <Button type="button" className={cn(buttonClass, "mt-3")}>
            Enable self-growth
          </Button>
        </div>

        <p className="mt-2 text-sm text-neutral-400">
          Goo has been with you for {stats.daysTogether} days across{" "}
          {stats.totalChats} chats, and we&apos;ve chatted {stats.streak} days
          in a row
        </p>

        <div className="mt-5 flex items-center gap-2">
          {(["Closeness", "Growth"] as const).map((label) => {
            const value = label.toLowerCase() as "closeness" | "growth"
            return (
              <button
                key={label}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === value
                    ? "bg-neutral-100 text-neutral-900"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-xs text-neutral-400">
          The more you chat or assign tasks, the closer you grow
        </p>

        <ActivityGraph data={activity} className="mt-3" />

        <div className="mt-10 grid items-center gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-base font-medium">
              MyGoo can now learn and grow on its own
            </h2>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-neutral-400">
              Once enabled, Goo keeps learning your preferences, habits, and
              ways of working, making every collaboration the start of the next
              one.
            </p>
            <button type="button" className={cn(buttonClass, "mt-5")}>
              Enable self-growth
            </button>
          </div>

          <GrowthFace />
        </div>
      </div>
    </main>
  )
}
