import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import projectExamples from "@/data/projects.json";
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

const integrationSchema = z.object({
  summary: z.string(),
  overlaps: z.array(z.string()),
  recommendations: z.array(z.string()),
});

function createProjectExamplesTool() {
  return tool({
    name: "load_project_examples",
    description: "플랫폼 조건에 맞는 과거 프로젝트와 견적 데이터를 조회한다.",
    parameters: z.object({ platform: z.string().optional() }),
    async execute({ platform }) {
      const examples = platform
        ? projectExamples.filter((project) => project.platform === platform)
        : projectExamples;
      return JSON.stringify(examples);
    },
  });
}

function createAttachmentListTool(attachmentNames: string[]) {
  return tool({
    name: "list_attachments",
    description: "이번 견적 요청에 포함된 첨부파일 목록을 조회한다.",
    parameters: z.object({}),
    async execute() {
      return JSON.stringify({ attachmentNames });
    },
  });
}

function createReadRfpTool(rfp: Rfp) {
  return tool({
    name: "read_rfp",
    description: "이번 견적 실행에서 확정된 구조화 RFP를 조회한다.",
    parameters: z.object({}),
    async execute() {
      return JSON.stringify(rfp);
    },
  });
}

function createReadEstimateInputsTool(rfp: Rfp, estimates: CategoryEstimate[], calculatedQuote: ReturnType<typeof integrateEstimates>) {
  return tool({
    name: "read_estimate_inputs",
    description: "통합 검토를 위한 RFP, 세부 견적, 결정론적 계산 결과를 조회한다.",
    parameters: z.object({}),
    async execute() {
      return JSON.stringify({ rfp, estimates, calculatedQuote });
    },
  });
}

function createRfpAgent(attachmentNames: string[]) {
  return new Agent({
    name: "rfp-analyzer",
    instructions: "고객 요구사항을 분석해 구조화된 RFP를 생성한다. 반드시 list_attachments와 load_project_examples를 사용하고, 추측은 assumptions와 risks에 명시한다.",
    tools: [createAttachmentListTool(attachmentNames), createProjectExamplesTool()],
    outputType: rfpSchema,
  });
}

function createEstimatorAgent(definition: (typeof estimatorDefinitions)[number], rfp: Rfp) {
  return new Agent({
    name: `${definition.label}-cost-estimator`,
    instructions: `반드시 read_rfp와 load_project_examples를 사용해 RFP와 유사 프로젝트를 확인한 뒤 ${definition.focus} 작업의 견적을 산출한다. 작업일수와 금액의 근거를 tasks에 작성하고, 불확실성은 assumptions와 risks에 기록한다.`,
    tools: [createReadRfpTool(rfp), createProjectExamplesTool()],
    outputType: estimateSchema,
  });
}

function createQuoteIntegrator(rfp: Rfp, estimates: CategoryEstimate[], calculatedQuote: ReturnType<typeof integrateEstimates>) {
  return new Agent({
    name: "quote-integrator",
    instructions: "반드시 read_estimate_inputs를 사용해 입력을 확인한 뒤 세부 견적과 계산된 통합 금액을 검토한다. 금액과 작업일수는 수정하지 않고 중복 범위, 리스크, 고객에게 전달할 요약과 권고사항만 작성한다.",
    tools: [createReadEstimateInputsTool(rfp, estimates, calculatedQuote)],
    outputType: integrationSchema,
  });
}

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

export async function runAgentsEstimate(input: EstimateRequest): Promise<EstimateRun> {
  const rfpResult = await run(
    createRfpAgent(input.attachmentNames ?? []),
    JSON.stringify({ request: input.request }),
  );
  const rfp = rfpResult.finalOutput as Rfp | undefined;
  if (!rfp) throw new Error("RFP agent가 결과를 반환하지 않았습니다.");

  const estimates = await Promise.all(estimatorDefinitions.map(async (definition) => {
    const result = await run(createEstimatorAgent(definition, rfp), JSON.stringify({ category: definition.category }));
    const output = result.finalOutput;
    if (!output) throw new Error(`${definition.label} 에이전트가 결과를 반환하지 않았습니다.`);

    return { ...output, category: definition.category, label: definition.label } as CategoryEstimate;
  }));

  const calculatedQuote = integrateEstimates(estimates, rfp);
  const integrationResult = await run(
    createQuoteIntegrator(rfp, estimates, calculatedQuote),
    "통합 견적을 검토해 주세요.",
  );
  const integration = integrationResult.finalOutput;
  if (!integration) throw new Error("quote-integrator가 결과를 반환하지 않았습니다.");

  return {
    runId: `agents-${Date.now()}`,
    mode: "agents",
    rfp,
    estimates,
    integratedQuote: { ...calculatedQuote, ...integration },
  };
}
