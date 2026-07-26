import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST() {
  try {
    const cwd = process.cwd();
    const npmBin = "npm";

    return new Promise<Response>((resolve) => {
      const child = spawn(npmBin, ["run", "seed"], {
        cwd,
        stdio: "pipe",
      });

      let output = "";
      child.stdout?.on("data", (d) => (output += d.toString()));
      child.stderr?.on("data", (d) => (output += d.toString()));

      child.on("error", (err) => {
        console.error("[Demo Reset] Process error:", err.message);
        resolve(
          NextResponse.json(
            { reset: false, error: err.message },
            { status: 500 }
          )
        );
      });

      child.on("exit", (code) => {
        if (code === 0) {
          console.log("[Demo Reset] Database reseeded successfully");
          resolve(NextResponse.json({ reset: true }));
        } else {
          console.error("[Demo Reset] Seed failed:", output.slice(-500));
          resolve(
            NextResponse.json(
              { reset: false, error: "Seed process failed" },
              { status: 500 }
            )
          );
        }
      });

      // Timeout after 30s
      setTimeout(() => {
        child.kill();
        resolve(
          NextResponse.json(
            { reset: false, error: "Seed timed out" },
            { status: 504 }
          )
        );
      }, 30_000);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reset";
    console.error("[Demo Reset] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
