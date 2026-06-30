"use client"

import { useState, useCallback, useRef } from "react"
import { MainLayout } from "@/components/main-layout"
import { LivingCanvas } from "@/components/living-canvas"
import { SessionHeader } from "@/components/session-header"
import { MemoryCard } from "@/components/memory-card"
import { ContributionInput } from "@/components/contribution-input"
import { useSession } from "@/hooks/use-session"

export default function HomePage() {
  const { session, contribute, createMemory, reflect } = useSession()
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
    (content: string) => {
      contribute(content)
      setShowInput(false)
      setIsProcessing(true)
      scrollToBottom()

      setTimeout(() => {
        createMemory(content)
        scrollToBottom()
      }, 800)

      setTimeout(() => {
        reflect()
        setIsProcessing(false)
        scrollToBottom()
      }, 1800 + Math.random() * 600)
    },
    [contribute, createMemory, reflect, scrollToBottom],
  )

  const handleCancel = useCallback(() => {
    setShowInput(false)
  }, [])

  return (
    <MainLayout>
      <LivingCanvas ref={canvasRef} onActivate={handleActivate}>
        <SessionHeader session={session} />

        {session.memories.length === 0 && !showInput && (
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
          {session.memories.map((memory) => {
            if (memory.type === "memory-created") {
              return (
                <div
                  key={memory.id}
                  className="animate-fade-in pl-1"
                >
                  <p className="text-[11px] font-medium text-primary/60">
                    Learning: {memory.topic}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/20">
                    Memory recorded
                  </p>
                </div>
              )
            }
            return <MemoryCard key={memory.id} memory={memory} />
          })}
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
