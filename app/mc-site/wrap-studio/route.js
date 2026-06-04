import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const COOP_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export async function GET() {
  try {
    const htmlPath = path.join(process.cwd(), "public", "wrap-studio", "index.html");
    const html = await readFile(htmlPath, "utf-8");
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...COOP_HEADERS,
      },
    });
  } catch {
    return new NextResponse("Wrap Studio not found", {
      status: 404,
      headers: COOP_HEADERS,
    });
  }
}
