import { getAIProvider } from "../ai/index.js"
import { upsertUserProfile } from "../db/db-service.js"

interface UserProfile {
  userId: string
  name: string
  details: Record<string, any>
}

const profiles = new Map<string, UserProfile>()

export function getProfile(userId: string): UserProfile | null {
  return profiles.get(userId) ?? null
}

export function hydrateProfiles(data: Array<{ userId: string; name: string | null; details: any }>): void {
  for (const p of data) {
    profiles.set(p.userId, {
      userId: p.userId,
      name: p.name ?? "",
      details: p.details ?? {},
    })
  }
}

export function formatProfileForContext(profile: UserProfile | null): string {
  if (!profile || (!profile.name && Object.keys(profile.details).length === 0)) {
    return ""
  }
  const parts: string[] = []
  if (profile.name) parts.push(`Name: ${profile.name}`)
  const detailKeys = Object.keys(profile.details)
  for (const key of detailKeys) {
    const val = profile.details[key]
    if (val) parts.push(`${key}: ${val}`)
  }
  if (parts.length === 0) return ""
  return `You know the following about the user:\n${parts.join("\n")}\n\nReference this naturally in your response. Do NOT use this information if it's empty or unset.`
}

const NAME_PATTERNS = [
  /my name is (\w+)/i,
  /call me (\w+)/i,
  /i['‘’]m (\w+)/i,
  /i am (\w+)/i,
  /this is (\w+)/i,
  /name['‘’]s (\w+)/i,
]

export function detectNameFromMessage(message: string): string | null {
  for (const pattern of NAME_PATTERNS) {
    const match = message.match(pattern)
    if (match && match[1].length > 1) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
      return name
    }
  }
  return null
}

export async function extractProfileInfo(
  message: string,
  reply: string,
): Promise<{ name: string | null; details: Record<string, any> }> {
  try {
    const provider = getAIProvider()

    const response = await provider.chat([
      {
        role: "system",
        content: `Extract personal information about the user from this conversation exchange.
Return a JSON object with exactly these fields:
{
  "name": "the user's name if mentioned, otherwise null",
  "details": { "key": "value" } — any other personal details shared (occupation, interests, location, etc.)
}

Rules:
- Only extract information the user explicitly shares about themselves
- Set name to null if the user did not say their name
- Details should be key-value pairs describing the user (e.g., "occupation": "software engineer")
- If nothing personal was shared, return empty details object
- Be conservative — don't infer or guess`,
      },
      {
        role: "user",
        content: `User said: "${message}"\nWatson replied: "${reply}"`,
      },
    ])

    const cleaned = response.content
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(cleaned)
    return {
      name: parsed.name ?? null,
      details: parsed.details ?? {},
    }
  } catch {
    return { name: null, details: {} }
  }
}

export async function updateProfile(
  userId: string,
  info: { name: string | null; details: Record<string, any> },
): Promise<void> {
  const existing = profiles.get(userId) ?? { userId, name: "", details: {} }
  let changed = false

  if (info.name && info.name !== existing.name) {
    existing.name = info.name
    changed = true
  }

  for (const [key, val] of Object.entries(info.details)) {
    if (val && existing.details[key] !== val) {
      existing.details[key] = val
      changed = true
    }
  }

  if (changed) {
    profiles.set(userId, existing)
    upsertUserProfile({
      userId,
      name: existing.name || undefined,
      details: existing.details,
    }).catch(() => {})
  }
}
