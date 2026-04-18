import json
import mimetypes
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

def _load_env(env_file: str):
    if not os.path.exists(env_file):
        return
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, val = line.partition('=')
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val


_ENV_FILE = os.path.join(os.path.dirname(__file__), '..', '.env')
_load_env(os.path.abspath(_ENV_FILE))

import data_parser  # noqa: E402 — import after env is loaded

VERSION    = os.environ.get('APP_VERSION', 'dev')
PORT       = int(os.environ.get('BACKEND_PORT', 9001))
STATIC_DIR = os.environ.get('STATIC_DIR', '')

TTL    = 60
_cache = {}   # key: str(days) → {data, ts, history_mtime, projects_mtime}


def _get_mtimes():
    claude_dir   = data_parser._get_claude_dir()
    history_file = os.path.join(claude_dir, 'history.jsonl')
    projects_dir = os.path.join(claude_dir, 'projects')
    h = os.path.getmtime(history_file) if os.path.exists(history_file) else 0
    p = 0
    if os.path.isdir(projects_dir):
        for root, _, files in os.walk(projects_dir):
            for f in files:
                if f.endswith('.jsonl'):
                    try:
                        p = max(p, os.path.getmtime(os.path.join(root, f)))
                    except OSError:
                        pass
    return h, p


def get_cached(days=None, force=False):
    key   = str(days)
    entry = _cache.get(key, {})
    h_mtime, p_mtime = _get_mtimes()
    now   = time.time()
    stale = (
        force or
        not entry or
        (now - entry.get('ts', 0)) > TTL or
        h_mtime != entry.get('history_mtime') or
        p_mtime != entry.get('projects_mtime')
    )
    if stale:
        _cache[key] = {
            'data':          data_parser.get_full_dashboard_data(days=days),
            'ts':            now,
            'history_mtime': h_mtime,
            'projects_mtime': p_mtime,
        }
    return _cache[key]['data']


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, data, status=200):
        body = json.dumps(data, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path: str):
        mime, _ = mimetypes.guess_type(file_path)
        mime = mime or 'application/octet-stream'
        with open(file_path, 'rb') as f:
            body = f.read()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path
        qs     = parse_qs(parsed.query)

        days = None
        if 'days' in qs:
            try:
                days = float(qs['days'][0])
            except (ValueError, IndexError):
                pass

        try:
            if path == '/api/dashboard':
                self._send_json(get_cached(days=days))

            elif path == '/api/refresh':
                self._send_json(get_cached(days=days, force=True))

            elif path == '/health':
                self._send_json({
                    'status':          'ok',
                    'version':         VERSION,
                    'cached_keys':     list(_cache.keys()),
                    'claude_data_dir': data_parser._get_claude_dir(),
                    'port':            PORT,
                })

            elif STATIC_DIR:
                rel       = path.lstrip('/')
                candidate = os.path.join(STATIC_DIR, rel)
                if rel and os.path.isfile(candidate):
                    self._send_file(candidate)
                else:
                    index = os.path.join(STATIC_DIR, 'index.html')
                    if os.path.isfile(index):
                        self._send_file(index)
                    else:
                        self._send_json({'error': 'not found'}, 404)

            else:
                self._send_json({'error': 'not found'}, 404)

        except Exception as e:
            self._send_json({'error': str(e)}, 500)


def _prewarm():
    try:
        get_cached(days=None)
        get_cached(days=7)
        get_cached(days=30)
    except Exception:
        pass

if __name__ == '__main__':
    claude_dir = data_parser._get_claude_dir()
    print('Claude Usage Dashboard — API server')
    print(f'  Version:         {VERSION}')
    print(f'  Port:            {PORT}')
    print(f'  Claude data dir: {claude_dir}')
    print(f'  Static dir:      {STATIC_DIR or "(dev mode — Vite on 5173)"}')
    threading.Thread(target=_prewarm, daemon=True).start()
    server = ThreadingHTTPServer(('', PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
