"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { EstimateRun } from "@/lib/estimation/types";

const won = new Intl.NumberFormat("ko-KR");

export default function HomePage() {
  const [request, setRequest] = useState("");
  const [result, setResult] = useState<EstimateRun | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createEstimate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "견적 생성에 실패했습니다.");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Typography color="primary" sx={{ fontWeight: 700 }} variant="overline">Scope2Quote</Typography>
          <Typography component="h1" gutterBottom variant="h3">요구사항에서 견적까지</Typography>
          <Typography color="text.secondary">고객 요구사항을 분석해 단계별 견적과 통합 리포트를 생성합니다.</Typography>
        </Box>

        <Paper component="form" elevation={2} onSubmit={createEstimate} sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography component="h2" variant="h6">새 견적 요청</Typography>
              <Chip color="default" label="Mock mode" size="small" />
            </Stack>
            <TextField
              fullWidth
              label="고객 요구사항"
              minRows={8}
              multiline
              onChange={(event) => setRequest(event.target.value)}
              placeholder="프로젝트 목적, 주요 기능, 대상 사용자, 필요한 플랫폼 등을 입력하세요."
              value={request}
            />
            <Button disabled={!request.trim() || loading} size="large" type="submit" variant="contained">
              {loading ? "견적 생성 중..." : "견적 생성 시작"}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Paper>

        {result && (
          <Stack spacing={3}>
            <Alert severity="success">Mock 에이전트 실행이 완료되었습니다. 결과를 검토한 뒤 최종 견적을 확정하세요.</Alert>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction={{ sm: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2">통합 견적</Typography>
                      <Typography variant="h4">₩{won.format(result.integratedQuote.totalCost)}</Typography>
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="body2">예상 작업일</Typography>
                      <Typography variant="h5">{result.integratedQuote.estimatedDays}일</Typography>
                    </Box>
                  </Stack>
                  <Typography color="text.secondary" variant="body2">예비비 포함 · 실행 ID: {result.runId}</Typography>
                </Stack>
              </CardContent>
            </Card>

            <Box>
              <Typography gutterBottom variant="h5">영역별 견적</Typography>
              <Stack spacing={2}>
                {result.estimates.map((estimate) => (
                  <Card key={estimate.category} variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="h6">{estimate.label}</Typography>
                          <Typography sx={{ fontWeight: 700 }}>₩{won.format(estimate.estimatedCost)}</Typography>
                        </Stack>
                        <Typography color="text.secondary" variant="body2">{estimate.estimatedDays}일 · 신뢰도 {Math.round(estimate.confidence * 100)}%</Typography>
                        <Divider />
                        {estimate.tasks.map((task) => (
                          <Stack key={task.name} direction="row" sx={{ justifyContent: "space-between" }}>
                            <Typography>{task.name}</Typography>
                            <Typography color="text.secondary" variant="body2">{task.days}일</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>

            <Card variant="outlined">
              <CardContent>
                <Typography gutterBottom variant="h6">RFP 요약</Typography>
                <Typography color="text.secondary">{result.rfp.projectSummary}</Typography>
                <Typography sx={{ mt: 2 }} variant="body2">기술 후보: {result.rfp.technologyCandidates.join(", ")}</Typography>
              </CardContent>
            </Card>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
