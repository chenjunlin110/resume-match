FROM public.ecr.aws/docker/library/python:3.11-slim


# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libglib2.0-0 libglib2.0-data \
 && rm -rf /var/lib/apt/lists/*

COPY ml_service/requirements.txt .
RUN pip install -U pip && pip install --no-cache-dir -r requirements.txt

COPY ml_service/ .
ENV PORT=8000
EXPOSE 8000
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","8000","--timeout-keep-alive","30"]
