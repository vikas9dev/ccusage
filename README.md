# ccusage

A local dashboard for your **Claude Code** usage — see token consumption, cost, and activity broken down by every project on your machine.

Reads directly from `~/.claude/` data files. No API key needed. Fully offline.

![Dashboard](https://img.shields.io/badge/stack-React%20%2B%20Python-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- Per-project token usage (input / output / cache write / cache read)
- API-equivalent cost estimation across Opus, Sonnet, Haiku
- Period filters: 12H / 1D / 7D / 15D / 30D / 3M / All
- Cache hit rate — see how much you're saving via prompt caching
- Daily & hourly activity charts with cost-per-day toggle
- Avg conversation depth per project
- Model mix per project (Opus / Sonnet / Haiku badge)
- Project search + CSV export
- Auto-refresh every 30s

---

## Quick Start — Docker (recommended)

### Pull and run

```bash
# Linux / macOS
docker run -d \
  --name ccusage \
  -p 9001:9001 \
  -v ~/.claude:/claude-data:ro \
  -e CLAUDE_DATA_DIR=/claude-data \
  vikas9dev/ccusage:latest

# Windows (PowerShell)
docker run -d `
  --name ccusage `
  -p 9001:9001 `
  -v "$env:USERPROFILE\.claude:/claude-data:ro" `
  -e CLAUDE_DATA_DIR=/claude-data `
  vikas9dev/ccusage:latest

# Windows (CMD)
docker run -d ^
  --name ccusage ^
  -p 9001:9001 ^
  -v "%USERPROFILE%\.claude:/claude-data:ro" ^
  -e CLAUDE_DATA_DIR=/claude-data ^
  vikas9dev/ccusage:latest
```

Open **http://localhost:9001**

### Docker Compose

Create a `docker-compose.yml` anywhere and run `docker compose up -d`:

```yaml
services:
  ccusage:
    image: vikas9dev/ccusage:latest
    ports:
      - "9001:9001"
    volumes:
      - "${CLAUDE_DATA_DIR:-~/.claude}:/claude-data:ro"
    environment:
      - CLAUDE_DATA_DIR=/claude-data
    restart: unless-stopped
```

> **Windows users:** replace `~/.claude` with `C:\Users\<YourName>\.claude` in the volumes line, or set `CLAUDE_DATA_DIR` as an environment variable before running.

### Stop / remove

```bash
docker stop ccusage && docker rm ccusage
```

---

## Local Development (without Docker)

### Prerequisites

- Python 3.11+
- Node.js 18+

### Setup

```bash
git clone https://github.com/vikas9dev/ccusage
cd ccusage
cd frontend && npm install && cd ..
```

### Run

```bash
bash start.sh
```

Opens:
- Backend API → http://localhost:9001
- Frontend UI → http://localhost:5173

```bash
bash stop.sh      # stop both
bash restart.sh   # restart both
```

### Configuration

Copy and edit `.env` (optional — defaults work out of the box):

```env
BACKEND_PORT=9001
FRONTEND_PORT=5173
CLAUDE_DATA_DIR=~/.claude
```

---

## Build Your Own Docker Image

```bash
# Build
docker build -t ccusage .

# Run locally
docker run -d \
  --name ccusage \
  -p 9001:9001 \
  -v ~/.claude:/claude-data:ro \
  -e CLAUDE_DATA_DIR=/claude-data \
  ccusage
```

### Push to Docker Hub

```bash
docker login

docker tag ccusage vikas9dev/ccusage:latest
docker tag ccusage vikas9dev/ccusage:1.0.0

docker push vikas9dev/ccusage:latest
docker push vikas9dev/ccusage:1.0.0
```

### Multi-platform build (Intel + Apple Silicon)

```bash
# One-time setup
docker buildx create --use --name multiarch

# Build and push both amd64 + arm64 in one command
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t vikas9dev/ccusage:latest \
  -t vikas9dev/ccusage:1.0.0 \
  --push .
```

---

## How It Works

ccusage reads three local files written by Claude Code:

| File | What it provides |
|------|-----------------|
| `~/.claude/history.jsonl` | Per-message project + session timestamps |
| `~/.claude/projects/<dir>/*.jsonl` | Token usage per session (deduplicated by message ID) |
| `~/.claude/stats-cache.json` | All-time global aggregates (sessions, messages, model totals) |

Cost is computed using Anthropic's public API pricing and shown as **API equivalent cost** — what your usage would cost on pay-per-token. If you're on a flat subscription plan, your actual charge is your monthly fee.

---

## Data Sources & Pricing

| Model | Input | Output | Cache Write | Cache Read |
|-------|-------|--------|-------------|------------|
| Claude Opus 4 | $15 | $75 | $18.75 | $1.50 |
| Claude Sonnet 4.6 | $3 | $15 | $3.75 | $0.30 |
| Claude Haiku 4.5 | $0.80 | $4 | $1.00 | $0.08 |

*Prices per million tokens.*

---

## License

MIT
