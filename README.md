# Scope2Quote

고객의 요구사항을 분석해 기획·UI/UX·아키텍처·개발·QA·배포 단계별 견적과 통합 견적서를 생성하는 OpenAI Agents SDK 기반 멀티 에이전트 시스템입니다.

## 프로젝트 배경

3~4인 규모의 스타트업에서는 실무자가 고객 채팅과 첨부파일을 확인하고, 프로젝트 범위를 정리한 뒤 여러 단계의 견적서를 반복해서 작성해야 합니다. Scope2Quote는 이 과정의 병목을 줄여 견적서 작성 시간을 절반으로 단축하는 것을 목표로 합니다.

## 목표

- 고객 채팅 내역과 첨부파일에서 핵심 요구사항 추출
- 요구사항을 구조화한 RFP(Request for Proposal) 생성
- UI/UX, 아키텍처, 개발·QA·배포 영역별 견적 산출
- 영역별 산출물을 바탕으로 통합 견적서 생성
- 기대치와 추정값, 근거를 포함한 종합 리포트 제공
- 하루 약 3건의 견적서를 작성하는 실무자의 반복 작업 감소
- 에이전트 결과를 사람이 검토하고 수정한 뒤 최종 견적 확정

## 기술 스택

- Frontend: React, Next.js, TypeScript, MUI(Material UI)
- Backend: Next.js Route Handlers
- Agent orchestration: OpenAI Agents SDK
- Data: 기존 납품 프로젝트를 기반으로 한 Mock JSON
- Runtime: Node.js

## 에이전트 구성

| 에이전트 | 입력 | 출력 | 역할 |
| --- | --- | --- | --- |
| `rfp-analyzer` | 고객 채팅, 첨부파일 | `01_rfp.json` | 고객 요구사항을 정제하고 구조화된 RFP 작성 |
| `uiux-cost-estimator` | RFP JSON | `02_uiux.json` | 화면, 사용자 흐름, UI/UX 작업 범위와 비용 산출 |
| `architecture-cost-estimator` | RFP JSON | `03_architecture.json` | 시스템 구조, 인프라, 기술 설계 범위와 비용 산출 |
| `implementation-cost-estimator` | RFP JSON | `04_implementation.json` | 개발·QA·배포 작업 범위와 비용 산출 |
| `quote-integrator` | 세 영역의 견적 JSON과 계산 결과 | `05_integrated_quote.json` | 중복 범위·리스크·통합 설명 생성 |

`quote-orchestrator`는 전체 실행을 관리하는 중앙 오케스트레이터입니다. RFP 분석 이후 세 견적 에이전트를 병렬 실행하고, TypeScript로 금액·작업일수를 먼저 계산한 뒤 `quote-integrator`를 호출합니다. 통합 Agent는 계산값을 수정하지 않고 중복 범위, 리스크, 요약과 권고사항만 생성합니다.

모델은 단순히 가장 저렴한 모델로 고정하지 않습니다. 작업 복잡도와 품질 요구사항을 기준으로 선택하며, 모델 교체와 비용 비교가 가능하도록 구성합니다.

## 견적 산출 기준 데이터

현재까지 고객사에 납품한 프로젝트 정보를 Mock JSON으로 관리합니다.

- 프로젝트 유형
- 프로젝트 카테고리
- 프로젝트 요약
- 작업일수
- 기존 견적서
- 플랫폼(`fullstack`, `mobile`, `infra` 등)
- 기술 스택

에이전트는 RFP의 프로젝트 특성과 과거 프로젝트 데이터를 비교해 작업 범위, 예상 작업일수, 비용의 근거를 제시합니다.

## 구조화된 출력

에이전트는 먼저 계산 가능한 JSON을 반환하고, 필요할 때 사람이 읽는 Markdown 리포트로 렌더링합니다.

```json
{
  "estimatedDays": 12,
  "estimatedCost": 4800000,
  "currency": "KRW",
  "tasks": [],
  "assumptions": [],
  "risks": [],
  "confidence": 0.78
}
```

구조화된 결과를 기준으로 통합 견적을 계산하므로, Markdown 문장 파싱에 의존하지 않습니다. 금액·작업일수 합산은 결정적인 TypeScript 코드가 담당하고, Agent는 설명과 검토 의견을 담당합니다.

## 처리 워크플로

