#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Claude Usage Dashboard..."

cd "$SCRIPT_DIR/backend"
nohup python3 server.py > "$SCRIPT_DIR/backend.log" 2>&1 &

cd "$SCRIPT_DIR/frontend"
nohup npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &

echo "  Backend  : http://localhost:9001"
echo "  Dashboard: http://localhost:5173"
echo "  Logs     : backend.log / frontend.log"
