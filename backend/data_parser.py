import json
import os
import time
from datetime import datetime, timezone, timedelta


def _get_claude_dir() -> str:
    raw = os.environ.get('CLAUDE_DATA_DIR', '~/.claude')
    return os.path.expanduser(raw)


PRICING = {
    'claude-opus-4-6':           {'input': 15.0,  'output': 75.0,  'cache_creation': 18.75, 'cache_read': 1.50},
    'claude-sonnet-4-6':         {'input': 3.0,   'output': 15.0,  'cache_creation': 3.75,  'cache_read': 0.30},
    'claude-haiku-4-5-20251001': {'input': 0.80,  'output': 4.00,  'cache_creation': 1.00,  'cache_read': 0.08},
}
DEFAULT_PRICING = {'input': 3.0, 'output': 15.0, 'cache_creation': 3.75, 'cache_read': 0.30}


def days_to_cutoff_iso(days) -> str | None:
    if days is None:
        return None
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=float(days))
    return cutoff.isoformat()


def compute_cost(tokens_by_model: dict) -> float:
    total = 0.0
    for model, t in tokens_by_model.items():
        p = PRICING.get(model, DEFAULT_PRICING)
        total += (
            t.get('input', 0) * p['input'] +
            t.get('output', 0) * p['output'] +
            t.get('cache_creation', 0) * p['cache_creation'] +
            t.get('cache_read', 0) * p['cache_read']
        ) / 1_000_000
    return round(total, 4)


