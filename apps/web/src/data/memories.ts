export interface TimelineItem {
  id: string
  type: "contribution" | "response" | "memory" | "reflection" | "coach"
  content: string
  createdAt: Date
  displayLabel?: string
  memoryType?: string
  topic?: string
  relatedTo?: string[]
  concepts?: string[]
  connections?: string[]
}

export interface QueryItem {
  type: string
  id: string
  label: string
  summary: string
  score: number
  session_id: string
  session_date: string
  memory_type: string
  matched_terms: string[]
}

export interface Session {
  id: string
  title: string
  date: Date
  items: TimelineItem[]
  summary: string | null
}

export function buildSessionTitle(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today's Session"
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday's Session"
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}
