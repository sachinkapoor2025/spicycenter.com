import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

function loadWorldMapSvg(): string {
  const candidates = [
    join(process.cwd(), "public/maps/world.svg"),
    join(process.cwd(), "apps/web/public/maps/world.svg"),
  ];
  for (const file of candidates) {
    try {
      return readFileSync(file, "utf8");
    } catch {
      /* try next */
    }
  }
  throw new Error("world map SVG not found");
}

const WORLD_MAP_SVG = loadWorldMapSvg();

export function GET() {
  return new NextResponse(WORLD_MAP_SVG, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
