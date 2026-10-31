import { NextResponse } from "next/server";
import { runAgentsEstimate } from "@/lib/estimation/agents";
import { runMockEstimate } from "@/lib/estimation/mock";
import type { EstimateRequest } from "@/lib/estimation/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<EstimateRequest>;

  if (typeof body.request !== "string" || !body.request.trim()) {
    return NextResponse.json({ error: "request는 비어 있지 않은 문자열이어야 합니다." }, { status: 400 });
  }

  const input = {
    request: body.request,
    attachmentNames: Array.isArray(body.attachmentNames) ? body.attachmentNames : [],
  };

  try {
    const result = process.env.ESTIMATION_MODE === "agents"
      ? await runAgentsEstimate(input)
      : runMockEstimate(input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "견적 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
