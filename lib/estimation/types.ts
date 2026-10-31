export type EstimateCategory = "uiux" | "architecture" | "implementation";

export interface EstimateRequest {
  request: string;
  attachmentNames?: string[];
}

export interface Rfp {
  projectSummary: string;
  platform: string;
  technologyCandidates: string[];
  requirements: string[];
  assumptions: string[];
  risks: string[];
}

export interface EstimateTask {
  name: string;
  days: number;
  cost: number;
  rationale: string;
}

export interface CategoryEstimate {
  category: EstimateCategory;
  label: string;
  estimatedDays: number;
  estimatedCost: number;
  confidence: number;
  tasks: EstimateTask[];
  assumptions: string[];
  risks: string[];
}

export interface IntegratedQuote {
  estimatedDays: number;
  estimatedCost: number;
  contingencyCost: number;
  totalCost: number;
  currency: "KRW";
  assumptions: string[];
  risks: string[];
}

export interface EstimateRun {
  runId: string;
  mode: "mock" | "agents";
  rfp: Rfp;
  estimates: CategoryEstimate[];
  integratedQuote: IntegratedQuote;
}
