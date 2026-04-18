#!/bin/bash
echo "Stopping Claude Usage Dashboard..."
pkill -f "python3 server.py" 2>/dev/null && echo "  Backend stopped"  || echo "  Backend was not running"
pkill -f "vite --port"       2>/dev/null && echo "  Frontend stopped" || echo "  Frontend was not running"
