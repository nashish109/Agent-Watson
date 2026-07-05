/**
 * Next.js API route — bridges the frontend to the Python Memory Engine.
 *
 * Maintains a persistent Python bridge process for in-memory session state.
 * This is NOT an external API service — it is server-side logic within the
 * existing Next.js application.
 */

import { type NextRequest, NextResponse } from "next/server"
import { spawn, type ChildProcess } from "child_process"
import path from "path"
import { once } from "events"

// ---------------------------------------------------------------------------
// Persistent Python bridge process
// ---------------------------------------------------------------------------

let bridgeProcess: ChildProcess | null = null
let bridgeBuffer = ""
let pendingResolve: ((value: string) => void) | null = null

function getBridgePath(): string {
  // In development, resolve relative to the monorepo root.
  // In production, assume the package is installed alongside the app.
  return path.resolve(process.cwd(), "../../packages/memory/bridge.py")
}

function ensureBridge(): ChildProcess {
  if (bridgeProcess?.killed === false) return bridgeProcess

  const scriptPath = getBridgePath()
  bridgeBuffer = ""

  bridgeProcess = spawn("python", [scriptPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  })

  bridgeProcess.stdout?.on("data", (chunk: Buffer) => {
    bridgeBuffer += chunk.toString()
    // Resolve pending requests line by line
    while (bridgeBuffer.includes("\n")) {
      const nlIndex = bridgeBuffer.indexOf("\n")
      const line = bridgeBuffer.slice(0, nlIndex)
      bridgeBuffer = bridgeBuffer.slice(nlIndex + 1)
      if (line.trim() && pendingResolve) {
        const resolve = pendingResolve
        pendingResolve = null
        resolve(line.trim())
      }
    }
  })

  bridgeProcess.on("exit", () => {
    bridgeProcess = null
  })

  return bridgeProcess
}

async function sendCommand(command: object): Promise<object> {
  const proc = ensureBridge()
  const jsonLine = JSON.stringify(command) + "\n"

  return new Promise((resolve, reject) => {
    pendingResolve = (line: string) => {
      try {
        resolve(JSON.parse(line))
      } catch {
        reject(new Error(`Invalid JSON from bridge: ${line}`))
      }
    }

    proc.stdin?.write(jsonLine, (err) => {
      if (err) {
        pendingResolve = null
        reject(err)
      }
    })

    // Safety timeout (should never happen in normal operation)
    setTimeout(() => {
      if (pendingResolve) {
        pendingResolve = null
        reject(new Error("Bridge response timeout"))
      }
    }, 10_000)
  })
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await sendCommand(body)
    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
