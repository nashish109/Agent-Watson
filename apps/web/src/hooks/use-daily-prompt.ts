"use client"

import { useState, useEffect, useRef } from "react"
import * as api from "@/lib/api/api"

const DISMISSED_KEY = "watson_daily_dismissed"
const LS_DATE_KEY = "watson_daily_dismissed_date"

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Checks localStorage for a dismissal within the current calendar day.
 * Fast path — avoids an API call if the user already dismissed today.
 */
function wasDismissedToday(): boolean {
  if (typeof window === "undefined") return false
  const dismissed = localStorage.getItem(DISMISSED_KEY)
  const date = localStorage.getItem(LS_DATE_KEY)
  if (dismissed !== "true") return false
  return date === getToday()
}

function markDismissedToday(): void {
  localStorage.setItem(DISMISSED_KEY, "true")
  localStorage.setItem(LS_DATE_KEY, getToday())
}

function clearDismissed(): void {
  localStorage.removeItem(DISMISSED_KEY)
  localStorage.removeItem(LS_DATE_KEY)
}

/**
 * useDailyContributionPrompt
 *
 * Flow:
 * 1. On mount, check localStorage for today's dismissal (fast path).
 * 2. If not dismissed locally, call GET /api/user/check-today to see if the
 *    user has already contributed today (persisted check).
 * 3. If neither dismissed nor contributed, show the prompt modal.
 * 4. When dismissed → persist to localStorage so it stays hidden all day.
 * 5. When a contribution is submitted → mark as completed (no further action
 *    needed since the DB already has the entry).
 * 6. On a new calendar day, localStorage dates won't match, so the prompt
 *    resets naturally.
 */
export function useDailyContributionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading] = useState(true)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    // Fast path: already dismissed today in this browser
    if (wasDismissedToday()) {
      setLoading(false)
      return
    }

    // Persistent check: query the DB for today's contributions
    api.checkToday().then((res) => {
      if (!res.contributed) {
        setShowPrompt(true)
      }
    }).catch(() => {
      // If the check fails (server down, etc.), don't bother the user
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  const dismiss = () => {
    markDismissedToday()
    setShowPrompt(false)
  }

  const onSubmitted = () => {
    setShowPrompt(false)
    clearDismissed()
  }

  return { showPrompt, loading, dismiss, onSubmitted }
}
