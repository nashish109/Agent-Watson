import { type NextRequest, NextResponse } from "next/server"
import { spawn, type ChildProcess } from "child_process"
import path from "path"

let bridgeProcess: ChildProcess | null = null
let bridgeBuffer = ""
let pendingResolve: ((value: string) => void) | null = null

function getBridgePath(): string {
  return path.resolve(process.cwd(), "../../packages/memory/bridge.py")
}

function isVercel(): boolean {
  return !!(process.env.VERCEL ?? process.env.NEXT_PUBLIC_VERCEL_URL)
}

function ensureBridge(): ChildProcess | null {
  if (isVercel()) return null

  if (bridgeProcess?.killed === false) return bridgeProcess

  const scriptPath = getBridgePath()
  bridgeBuffer = ""

  try {
    bridgeProcess = spawn("python", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    })

    bridgeProcess.stdout?.on("data", (chunk: Buffer) => {
      bridgeBuffer += chunk.toString()
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
  } catch {
    bridgeProcess = null
    return null
  }
}

async function sendCommand(command: Record<string, unknown>): Promise<object> {
  const proc = ensureBridge()
  if (!proc) {
    return handleLocally(command)
  }

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

    setTimeout(() => {
      if (pendingResolve) {
        pendingResolve = null
        reject(new Error("Bridge response timeout"))
      }
    }, 10_000)
  })
}

function handleLocally(command: Record<string, unknown>): object {
  const cmd = command.cmd as string

  if (cmd === "health") {
    return { ok: true, status: "alive" }
  }

  if (cmd === "create_session") {
    return {
      ok: true,
      session: {
        id: crypto.randomUUID(),
        session_date: new Date().toISOString().slice(0, 10),
        started_at: new Date().toISOString(),
        ended_at: null,
        summary: null,
      },
    }
  }

  if (cmd === "contribute") {
    return {
      ok: true,
      reply: "Thanks for sharing. I've noted that.",
      intent: "Generic",
      intent_confidence: 0.5,
      contribution: {},
      memories: [],
      reflections: [],
      relationships: [],
      concepts: [],
      connections: [],
    }
  }

  if (cmd === "query") {
    return {
      ok: true,
      query: command.text ?? "",
      total_count: 0,
      items: [],
    }
  }

  if (cmd === "reflect") {
    return {
      ok: true,
      primary_focus: "Generic",
      topics_explored: [],
      progress: {},
      strongest_connections: [],
      reflection: "Submit more contributions to generate a reflection.",
    }
  }

  if (cmd === "get_session") {
    return {
      ok: true,
      session: {
        id: command.session_id ?? "",
        session_date: new Date().toISOString().slice(0, 10),
        started_at: new Date().toISOString(),
        ended_at: null,
        contributions: [],
        memories: [],
        reflections: [],
        summary: null,
      },
    }
  }

  return { ok: false, error: `Unknown command: ${cmd}` }
}

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
