"""Shared helpers for writing JSON outputs with consistent metadata envelope."""

import json
import os
from datetime import datetime, timezone


def wrap(data, source=None, source_date=None, **extra):
    """Wrap output payload with generated_at + source metadata.

    Shape: {generated_at, source, source_date, data, ...extra}
    """
    envelope = {
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'source': source,
        'source_date': source_date,
        'data': data,
    }
    envelope.update(extra)
    return envelope


def write_json(path, data, source=None, source_date=None, **extra):
    """Write a JSON file wrapped with metadata."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    envelope = wrap(data, source=source, source_date=source_date, **extra)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(envelope, f, ensure_ascii=False, indent=2)
    return envelope
