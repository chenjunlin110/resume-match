# app.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Set, List, AsyncGenerator
import uvicorn, re, io, os, json

# ---- optional: LLM client (OpenAI-compatible) ----
USE_LLM = bool(os.getenv("LLM_API_KEY"))  # 设了就启用
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_BASE_URL = os.getenv("LLM_BASE_URL")  # 可为空（官方 OpenAI）或自托管 vLLM 网关

if USE_LLM:
    from openai import OpenAI
    client_kwargs = {}
    if LLM_BASE_URL:
        client_kwargs["base_url"] = LLM_BASE_URL
    client = OpenAI(api_key=os.getenv("LLM_API_KEY"), **client_kwargs)

import yaml
from flashtext import KeywordProcessor

SKILLS_PATH = os.getenv("SKILLS_PATH", os.path.join(os.path.dirname(__file__), "skills.yaml"))
keyword_proc = KeywordProcessor(case_sensitive=False)
CANONICAL_SET: Set[str] = set()

def load_skills(path: str = SKILLS_PATH):
    global keyword_proc, CANONICAL_SET
    kp = KeywordProcessor(case_sensitive=False)
    with open(path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    aliases = cfg.get("aliases", {}) or {}
    # 扁平化所有技能为 canonical 集
    all_skills = []
    for _, items in (cfg.get("skills") or {}).items():
        if items:
            all_skills.extend(items)
    canonical = sorted(set(str(s) for s in all_skills if s))
    # 把每个 canonical 自身 + alias 都注册到 KeywordProcessor，输出统一成 canonical
    for c in canonical:
        kp.add_keyword(c, c)
    for a, c in aliases.items():
        kp.add_keyword(a, c)

    keyword_proc = kp
    CANONICAL_SET = set(canonical)

def extract_skills(text: str) -> Set[str]:
    if not text:
        return set()
    # 返回 canonical 名称去重集合
    return set(keyword_proc.extract_keywords(text))

# 启动时加载
load_skills()



def read_txt(b: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            continue
    return b.decode("utf-8", errors="ignore")

def read_pdf(b: bytes) -> str:
    from pdfminer.high_level import extract_text
    with io.BytesIO(b) as fp:
        return extract_text(fp) or ""

def read_docx(b: bytes) -> str:
    from docx import Document
    with io.BytesIO(b) as fp:
        doc = Document(fp)
    return "\n".join(p.text for p in doc.paragraphs)

def ext_of(filename: str) -> str:
    return os.path.splitext((filename or "").lower())[1]

def to_text_from_file(upload: UploadFile) -> str:
    data = upload.file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    ext = ext_of(upload.filename)
    ctype = (upload.content_type or "").lower()

    if ext == ".txt" or ctype.startswith("text/"):
        return read_txt(data)
    if ext == ".pdf" or "pdf" in ctype:
        try:
            return read_pdf(data)
        except Exception as e:
            raise HTTPException(500, f"PDF extraction error: {e}")
    if ext == ".docx" or "officedocument.wordprocessingml.document" in ctype:
        try:
            return read_docx(data)
        except Exception as e:
            raise HTTPException(500, f"DOCX extraction error: {e}")
    if ext == ".doc" or "msword" in ctype:
        # 可选：后续接 libreoffice 转换
        raise HTTPException(415, "Legacy .doc 暂不支持，请转为 .docx 或 PDF")

    raise HTTPException(415, f"不支持的文件类型: {ext or ctype}")

# ---------------- response models -----------------
class ScoreResponse(BaseModel):
    total_score: int
    matched_skills: List[str]
    missing_skills: List[str]
    suggestions: List[str]
    llm_used: bool = False

# ------------------- FastAPI app ------------------
app = FastAPI()

@app.get("/healthz")
def healthz():
    return {"ok": True, "use_llm": USE_LLM, "model": LLM_MODEL if USE_LLM else None}

@app.post("/api/score_file", response_model=ScoreResponse)
async def score_file(jd_text: str = Form(...), resume_file: UploadFile = File(...)):
    resume_text = to_text_from_file(resume_file)

    required = extract_skills(jd_text)
    present = extract_skills(resume_text)

    matched = sorted(list(required & present))
    missing = sorted(list(required - present))

    ratio = (len(matched) / max(1, len(required)))
    total = min(95, int(round(ratio * 100)))

    # 规则建议（兜底）
    suggestions: List[str] = []
    if missing:
        suggestions.append(f"补充或量化这些技能的经历：{', '.join(missing)}")
    if total < 85:
        suggestions.append("将项目描述量化（如提效 X%、降延迟 Yms），并在要点中前置结果。")
    if "kubernetes" in missing or "k8s" in missing:
        suggestions.append("如有容器编排经验，补一句：'使用 Docker + Kubernetes 进行编排与弹性伸缩'。")

    llm_used = False
    if USE_LLM:
        try:
            prompt = f"""
你是简历优化助手。根据以下 JD 与简历提取的技能匹配情况，给出 3–5 条具体、可落地的优化建议（中文），
要求包含具体改写示例或可量化指标。避免泛泛而谈。

[JD]
{jd_text.strip()}

[简历-纯文本]
{resume_text[:6000]}

[技能匹配]
命中: {matched}
缺失: {missing}
            """.strip()
            completion = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "system", "content": "你是严谨的技术招聘顾问。"},
                          {"role": "user", "content": prompt}],
                temperature=0.3,
            )
            llm_suggest = completion.choices[0].message.content.strip()
            # 简单切条（保留条目化）
            if llm_suggest:
                lines = [s.strip(" -•\t") for s in llm_suggest.split("\n") if s.strip()]
                # 控制 3~6 条
                if 3 <= len(lines) <= 10:
                    suggestions = lines[:6]
                else:
                    suggestions.insert(0, llm_suggest)
                llm_used = True
        except Exception as e:
            # 出错就回退到规则建议
            suggestions.insert(0, f"(LLM 暂不可用：{e})")

    return ScoreResponse(
        total_score=total,
        matched_skills=matched,
        missing_skills=missing,
        suggestions=suggestions or ["整体匹配度较好，微调措辞即可。"],
        llm_used=llm_used,
    )

