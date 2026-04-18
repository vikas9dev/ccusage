# =============================================================================
# ccusage — Dockerfile
# Works on Linux, macOS, and Windows (via Docker Desktop)
# =============================================================================
#
# ---------- BUILD & RUN LOCALLY ----------
#
#   docker build -t ccusage .
#
#   # Linux / macOS
#   docker run -d \
#     --name ccusage \
#     -p 9001:9001 \
#     -v ~/.claude:/claude-data:ro \
#     -e CLAUDE_DATA_DIR=/claude-data \
#     ccusage
#
#   # Windows (PowerShell)
#   docker run -d `
#     --name ccusage `
#     -p 9001:9001 `
#     -v "$env:USERPROFILE\.claude:/claude-data:ro" `
#     -e CLAUDE_DATA_DIR=/claude-data `
#     ccusage
#
#   # Windows (CMD)
#   docker run -d ^
#     --name ccusage ^
#     -p 9001:9001 ^
#     -v "%USERPROFILE%\.claude:/claude-data:ro" ^
#     -e CLAUDE_DATA_DIR=/claude-data ^
#     ccusage
#
#   Open: http://localhost:9001
#
# ---------- PUSH TO DOCKER HUB ----------
#
#   # Login (one-time)
#   docker login
#
#   # Tag for Docker Hub
#   docker tag ccusage vikas9dev/ccusage:latest
#   docker tag ccusage vikas9dev/ccusage:1.0.0
#
#   # Push
#   docker push vikas9dev/ccusage:latest
#   docker push vikas9dev/ccusage:1.0.0
#
# ---------- MULTI-PLATFORM BUILD (amd64 + arm64) ----------
#   Needed so it works on both Intel/AMD machines and Apple Silicon (M1/M2/M3)
#
#   # One-time setup
#   docker buildx create --use --name multiarch
#
#   # Build and push both platforms in one command
#   docker buildx build \
#     --platform linux/amd64,linux/arm64 \
#     -t vikas9dev/ccusage:latest \
#     -t vikas9dev/ccusage:1.0.0 \
#     --push .
#
# =============================================================================

# Stage 1 — Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci --quiet
COPY frontend/ ./
RUN npm run build

# Stage 2 — Python backend + built static files
FROM python:3.11-slim
WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend-build /build/dist ./dist

ENV BACKEND_PORT=9001
ENV CLAUDE_DATA_DIR=/claude-data
ENV STATIC_DIR=/app/dist

EXPOSE ${BACKEND_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:9001/health')"

CMD ["python3", "backend/server.py"]
