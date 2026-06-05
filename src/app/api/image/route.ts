import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (url.protocol !== "https:" || url.hostname !== "img.youtube.com") {
    return NextResponse.json({ error: "Unsupported image host" }, { status: 400 });
  }

  const imageResponse = await fetch(url.toString());

  if (!imageResponse.ok) {
    return NextResponse.json({ error: "Image not found" }, { status: imageResponse.status });
  }

  return new NextResponse(imageResponse.body, {
    headers: {
      "Content-Type": imageResponse.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