def parse_history(cutoff_ms: int | None = None) -> dict:
    result = {}
    history_file = os.path.join(_get_claude_dir(), 'history.jsonl')
    if not os.path.exists(history_file):
        return result

    with open(history_file, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            proj = entry.get('project')
            if not proj:
                continue

            ts = entry.get('timestamp', 0)
            session_id = entry.get('sessionId', '')

            if proj not in result:
                result[proj] = {'messages': 0, 'sessions': set(), 'first_ts': ts, 'last_ts': ts}

            r = result[proj]
            if ts and ts < r['first_ts']:
                r['first_ts'] = ts
            if ts and ts > r['last_ts']:
                r['last_ts'] = ts

            in_period = not cutoff_ms or (ts and ts >= cutoff_ms)
            if in_period:
                r['messages'] += 1
                if session_id:
                    r['sessions'].add(session_id)

    for proj in result:
        result[proj]['sessions'] = len(result[proj]['sessions'])

    return result


def build_dir_to_path_map(history_paths: set) -> dict:
    projects_dir = os.path.join(_get_claude_dir(), 'projects')
    if not os.path.isdir(projects_dir):
        return {}

    mapping = {}
    for dirname in os.listdir(projects_dir):
        if not os.path.isdir(os.path.join(projects_dir, dirname)):
            continue
        matched = False
        for real_path in history_paths:
            if real_path.replace('/', '-') == dirname:
                mapping[dirname] = real_path
                matched = True
                break
        if not matched:
            candidate = dirname
            if candidate.startswith('-'):
                candidate = '/' + candidate[1:]
            mapping[dirname] = candidate
    return mapping


def _iter_project_jsonls(project_dir: str):
    try:
        items = os.listdir(project_dir)
    except PermissionError:
        return

    for item in items:
        item_path = os.path.join(project_dir, item)
        if item.endswith('.jsonl') and os.path.isfile(item_path):
            yield item_path
        elif os.path.isdir(item_path):
            subagents_dir = os.path.join(item_path, 'subagents')
            if os.path.isdir(subagents_dir):
                for sub_file in os.listdir(subagents_dir):
                    if sub_file.endswith('.jsonl'):
                        yield os.path.join(subagents_dir, sub_file)


def _accumulate_tokens(tokens: dict, usage: dict, model: str):
    inp = usage.get('input_tokens', 0) or 0
    out = usage.get('output_tokens', 0) or 0
    cc  = usage.get('cache_creation_input_tokens', 0) or 0
    cr  = usage.get('cache_read_input_tokens', 0) or 0

    tokens['input']          += inp
    tokens['output']         += out
    tokens['cache_creation'] += cc
    tokens['cache_read']     += cr

    if model not in tokens['by_model']:
        tokens['by_model'][model] = {'input': 0, 'output': 0, 'cache_creation': 0, 'cache_read': 0}
    m = tokens['by_model'][model]
    m['input']          += inp
    m['output']         += out
    m['cache_creation'] += cc
    m['cache_read']     += cr


def parse_project_tokens(cutoff_iso: str | None = None) -> dict:
    """Parse per-project JSONL session files. Filters by entry timestamp if cutoff_iso given."""
    projects_dir = os.path.join(_get_claude_dir(), 'projects')
    if not os.path.isdir(projects_dir):
        return {}

    result = {}
    for proj_dirname in os.listdir(projects_dir):
        proj_path = os.path.join(projects_dir, proj_dirname)
        if not os.path.isdir(proj_path):
            continue

        seen_ids = set()
        tokens = {'input': 0, 'output': 0, 'cache_creation': 0, 'cache_read': 0, 'by_model': {}, 'daily': {}}
        has_data = False
        latest_ts_iso = None

        for jsonl_path in _iter_project_jsonls(proj_path):
            try:
                with open(jsonl_path, 'r', encoding='utf-8', errors='replace') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            entry = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        entry_ts = entry.get('timestamp', '')
                        if entry_ts and (latest_ts_iso is None or entry_ts > latest_ts_iso):
                            latest_ts_iso = entry_ts

                        if cutoff_iso:
                            if not entry_ts or entry_ts < cutoff_iso:
                                continue

                        msg = entry.get('message', {})
                        if not isinstance(msg, dict):
                            continue
                        usage = msg.get('usage')
                        msg_id = msg.get('id')
                        model = msg.get('model', 'unknown')

                        if not usage or not msg_id or model in ('<synthetic>', 'unknown'):
                            continue
                        if msg_id in seen_ids:
                            continue
                        seen_ids.add(msg_id)
                        has_data = True
                        _accumulate_tokens(tokens, usage, model)
                        # accumulate per-day tokens for cost-per-day chart
                        if entry_ts:
                            try:
                                date_str = entry_ts[:10]
                                if date_str not in tokens['daily']:
                                    tokens['daily'][date_str] = {}
                                d = tokens['daily'][date_str]
                                if model not in d:
                                    d[model] = {'input': 0, 'output': 0, 'cache_creation': 0, 'cache_read': 0}
                                dm = d[model]
                                dm['input']          += usage.get('input_tokens', 0) or 0
                                dm['output']         += usage.get('output_tokens', 0) or 0
                                dm['cache_creation'] += usage.get('cache_creation_input_tokens', 0) or 0
                                dm['cache_read']     += usage.get('cache_read_input_tokens', 0) or 0
                            except Exception:
                                pass

            except (OSError, IOError):
                continue

        tokens['has_data'] = has_data
        tokens['latest_ts_iso'] = latest_ts_iso
        result[proj_dirname] = tokens

    return result


def _dominant_model(by_model: dict) -> str | None:
    if not by_model:
        return None
    return max(by_model, key=lambda m: by_model[m].get('output', 0))


def build_hourly_from_history(cutoff_ms: int | None = None) -> list:
    """Group history.jsonl messages by hour for sub-day charts."""
    history_file = os.path.join(_get_claude_dir(), 'history.jsonl')
    if not os.path.exists(history_file):
        return []

    hour_data = {}
    with open(history_file, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            ts = entry.get('timestamp', 0)
            if not ts:
                continue
            if cutoff_ms and ts < cutoff_ms:
                continue
            try:
                dt = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
                hour_key = dt.strftime('%Y-%m-%dT%H:00')
            except (OSError, OverflowError, ValueError):
                continue
            session_id = entry.get('sessionId', '')
            if hour_key not in hour_data:
                hour_data[hour_key] = {'messageCount': 0, 'sessions': set()}
            hour_data[hour_key]['messageCount'] += 1
            if session_id:
                hour_data[hour_key]['sessions'].add(session_id)

    return sorted(
        [{'hour': h, 'messageCount': v['messageCount'], 'sessionCount': len(v['sessions'])}
         for h, v in hour_data.items()],
        key=lambda x: x['hour']
    )


def build_daily_from_history(cutoff_ms: int | None = None) -> list:
    """Build daily activity from history.jsonl — always fresh, unlike stats-cache."""
    history_file = os.path.join(_get_claude_dir(), 'history.jsonl')
    if not os.path.exists(history_file):
        return []

    day_data = {}
    with open(history_file, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            ts = entry.get('timestamp', 0)
            if not ts:
                continue
            if cutoff_ms and ts < cutoff_ms:
                continue

            try:
                date_str = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime('%Y-%m-%d')
            except (OSError, OverflowError, ValueError):
                continue

            session_id = entry.get('sessionId', '')
            if date_str not in day_data:
                day_data[date_str] = {'messageCount': 0, 'sessions': set()}
            day_data[date_str]['messageCount'] += 1
            if session_id:
                day_data[date_str]['sessions'].add(session_id)

    return sorted(
        [{'date': d, 'messageCount': v['messageCount'], 'sessionCount': len(v['sessions'])}
         for d, v in day_data.items()],
        key=lambda x: x['date']
    )


def parse_stats_cache() -> dict:
    stats_file = os.path.join(_get_claude_dir(), 'stats-cache.json')
    if not os.path.exists(stats_file):
        return {}
    with open(stats_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def _ts_to_iso(ts_ms) -> str:
    if not ts_ms:
        return None
    try:
        return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).isoformat()
    except (OSError, OverflowError, ValueError):
        return None


def get_full_dashboard_data(days=None) -> dict:
    cutoff_iso = days_to_cutoff_iso(days)
    cutoff_ms = int((datetime.now(tz=timezone.utc) - timedelta(days=float(days))).timestamp() * 1000) if days else None

    history = parse_history(cutoff_ms=cutoff_ms)
    stats = parse_stats_cache()
    project_tokens = parse_project_tokens(cutoff_iso=cutoff_iso)

    dir_to_path = build_dir_to_path_map(set(history.keys()))
    path_to_dir = {v: k for k, v in dir_to_path.items()}

    # Include projects from project_tokens that history may not know about
    for encoded_dir, tok in project_tokens.items():
        real_path = dir_to_path.get(encoded_dir)
        if real_path and real_path not in path_to_dir:
            dir_to_path[encoded_dir] = real_path
            path_to_dir[real_path] = encoded_dir

    projects = []
    all_paths = set(history.keys()) | set(dir_to_path.values())

    for real_path in sorted(all_paths):
        encoded_dir = path_to_dir.get(real_path)
        h = history.get(real_path, {})
        tok = project_tokens.get(encoded_dir, {}) if encoded_dir else {}

        by_model = tok.get('by_model', {})
        cost = compute_cost(by_model) if tok.get('has_data') else None

        # Use the most recent timestamp across history.jsonl and project JSONL entries
        candidates = [_ts_to_iso(h.get('last_ts')), tok.get('latest_ts_iso')]
        last_active = max((c for c in candidates if c), default=None)
        msgs  = h.get('messages', 0)
        sess  = h.get('sessions', 0)
        projects.append({
            'path': real_path,
            'display_name': os.path.basename(real_path) or real_path,
            'messages': msgs,
            'sessions': sess,
            'avg_msg_per_session': round(msgs / sess, 1) if sess else 0,
            'dominant_model': _dominant_model(by_model),
            'first_active': _ts_to_iso(h.get('first_ts')),
            'last_active': last_active,
            'tokens': {
                'input':          tok.get('input', 0),
                'output':         tok.get('output', 0),
                'cache_creation': tok.get('cache_creation', 0),
                'cache_read':     tok.get('cache_read', 0),
            },
            'cost_usd': cost,
        })

    projects.sort(key=lambda p: p['messages'], reverse=True)

    # Aggregate period-filtered model_usage from project_tokens
    global_by_model = {}
    for tok in project_tokens.values():
        for model, t in tok.get('by_model', {}).items():
            if model not in global_by_model:
                global_by_model[model] = {'input': 0, 'output': 0, 'cache_creation': 0, 'cache_read': 0}
            m = global_by_model[model]
            m['input']          += t.get('input', 0)
            m['output']         += t.get('output', 0)
            m['cache_creation'] += t.get('cache_creation', 0)
            m['cache_read']     += t.get('cache_read', 0)

    model_usage = {}
    total_period_cost = 0.0
    for model, t in global_by_model.items():
        p = PRICING.get(model, DEFAULT_PRICING)
        cost = round((
            t['input'] * p['input'] +
            t['output'] * p['output'] +
            t['cache_creation'] * p['cache_creation'] +
            t['cache_read'] * p['cache_read']
        ) / 1_000_000, 2)
        total_period_cost += cost
        model_usage[model] = {
            'input_tokens':          t['input'],
            'output_tokens':         t['output'],
            'cache_creation_tokens': t['cache_creation'],
            'cache_read_tokens':     t['cache_read'],
            'cost_usd':              cost,
        }

    # All-time cost from stats-cache for the summary card
    stats_model_raw = stats.get('modelUsage', {})
    alltime_cost = 0.0
    for model, u in stats_model_raw.items():
        p = PRICING.get(model, DEFAULT_PRICING)
        alltime_cost += (
            (u.get('inputTokens', 0) or 0) * p['input'] +
            (u.get('outputTokens', 0) or 0) * p['output'] +
            (u.get('cacheCreationInputTokens', 0) or 0) * p['cache_creation'] +
            (u.get('cacheReadInputTokens', 0) or 0) * p['cache_read']
        ) / 1_000_000

    # Build daily cost map from per-project daily token data
    global_daily = {}
    for tok in project_tokens.values():
        for date_str, day_by_model in tok.get('daily', {}).items():
            if date_str not in global_daily:
                global_daily[date_str] = 0.0
            global_daily[date_str] += compute_cost(day_by_model)

    daily_activity = build_daily_from_history(cutoff_ms=cutoff_ms)
    for entry in daily_activity:
        entry['cost_usd'] = round(global_daily.get(entry['date'], 0.0), 4)

    hourly_activity = build_hourly_from_history(cutoff_ms=cutoff_ms) if days and days <= 2 else []

    return {
        'summary': {
            'total_projects':  len(projects),
            'total_sessions':  stats.get('totalSessions', 0),
            'total_messages':  stats.get('totalMessages', 0),
            'total_cost_usd':  round(alltime_cost, 2),
            'period_cost_usd': round(alltime_cost, 2) if days is None else round(total_period_cost, 2),
            'data_freshness':  int(time.time() * 1000),
        },
        'projects':          projects,
        'daily_activity':    daily_activity,
        'hourly_activity':   hourly_activity,
        'model_usage':       model_usage,
        'hour_distribution': stats.get('hourCounts', {}),
    }


if __name__ == '__main__':
    import sys
    days_arg = float(sys.argv[1]) if len(sys.argv) > 1 else None
    data = get_full_dashboard_data(days=days_arg)
    print(json.dumps(data, indent=2, default=str))
