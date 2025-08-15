# ---- Build Stage ----
FROM --platform=$BUILDPLATFORM public.ecr.aws/docker/library/golang:1.24-alpine AS build

ARG TARGETARCH
WORKDIR /app

# 如果你用 vendor
COPY go.mod go.sum ./
COPY vendor ./vendor
COPY . .

# 根据目标架构编译（Mac M 系列是 arm64，Linux x86_64 是 amd64）
RUN GOARCH=$TARGETARCH CGO_ENABLED=0 go build -v -mod=vendor -trimpath -ldflags="-s -w" -o /out/server ./

# ---- Runtime Stage ----
FROM gcr.io/distroless/base-debian12:latest
WORKDIR /app
COPY --from=build /out/server /app/server
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
