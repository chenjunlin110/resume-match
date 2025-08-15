import { useState } from "react";
import { buildApiUrl, API_CONFIG } from "../config";

import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
} from "@mui/material";

type BaseInfo = {
  total_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
};

export default function UploadForm() {
  const [jdText, setJdText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [baseInfo, setBaseInfo] = useState<BaseInfo | null>(null);
  const [finalContent, setFinalContent] = useState<string>("");

  const onSubmit = async () => {
    setErr(null);
    setBaseInfo(null);
    setStreamContent("");
    setFinalContent("");
    if (!resumeFile) {
      setErr("请上传简历文件（.txt / .pdf / .doc / .docx）");
      return;
    }
    if (!jdText.trim()) {
      setErr("请填写 JD 文本");
      return;
    }

    const form = new FormData();
    form.append("jd_text", jdText.trim());
    form.append("resume_file", resumeFile);

    setStreaming(true);
    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.UPLOAD_STREAM), { 
        method: "POST", 
        body: form 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取流式响应");

      let accumulatedContent = ""; // 本地累积内容
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'base_info') {
                setBaseInfo(data);
              } else if (data.type === 'stream_content') {
                accumulatedContent += data.content; // 累积到本地变量
                setStreamContent(accumulatedContent);
              } else if (data.type === 'end') {
                // 流结束时，保存累积的完整内容
                setFinalContent(accumulatedContent);
              }
            } catch {
              console.warn("解析流式数据失败:", line);
            }
          }
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "请求失败";
      setErr(errorMessage);
    } finally {
      setStreaming(false);
    }
  };



  return (
    <Box
      sx={{
        width: "min(820px, 92vw)", // ⭐ 不再 100%，自然就能居中显示
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Card
        elevation={0}
        sx={{
          p: 2,
          background: "rgba(255,255,255,0.40)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          backdropFilter: "blur(16px) saturate(140%)",
          "-webkit-backdrop-filter": "blur(16px) saturate(140%)",
        }}
      >
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h5" gutterBottom>
            上传材料
          </Typography>

          <Button
            variant="outlined"
            component="label"
            sx={{ alignSelf: "flex-start" }}
          >
            选择简历文件（.txt / .pdf / .doc / .docx）
            <input
              type="file"
              hidden
              accept=".txt,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (!f) return setResumeFile(null);
                const MAX = 10 * 1024 * 1024;
                if (f.size > MAX) {
                  alert("文件过大（>10MB）");
                  e.currentTarget.value = "";
                  return;
                }
                if (!/\.(txt|pdf|docx?)$/i.test(f.name)) {
                  alert("仅支持 .txt / .pdf / .doc / .docx");
                  e.currentTarget.value = "";
                  return;
                }
                setResumeFile(f);
              }}
            />
          </Button>

          {resumeFile && (
            <Typography variant="body2" color="text.secondary">
              已选：{resumeFile.name}(
              {(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
            </Typography>
          )}

          <TextField
            label="JD 文本（必填）"
            multiline
            minRows={6}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            required
          />

          {err && <Alert severity="error">{err}</Alert>}
        </CardContent>

        <CardActions sx={{ pt: 0 }}>
          <Button variant="contained" onClick={onSubmit} disabled={streaming}>
            流式评分
          </Button>
        </CardActions>
      </Card>

      {baseInfo && (
        <Card
          elevation={0}
          sx={{
            p: 2,
            background: "rgba(255,255,255,0.40)",
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            backdropFilter: "blur(16px) saturate(140%)",
            "-webkit-backdrop-filter": "blur(16px) saturate(140%)",
          }}
        >
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6">评分结果</Typography>
                {typeof baseInfo?.total_score === "number" && (
                  <Chip label={`总分：${baseInfo.total_score}`} color="primary" />
                )}
              </Stack>

              {baseInfo?.matched_skills?.length ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    命中技能
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {baseInfo.matched_skills.map((s: string) => (
                      <Chip key={s} label={s} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {baseInfo?.missing_skills?.length ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    缺失技能
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {baseInfo.missing_skills.map((s: string) => (
                      <Chip
                        key={s}
                        label={s}
                        color="warning"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* 流式输出显示 */}
      {(streaming || finalContent) && (
        <Card
          elevation={0}
          sx={{
            p: 2,
            background: "rgba(255,255,255,0.40)",
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            backdropFilter: "blur(16px) saturate(140%)",
            "-webkit-backdrop-filter": "blur(16px) saturate(140%)",
          }}
        >
          <CardContent>
            {streaming ? (
              <>
                <Typography variant="h6" gutterBottom>
                  实时生成中...
                </Typography>
                {streamContent && (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {streamContent}
                  </Typography>
                )}
                <LinearProgress />
              </>
            ) : (
              finalContent && (
                <>
                  <Typography variant="h6" gutterBottom>
                    生成的建议
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {finalContent}
                  </Typography>
                </>
              )
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
