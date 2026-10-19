"use client"

import { DailyActivityGraph, type DailyActivity } from "./graph"

export const defaultActivity: DailyActivity[] = [
  { date: "2026-10-01", count: 0, level: 0 },
  { date: "2026-10-02", count: 2, level: 1 },
  { date: "2026-10-03", count: 6, level: 2 },
  { date: "2026-10-04", count: 12, level: 3 },
  { date: "2026-10-05", count: 20, level: 4 },
]

export function ActivityGraph({
  data = defaultActivity,
  className,
}: {
  data?: DailyActivity[]
  className?: string
}) {
  return <DailyActivityGraph data={data} className={className} />
}
