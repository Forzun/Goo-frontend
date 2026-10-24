"use client"

import { useMemo } from "react"

import { activityRange, DailyActivityGraph, type DailyActivity } from "./graph"

export function generateEmptyActivity(): DailyActivity[] {
  const { start, end } = activityRange()
  const activity: DailyActivity[] = []
  const date = new Date(`${start}T00:00:00`)
  const lastDay = new Date(`${end}T00:00:00`)

  while (date <= lastDay) {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    activity.push({
      date: `${date.getFullYear()}-${month}-${day}`,
      count: 0,
      level: 0,
    })
    date.setDate(date.getDate() + 1)
  }

  return activity
}

export function ActivityGraph({
  data,
  className,
}: {
  data?: DailyActivity[]
  className?: string
}) {
  const activity = useMemo(
    () => (data?.length ? data : generateEmptyActivity()),
    [data]
  )

  return <DailyActivityGraph data={activity} className={className} />
}
