export interface Memory {
  id: string
  type: "contribution" | "memory-created" | "reflection"
  content: string
  createdAt: Date
  sessionId: string
  topic?: string
  memoryLabel?: string
}

export interface Session {
  id: string
  date: Date
  title: string
  memories: Memory[]
}

export const MEMORY_LABELS = [
  "Remembered",
  "Learning captured",
  "Reflection recorded",
  "Memory stored",
]

export function getMemoryLabel(): string {
  return MEMORY_LABELS[Math.floor(Math.random() * MEMORY_LABELS.length)]
}

export const REFLECTION_TEMPLATES = [
  "I'll remember this as part of today's session.",
  "This feels worth carrying forward.",
  "I'll keep this in mind as we continue.",
  "This may become an important part of your story.",
]

export function getReflection(): string {
  return REFLECTION_TEMPLATES[
    Math.floor(Math.random() * REFLECTION_TEMPLATES.length)
  ]
}

const TOPIC_KEYWORDS: [string, string][] = [
  ["kafka", "Kafka"],
  ["partition", "Partitions"],
  ["dp", "Dynamic Programming"],
  ["dynamic", "Dynamic Programming"],
  ["algorithm", "Algorithms"],
  ["system design", "System Design"],
  ["distributed", "Distributed Systems"],
  ["database", "Database Concepts"],
  ["indexing", "Database Indexing"],
  ["api", "API Design"],
  ["microservice", "Microservices"],
  ["docker", "Docker"],
  ["kubernetes", "Kubernetes"],
  ["react", "React"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["rust", "Rust"],
  ["machine learning", "Machine Learning"],
  ["neural", "Neural Networks"],
  ["probability", "Probability"],
  ["statistics", "Statistics"],
  ["cat", "CAT Preparation"],
  ["geometry", "Geometry"],
  ["reasoning", "Logical Reasoning"],
  ["backprop", "Backpropagation"],
  ["gradient", "Gradient Descent"],
  ["transformer", "Transformers"],
  ["architecture", "Software Architecture"],
  ["testing", "Testing"],
  ["deployment", "Deployment"],
  ["monitoring", "Monitoring"],
  ["career", "Career Growth"],
]

export function extractTopic(content: string): string {
  const lower = content.toLowerCase()
  for (const [keyword, topic] of TOPIC_KEYWORDS) {
    if (lower.includes(keyword)) return topic
  }
  const words = content.split(/\s+/).filter((w) => w.length > 3)
  const lastFew = words.slice(-3).join(" ")
  return lastFew || "Something New"
}

export function createNewSession(id?: string): Session {
  const now = new Date()
  return {
    id: id ?? now.getTime().toString(),
    date: now,
    title: `Today's Session — ${now.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}`,
    memories: [],
  }
}
