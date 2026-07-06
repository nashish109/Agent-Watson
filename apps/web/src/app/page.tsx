"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Sparkles, ArrowLeft } from "lucide-react"
import { MainLayout } from "@/components/main-layout"
import { GrowthPage } from "@/components/growth-page"
import { InsightsPage } from "@/components/insights-page"
import { GraphPage } from "@/components/graph-page"
import { DailyJourney } from "@/components/daily-journey"
import { WorkspaceLanding } from "@/components/workspace-landing"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { useSession } from "@/hooks/use-session"
import { useWorkspace } from "@/hooks/use-workspace"

type View = "landing" | "session" | "growth" | "insights" | "graph"

type DailyMode = "morning" | "focus" | "evening"

export default function HomePage() {
  const { workspaces, currentWorkspaceId, currentWorkspace, selectWorkspace } = useWorkspace()
  const { session, contribute, clearSession, loadSession, startNewSession } = useSession(currentWorkspaceId ?? undefined)
  const [isProcessing, setIsProcessing] = useState(false)
  const [view, setView] = useState<View>("landing")
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const justOnboarded = useRef(false)
  const savedModeRef = useRef<DailyMode | null>(null)

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const navigate = useCallback((to: View) => {
    setView(to)
  }, [])

  const handleContribute = useCallback(
    async (content: string) => {
      setIsProcessing(true)
      setError(null)
      try {
        await contribute(content)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to save. Please try again."
        setError(msg)
      }
      setIsProcessing(false)
    },
    [contribute],
  )

  const handleCancel = useCallback(() => {}, [])

  const handleActivate = useCallback(() => {}, [])

  const handleStartSession = useCallback(async () => {
    await startNewSession()
    navigate("session")
  }, [startNewSession, navigate])

  const handleContinueSession = useCallback((sessionId: string) => {
    loadSession(sessionId)
    navigate("session")
  }, [loadSession, navigate])

  const handleBackToLanding = useCallback(() => {
    clearSession()
    navigate("landing")
  }, [clearSession, navigate])

  const handleModeChange = useCallback((mode: DailyMode) => {
    savedModeRef.current = mode
  }, [])

  const handleSession = useCallback(() => {
    navigate("session")
  }, [navigate])

  const handleGrowth = useCallback(() => {
    navigate("growth")
  }, [navigate])

  const handleInsights = useCallback(() => {
    navigate("insights")
  }, [navigate])

  const handleGraph = useCallback(() => {
    navigate("graph")
  }, [navigate])

  const handleBackFromGrowth = useCallback(() => {
    navigate("session")
  }, [navigate])

  const handleBackFromInsights = useCallback(() => {
    navigate("session")
  }, [navigate])

  const handleBackFromGraph = useCallback(() => {
    navigate("session")
  }, [navigate])

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone(true)
    justOnboarded.current = true
    navigate("session")
  }, [navigate])

  // When currentWorkspaceId first becomes available (workspaces loaded)
  // or changes via sidebar, reset to the landing view — but skip this
  // if we just completed onboarding (which already navigated to session).
  useEffect(() => {
    if (!currentWorkspaceId) return
    if (justOnboarded.current) {
      justOnboarded.current = false
      return
    }
    setView("landing")
    clearSession()
  }, [currentWorkspaceId, clearSession])

  return (
    <>
      {!onboardingDone && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
      {error && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up">
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400 shadow-lg backdrop-blur-sm" role="alert">
            {error}
          </div>
        </div>
      )}
      <MainLayout
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onSelectWorkspace={selectWorkspace}
        onSession={handleSession}
        onGrowth={handleGrowth}
        onInsights={handleInsights}
        onGraph={handleGraph}
      >
        <div className="relative h-full overflow-hidden">
          {/* Growth View */}
          <div
            className={`absolute inset-0 transition-all duration-300 ease-out ${
              view === "growth"
                ? "translate-x-0 opacity-100"
                : "translate-x-8 opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={handleBackFromGrowth}
              className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary/70 transition-colors hover:bg-accent hover:text-primary"
              aria-label="Back to today"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Today
            </button>
            <GrowthPage />
          </div>

          {/* Insights View */}
          <div
            className={`absolute inset-0 transition-all duration-300 ease-out ${
              view === "insights"
                ? "translate-x-0 opacity-100"
                : "translate-x-8 opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={handleBackFromInsights}
              className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary/70 transition-colors hover:bg-accent hover:text-primary"
              aria-label="Back to today"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Today
            </button>
            <InsightsPage />
          </div>

          {/* Graph View */}
          <div
            className={`absolute inset-0 transition-all duration-300 ease-out ${
              view === "graph"
                ? "translate-x-0 opacity-100"
                : "translate-x-8 opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={handleBackFromGraph}
              className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary/70 transition-colors hover:bg-accent hover:text-primary"
              aria-label="Back to today"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Today
            </button>
            <GraphPage />
          </div>

          {/* Landing View */}
          <div
            className={`absolute inset-0 transition-all duration-300 ease-out ${
              view === "landing"
                ? "translate-x-0 opacity-100"
                : view === "growth" || view === "insights" || view === "graph"
                  ? "-translate-x-8 opacity-0 pointer-events-none"
                  : "translate-x-0 opacity-0 pointer-events-none"
            }`}
          >
            {view === "landing" && currentWorkspace && (
              <WorkspaceLanding
                workspace={currentWorkspace}
                onStartSession={handleStartSession}
                onContinueSession={handleContinueSession}
              />
            )}
            {view === "landing" && !currentWorkspace && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground/40">Loading your workspaces...</p>
                </div>
              </div>
            )}
          </div>

          {/* Session View — always mounted to preserve scroll & mode */}
          <div
            className={`absolute inset-0 overflow-y-auto transition-all duration-300 ease-out ${
              view === "session"
                ? "translate-x-0 opacity-100"
                : "translate-x-0 opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={handleBackToLanding}
              className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground/50 transition-colors hover:bg-accent hover:text-muted-foreground/80"
              aria-label="Back to workspace overview"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Overview
            </button>
            <DailyJourney
              session={session}
              currentWorkspace={currentWorkspace}
              isProcessing={isProcessing}
              onContribute={handleContribute}
              onCancel={handleCancel}
              onActivate={handleActivate}
              onGrowth={handleGrowth}
              initialMode={savedModeRef.current ?? undefined}
              onModeChange={handleModeChange}
            />
          </div>
        </div>
      </MainLayout>
    </>
  )
}
