"use client"

import {
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react"
import { ActivityCalendar } from "react-activity-calendar"

import { cn } from "@/lib/utils"

export type DailyActivity = {
  date: string // YYYY-MM-DD
  count: number
  level: number // 0–4
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function activityRange(now: Date = new Date()): {
  start: string
  end: string
} {
  return {
    start: toDateKey(new Date(now.getFullYear(), 0, 1)),
    end: toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function activityTooltip(activity: { date: string; count: number }) {
  const date = new Date(`${activity.date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )

  return `${date} · ${activity.count} total ${
    activity.count === 1 ? "message" : "messages"
  } with AI`
}

function renderActivityBlock(block: ReactElement, activity: DailyActivity) {
  return cloneElement(block as ReactElement<Record<string, unknown>>, {
    "data-activity-date": activity.date,
    "data-activity-count": activity.count,
    "aria-label": activityTooltip(activity),
  })
}

/**
 * Generates realistic mock contribution data across an entire year
 */
export function generateMockActivity(
  year: number = new Date().getFullYear()
): DailyActivity[] {
  const result: DailyActivity[] = []
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const rand = Math.random()

    let count = 0
    let level = 0
    // Give weekdays higher activity chance than weekends
    if (rand > (isWeekend ? 0.7 : 0.45)) {
      count = Math.floor(Math.random() * (isWeekend ? 8 : 22)) + 1
      level = count > 15 ? 4 : count > 10 ? 3 : count > 4 ? 2 : 1
    }

    result.push({
      date: dateStr,
      count,
      level,
    })
  }

  return result
}

export function DailyActivityGraph({
  data,
  className,
  padToYear = true,
}: {
  data: DailyActivity[]
  className?: string
  padToYear?: boolean
}) {
  const normalizedData = useMemo(() => {
    if (!data || data.length === 0) return []
    if (!padToYear) return data

    // Show the current year from January through the current month.
    const { start: startDate, end: endDate } = activityRange()

    const map = new Map<string, DailyActivity>()
    // Anchor the range boundaries so react-activity-calendar renders every
    // week and month label between them.
    map.set(startDate, { date: startDate, count: 0, level: 0 })
    map.set(endDate, { date: endDate, count: 0, level: 0 })

    for (const item of data) {
      if (item.date < startDate || item.date > endDate) continue
      map.set(item.date, item)
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [data, padToYear])

  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [tooltip, setTooltip] = useState<{
    date: string
    count: number
    left: number
    top: number
  } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const { blockSize, blockMargin, fontSize } = useMemo(() => {
    const margin = 3
    if (!normalizedData.length || !containerWidth) {
      return { blockSize: 10, blockMargin: margin, fontSize: 11 }
    }

    const start = new Date(`${normalizedData[0].date}T00:00:00`)
    const end = new Date(
      `${normalizedData[normalizedData.length - 1].date}T00:00:00`
    )
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
    const firstWeekday = start.getDay()
    const weeks = Math.ceil((days + firstWeekday) / 7)
    const size = Math.floor((containerWidth - margin * (weeks - 1)) / weeks)

    return {
      blockSize: Math.max(4, size),
      blockMargin: margin,
      fontSize: Math.max(8, size),
    }
  }, [normalizedData, containerWidth])

  function handlePointerOver(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target
    if (!(target instanceof Element)) return

    const block = target.closest<Element>("[data-activity-date]")
    const date = block?.getAttribute("data-activity-date")

    if (!block || !date) {
      setTooltip(null)
      return
    }

    const section = sectionRef.current
    if (!section) return

    const count = Number(block.getAttribute("data-activity-count") ?? 0)
    const blockRect = block.getBoundingClientRect()
    const sectionRect = section.getBoundingClientRect()

    setTooltip({
      date,
      count: Number.isFinite(count) ? count : 0,
      left: blockRect.left - sectionRect.left + blockRect.width / 2,
      top: blockRect.top - sectionRect.top,
    })
  }

  if (!normalizedData || normalizedData.length === 0) return null

  return (
    <section
      ref={sectionRef}
      onPointerOver={handlePointerOver}
      onPointerLeave={() => setTooltip(null)}
      className={cn("relative rounded-xl bg-[#121212] p-5", className)}
    >
      {/* <h3 className="text-sm font-medium text-neutral-200">Daily activity</h3>

      <p className="mt-1 mb-4 text-xs text-neutral-500">
        The more you chat or assign tasks, the closer you grow.
      </p> */}

      <div ref={containerRef} className="w-full overflow-hidden">
        <ActivityCalendar
          data={normalizedData}
          colorScheme="dark"
          theme={{
            dark: [
              "#272727", // No activity
              "#663000", // Low
              "#994300", // Medium
              "#CC5700", // High
              "#FF6D00", // Highest — your main color
            ],
          }}
          blockSize={blockSize}
          blockMargin={blockMargin}
          blockRadius={20}
          fontSize={fontSize}
          showColorLegend={false}
          showTotalCount={false}
          renderBlock={renderActivityBlock}
        />
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded bg-neutral-100 px-2 py-1 text-[13px] font-medium whitespace-nowrap text-neutral-900 shadow-lg"
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          {activityTooltip(tooltip)}
          <span className="absolute top-full left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-neutral-100" />
        </div>
      ) : null}
    </section>
  )
}