@app.post("/api/score_file_stream")
async def score_file_stream(jd_text: str = Form(...), resume_file: UploadFile = File(...)):
    """流式输出简历评分和建议"""
    resume_text = to_text_from_file(resume_file)

    required = extract_skills(jd_text)
    present = extract_skills(resume_text)

    matched = sorted(list(required & present))
    missing = sorted(list(required - present))

    ratio = (len(matched) / max(1, len(required)))
    total = min(95, int(round(ratio * 100)))

    # 先发送基础信息
    base_info = {
        "type": "base_info",
        "total_score": total,
        "matched_skills": matched,
        "missing_skills": missing
    }
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        # 发送基础信息
        yield f"data: {json.dumps(base_info, ensure_ascii=False)}\n\n"
        
        if USE_LLM:
            try:
                prompt = f"""
你是简历优化助手。根据以下 JD 与简历提取的技能匹配情况，给出 3–5 条具体、可落地的优化建议（中文），
要求包含具体改写示例或可量化指标。避免泛泛而谈。

[JD]
{jd_text.strip()}

[简历-纯文本]
{resume_text[:6000]}

[技能匹配]
命中: {matched}
缺失: {missing}
                """.strip()
                
                # 使用流式输出
                stream = client.chat.completions.create(
                    model=LLM_MODEL,
                    messages=[{"role": "system", "content": "你是严谨的技术招聘顾问。"},
                              {"role": "user", "content": prompt}],
                    temperature=0.3,
                    stream=True  # 启用流式输出
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        # 发送流式内容
                        stream_data = {
                            "type": "stream_content",
                            "content": content
                        }
                        yield f"data: {json.dumps(stream_data, ensure_ascii=False)}\n\n"
                        
            except Exception as e:
                error_data = {
                    "type": "error",
                    "message": f"LLM 暂不可用：{e}"
                }
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
        else:
            # 规则建议
            suggestions = []
            if missing:
                suggestions.append(f"补充或量化这些技能的经历：{', '.join(missing)}")
            if total < 85:
                suggestions.append("将项目描述量化（如提效 X%、降延迟 Yms），并在要点中前置结果。")
            
            for suggestion in suggestions:
                rule_data = {
                    "type": "rule_suggestion",
                    "content": suggestion
                }
                yield f"data: {json.dumps(rule_data, ensure_ascii=False)}\n\n"
        
        # 发送结束标记
        end_data = {"type": "end"}
        yield f"data: {json.dumps(end_data, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