```text
고객 채팅 내역 + 첨부파일 입력
              ↓
       quote-orchestrator 실행
              ↓
       구조화된 RFP 생성
              ↓
 ┌──────────────┼────────────────┐
 ↓              ↓                ↓
UI/UX        아키텍처       개발·QA·배포
견적          견적             견적
 ↓              ↓                ↓
02_uiux.json  03_architecture  04_implementation
              .json            .json
              ↓
      결과 검증 및 통합 견적
              ↓
        사람 검토 및 수정
              ↓
          종합 리포트
```

## 실행 결과

사용자는 다음 결과를 확인할 수 있습니다.

1. 견적 작성 시간 단축에 대한 기대치
2. 에이전트가 계산한 작업일수와 비용 추정값
3. 영역별 견적 산출물
4. 전체 범위를 합산한 통합 견적서
5. 견적 근거, 가정, 신뢰도, 주요 리스크를 포함한 통합 리포트 발췌
6. 사람이 수정·확정한 최종 견적

## 산출물 구조

```text
workspace/
└── analyzer/
    ├── 01_rfp.json
    ├── 01_rfp.md
    ├── 02_uiux.json
    ├── 03_architecture.json
    ├── 04_implementation.json
    ├── 05_integrated_quote.json
    └── 05_integrated_quote.md
```

## 애플리케이션 흐름

```text
사용자 입력 화면
      ↓
Next.js API Route
      ↓
OpenAI Agents SDK 오케스트레이터
      ↓
전문 에이전트 병렬 실행
      ↓
결과 검증 및 통합 견적
      ↓
사람 검토 및 결과 확정
```

## 도구 권한

에이전트에 제한 없는 셸 권한을 제공하지 않고, 업무에 필요한 함수 도구만 제한적으로 제공합니다.

- `load_project_examples`: 과거 프로젝트 Mock 데이터 조회
- `read_rfp`: 구조화된 RFP 조회
- `save_estimate`: 검증된 견적 결과 저장
- `list_attachments`: 입력 첨부파일 목록 조회

파일 경로와 저장 위치는 워크스페이스 내부로 제한하며, 임의의 명령 실행이나 외부 파일 접근은 허용하지 않습니다.

## 오류 처리와 검토

- 에이전트별 timeout 및 재시도
- 일부 에이전트 실패 시 실패 상태와 원인 표시
- JSON schema 검증 실패 시 재생성 요청
- 통합 전 금액·작업일수 누락 검증
- 가정, 리스크, 신뢰도를 결과에 포함
- 최종 확정 전 사람이 결과를 수정할 수 있는 검토 단계

## Mock 실행 모드

실제 API 키가 없어도 전체 사용자 흐름을 확인할 수 있도록 Mock 실행 모드를 제공합니다.

```text
사용자 입력
→ Mock RFP 결과
→ Mock 영역별 견적
→ Mock 통합 견적
→ 결과 화면
```

실제 Agents SDK 실행과 Mock 실행은 동일한 입력·출력 스키마를 사용해야 합니다.

## 평가 기준

- 동일 입력에 대한 필수 요구사항 누락 여부
- RFP와 영역별 견적 간 추적 가능성
- 작업일수·금액 합산의 정확성
- 가정과 리스크의 명시 여부
- Mock 실행과 실제 실행 결과 스키마 일치 여부
- 기존 수작업 대비 견적 작성 시간 단축률

## 환경변수

`.env.example`을 복사해 `.env`를 만들고 OpenAI API 키를 설정합니다.

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=your_openai_api_key
```

실제 API 키가 없는 경우에도 Mock 데이터와 에이전트 입출력 구조를 기준으로 개발할 수 있으며, `.env` 파일은 저장소에 커밋하지 않습니다.

## 개발 단계

- [x] Next.js + MUI 기본 화면 구성
- [x] Mock 프로젝트 데이터 및 파일 기반 워크스페이스 구성
- [x] 구조화된 RFP 및 견적 JSON schema 정의
- [x] RFP 분석 에이전트 구현
- [x] UI/UX·아키텍처·개발 견적 에이전트 구현
- [x] 통합 견적 에이전트 및 오케스트레이션 구현
- [x] 결과 리포트 화면 구현
- [x] 실제 API 키 없이 동작하는 Mock 실행 모드 추가
- [ ] 에이전트 오류 처리 및 사람 검토 단계 구현
- [ ] 평가용 샘플과 회귀 테스트 구성
- [ ] 테스트 및 배포
