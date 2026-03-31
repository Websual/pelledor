import { auth } from "@/auth";
import { rateLimitMemory } from "@/core/security/rate-limit-memory";
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { join } from "path";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";

const STATUS_FILE = join(process.cwd(), ".rebuild-status.json");

type RebuildStatus = {
  status: "idle" | "running" | "success" | "error";
  startedAt?: string;
  finishedAt?: string;
  log?: string;
  error?: string;
};

async function getStatus(): Promise<RebuildStatus> {
  try {
    const raw = await readFile(STATUS_FILE, "utf8");
    return JSON.parse(raw) as RebuildStatus;
  } catch {
    return { status: "idle" };
  }
}

async function setStatus(s: RebuildStatus) {
  await writeFile(STATUS_FILE, JSON.stringify(s, null, 2));
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const status = await getStatus();
  return NextResponse.json(status);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  if (session.user.id) {
    const ok = rateLimitMemory(`rebuild:${session.user.id}`, 3, 60 * 60 * 1000);
    if (!ok) {
      return NextResponse.json(
        { error: "Trop de rebuilds. Réessayez dans une heure." },
        { status: 429 }
      );
    }
  }

  const current = await getStatus();
  if (current.status === "running") {
    return NextResponse.json({ error: "Un rebuild est déjà en cours." }, { status: 409 });
  }

  const startedAt = new Date().toISOString();
  await setStatus({ status: "running", startedAt, log: "" });

  const cwd = process.cwd();
  const hasPnpm = existsSync(join(cwd, "pnpm-lock.yaml"));
  const hasNpm = existsSync(join(cwd, "package-lock.json"));
  const packageManager = hasPnpm && !hasNpm ? "pnpm" : "npm";
  const child = spawn(
    "sh",
    [
      "-c",
      packageManager === "pnpm"
        ? "pnpm run saas:build && pnpm install && pnpm run build"
        : "npm run saas:build && npm install && npm run build",
    ],
    { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] }
  );

  let log = "";
  child.stdout?.on("data", (d: Buffer) => {
    log += d.toString().slice(0, 2000);
  });
  child.stderr?.on("data", (d: Buffer) => {
    log += d.toString().slice(0, 2000);
  });

  child.on("close", async (code) => {
    const finishedAt = new Date().toISOString();
    if (code === 0) {
      await setStatus({
        status: "success",
        startedAt,
        finishedAt,
        log: log.slice(-3000),
      });
    } else {
      await setStatus({
        status: "error",
        startedAt,
        finishedAt,
        error: `Exit code ${code}`,
        log: log.slice(-3000),
      });
    }
  });

  child.unref();

  return NextResponse.json({
    ok: true,
    message:
      "Rebuild lancé en arrière-plan. Vérifiez le statut via GET /api/admin/rebuild.",
    startedAt,
  });
}
