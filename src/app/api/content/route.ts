import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content");
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);

export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get("week");
  const file = request.nextUrl.searchParams.get("file");

  if (!week || !file) {
    return NextResponse.json({ error: "Missing week or file" }, { status: 400 });
  }

  const safeFile = path.basename(file);
  if (path.extname(safeFile) === "" || !ALLOWED_EXT.has(path.extname(safeFile).toLowerCase())) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const filePath = path.join(CONTENT_DIR, week, safeFile);
  if (!filePath.startsWith(CONTENT_DIR) || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(safeFile).toLowerCase();
  const mime: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
