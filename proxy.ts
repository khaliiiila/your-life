import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const configuredKey = process.env.AI_API_KEY;
  const suppliedKey = request.headers.get("x-ai-api-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredKey || suppliedKey !== configuredKey) return NextResponse.json({ error: "AI API key tidak valid." }, { status: 401 });

  const target = request.nextUrl.clone();
  target.pathname = target.pathname.replace(/^\/api\/ai/, "/api");
  return NextResponse.rewrite(target);
}

export const config = { matcher: "/api/ai/:path*" };
