"use client"

import { useMemo } from "react"
import { ActivityCalendar } from "react-activity-calendar"

import { cn } from "@/lib/utils"

export type DailyActivity = {
  date: string // YYYY-MM-DD
  count: number
  level: number // 0–4
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

    // Determine the target year from the first date entry or fallback to current year
    const year = data[0]?.date
      ? new Date(data[0].date).getFullYear()
      : new Date().getFullYear()
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const map = new Map<string, DailyActivity>()
    // Ensure Jan 1 and Dec 31 anchor boundaries exist so react-activity-calendar
    // renders the full 52-week calendar grid and all month labels
    map.set(startDate, { date: startDate, count: 0, level: 0 })
    map.set(endDate, { date: endDate, count: 0, level: 0 })

    for (const item of data) {
      map.set(item.date, item)
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [data, padToYear])

  if (!normalizedData || normalizedData.length === 0) return null

  return (
    <section className={cn("rounded-xl bg-[#121212] p-5", className)}>
      {/* <h3 className="text-sm font-medium text-neutral-200">Daily activity</h3>

      <p className="mt-1 mb-4 text-xs text-neutral-500">
        The more you chat or assign tasks, the closer you grow.
      </p> */}

      <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
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
          blockSize={10}
          blockMargin={3}
          blockRadius={2}
          fontSize={11}
          showColorLegend={false}
          showTotalCount={false}
        />
      </div>
    </section>
  )
}
