import type {
  CategoryEstimate,
  EstimateRequest,
  EstimateTask,
  EstimateRun,
  IntegratedQuote,
  Rfp,
} from "./types";
import projectExamples from "@/data/projects.json";

const dayRate = 400_000;

function makeTasks(items: Array<[string, number, string]>): EstimateTask[] {
  return items.map(([name, days, rationale]) => ({
    name,
    days,
    cost: days * dayRate,
    rationale,
  }));
}

function makeRfp(input: EstimateRequest): Rfp {
  const summary = input.request.trim().replace(/\s+/g, " ");
  const example = projectExamples[0];

  return {
    projectSummary: summary.slice(0, 180),
    platform: example.platform,
    technologyCandidates: example.techStack,
    requirements: [
      "고객 요구사항을 구조화하고 핵심 사용자 흐름을 정의한다.",
      "운영 가능한 웹 서비스와 관리자 기능을 제공한다.",
      ...(input.attachmentNames?.length ? [`첨부파일 ${input.attachmentNames.length}개를 분석 대상으로 포함한다.`] : []),
    ],
    assumptions: [
      "초기 견적은 제공된 요구사항과 유사 프로젝트 데이터를 기준으로 한다.",
      "외부 유료 솔루션 비용과 세금은 포함하지 않는다.",
    ],
    risks: [
      "상세 화면 수와 외부 연동 범위가 확정되면 작업일수가 변동될 수 있다.",
    ],
  };
}

function makeEstimate(
  category: CategoryEstimate["category"],
  label: string,
  tasks: EstimateTask[],
  assumptions: string[],
  risks: string[],
): CategoryEstimate {
  const estimatedDays = tasks.reduce((total, task) => total + task.days, 0);

  return {
    category,
    label,
    estimatedDays,
    estimatedCost: estimatedDays * dayRate,
    confidence: 0.78,
    tasks,
    assumptions,
    risks,
  };
}

export function integrateEstimates(estimates: CategoryEstimate[], rfp: Rfp): IntegratedQuote {
  const estimatedDays = estimates.reduce((total, estimate) => total + estimate.estimatedDays, 0);
  const estimatedCost = estimates.reduce((total, estimate) => total + estimate.estimatedCost, 0);
  const contingencyCost = Math.round(estimatedCost * 0.1);

  return {
    estimatedDays,
    estimatedCost,
    contingencyCost,
    totalCost: estimatedCost + contingencyCost,
    currency: "KRW",
    summary: "세부 견적을 합산한 Mock 통합 견적입니다.",
    overlaps: [],
    recommendations: ["RFP 확정 후 화면 수와 외부 연동 범위를 다시 검토하세요."],
    assumptions: rfp.assumptions,
    risks: [...rfp.risks, "통합 견적에는 변경 가능성을 고려한 10% 예비비가 포함된다."],
  };
}

export function runMockEstimate(input: EstimateRequest): EstimateRun {
  const rfp = makeRfp(input);
  const estimates = [
    makeEstimate("uiux", "UI/UX", makeTasks([
      ["사용자 흐름 및 화면 구조", 3, "핵심 사용자 여정과 화면 목록을 정의한다."],
      ["와이어프레임 및 UI 설계", 5, "주요 화면의 상태와 인터랙션을 설계한다."],
    ]), ["브랜드 가이드가 제공되지 않는 것으로 가정한다."], []),
    makeEstimate("architecture", "아키텍처", makeTasks([
      ["기술 구조 및 데이터 모델", 3, "서비스 경계와 주요 데이터를 설계한다."],
      ["API 및 배포 구조", 3, "인증, API, 배포 환경의 기본 구조를 정의한다."],
    ]), ["초기 버전은 단일 웹 애플리케이션으로 구성한다."], []),
    makeEstimate("implementation", "개발·QA·배포", makeTasks([
      ["핵심 기능 개발", 10, "RFP의 핵심 사용자 흐름을 구현한다."],
      ["QA 및 버그 수정", 4, "주요 시나리오와 예외 케이스를 검증한다."],
      ["배포 및 운영 준비", 2, "환경변수, 빌드, 기본 모니터링을 준비한다."],
    ]), ["외부 연동은 API 문서가 제공된다는 전제로 산정한다."], ["연동 API의 완성도에 따라 개발 일정이 늘어날 수 있다."]),
  ];

  return {
    runId: `mock-${Date.now()}`,
    mode: "mock",
    rfp,
    estimates,
    integratedQuote: integrateEstimates(estimates, rfp),
  };
}
