"use client"

import { useState, useCallback, useRef } from "react"
import { MainLayout } from "@/components/main-layout"
import { LivingCanvas } from "@/components/living-canvas"
import { SessionHeader } from "@/components/session-header"
import { MemoryCard } from "@/components/memory-card"
import { ContributionInput } from "@/components/contribution-input"
import { useSession } from "@/hooks/use-session"

export default function HomePage() {
  const { session, contribute } = useSession()
  const [showInput, setShowInput] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      canvasRef.current?.scrollTo({
        top: canvasRef.current.scrollHeight,
        behavior: "smooth",
      })
    }, 50)
  }, [])

  const handleActivate = useCallback(() => {
    if (!showInput) setShowInput(true)
  }, [showInput])

  const handleContribute = useCallback(
    async (content: string) => {
      setShowInput(false)
      setIsProcessing(true)
      scrollToBottom()

      try {
        await contribute(content)
      } catch (err) {
        console.error("Contribution failed:", err)
      }

      setIsProcessing(false)
      scrollToBottom()
    },
    [contribute, scrollToBottom],
  )

  const handleCancel = useCallback(() => {
    setShowInput(false)
  }, [])

  const items = session?.items ?? []

  return (
    <MainLayout>
      <LivingCanvas ref={canvasRef} onActivate={handleActivate}>
        {session ? (
          <SessionHeader
            title={session.title}
            date={session.date}
          />
        ) : (
          <div className="animate-fade-in-up">
            <p className="text-xl font-medium tracking-tight sm:text-2xl">
              Today&apos;s Session
            </p>
          </div>
        )}

        {items.length === 0 && !showInput && (
          <div
            className="mt-24 cursor-pointer text-center animate-fade-in"
            onClick={handleActivate}
          >
            <p className="text-sm text-muted-foreground/30 transition-colors hover:text-muted-foreground/50">
              Tap to contribute
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-4">
          {items.map((item) => (
            <MemoryCard key={item.id} item={item} />
          ))}
        </div>

        {isProcessing && (
          <div className="mt-4 flex animate-fade-in items-center gap-2 text-[11px] text-muted-foreground/25">
            <span className="h-1 w-1 animate-pulse rounded-full bg-primary/40" />
            Processing
          </div>
        )}
      </LivingCanvas>

      {showInput && (
        <ContributionInput onSubmit={handleContribute} onCancel={handleCancel} />
      )}
    </MainLayout>
  )
}
