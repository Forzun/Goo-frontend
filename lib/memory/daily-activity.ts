import type { FileSystemService } from "@/lib/filesystem/fs-service"
import { countDailyActivity } from "@/lib/memory/markdown"

export type DailyActivityPoint = {
  date: string
  count: number
  level: number
}

export async function readDailyActivity(
  fs: FileSystemService
): Promise<DailyActivityPoint[]> {
  if (!(await fs.exists("daily"))) return []

  const files = (await fs.listFiles("daily"))
    .map((file) => file.name)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))

  const activity = await Promise.all(
    files.map(async (file) => {
      const markdown = await fs.readFile(`daily/${file}`)
      const count = countDailyActivity(markdown)
      return {
        date: file.replace(/\.md$/, ""),
        count,
        level:
          count === 0
            ? 0
            : count <= 3
              ? 1
              : count <= 8
                ? 2
                : count <= 15
                  ? 3
                  : 4,
      }
    })
  )

  return activity.sort((a, b) => a.date.localeCompare(b.date))
}
