import { NextResponse } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import path from "path";

let demoProcess: ChildProcess | null = null;

export async function POST() {
  try {
    // Prevent double-spawn
    if (demoProcess && demoProcess.exitCode === null) {
      return NextResponse.json(
        { started: false, message: "Demo simulation already running" },
        { status: 409 }
      );
    }

    const cwd = process.cwd();
    const tsxBin = path.join(cwd, "node_modules/.bin/tsx");
    const scriptPath = path.join(cwd, "scripts/simulate.ts");

    demoProcess = spawn(tsxBin, [scriptPath], {
      cwd,
      stdio: "ignore",
      detached: false,
    });

    demoProcess.on("error", (err) => {
      console.error("[Demo] Process error:", err.message);
      demoProcess = null;
    });

    demoProcess.on("exit", () => {
      demoProcess = null;
    });

    console.log(`[Demo] Simulation started (PID: ${demoProcess.pid})`);
    return NextResponse.json({ started: true, pid: demoProcess.pid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start demo";
    console.error("[Demo] Start error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
