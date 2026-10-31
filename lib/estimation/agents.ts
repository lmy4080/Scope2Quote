import { Agent, run } from "@openai/agents";
import { z } from "zod";
import { integrateEstimates } from "./mock";
import type { CategoryEstimate, EstimateRequest, EstimateRun, Rfp } from "./types";

const rfpSchema = z.object({
  projectSummary: z.string(),
  platform: z.string(),
  technologyCandidates: z.array(z.string()),
  requirements: z.array(z.string()),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
});

const estimateSchema = z.object({
  estimatedDays: z.number().int().nonnegative(),
  estimatedCost: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  tasks: z.array(z.object({
    name: z.string(),
    days: z.number().int().nonnegative(),
    cost: z.number().nonnegative(),
    rationale: z.string(),
  })),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
});

const rfpAgent = new Agent({
  name: "rfp-analyzer",
  instructions: "고객 요구사항을 분석해 구조화된 RFP를 생성한다. 추측은 assumptions와 risks에 명시한다.",
  outputType: rfpSchema,
});

const estimatorDefinitions = [
  {
    category: "uiux" as const,
    label: "UI/UX",
    focus: "사용자 흐름, 화면 구조, 와이어프레임, UI 설계",
  },
  {
    category: "architecture" as const,
    label: "아키텍처",
    focus: "시스템 구조, 데이터 모델, API, 인프라와 배포 설계",
  },
  {
    category: "implementation" as const,
    label: "개발·QA·배포",
    focus: "기능 개발, QA, 버그 수정, 배포와 운영 준비",
  },
];

function createEstimator(label: string, focus: string) {
  return new Agent({
    name: `${label}-cost-estimator`,
    instructions: `RFP JSON을 바탕으로 ${focus} 작업의 견적을 산출한다. 작업일수와 금액의 근거를 tasks에 작성하고, 불확실성은 assumptions와 risks에 기록한다.`,
    outputType: estimateSchema,
  });
}

export async function runAgentsEstimate(input: EstimateRequest): Promise<EstimateRun> {
  const rfpResult = await run(rfpAgent, JSON.stringify({ request: input.request, attachmentNames: input.attachmentNames ?? [] }));
  const rfp = rfpResult.finalOutput as Rfp | undefined;
  if (!rfp) throw new Error("RFP agent가 결과를 반환하지 않았습니다.");

  const estimates = await Promise.all(estimatorDefinitions.map(async (definition) => {
    const agent = createEstimator(definition.label, definition.focus);
    const result = await run(agent, JSON.stringify({ rfp }));
    const output = result.finalOutput;
    if (!output) throw new Error(`${definition.label} 에이전트가 결과를 반환하지 않았습니다.`);

    return { ...output, category: definition.category, label: definition.label } as CategoryEstimate;
  }));

  return {
    runId: `agents-${Date.now()}`,
    mode: "agents",
    rfp,
    estimates,
    integratedQuote: integrateEstimates(estimates, rfp),
  };
}
