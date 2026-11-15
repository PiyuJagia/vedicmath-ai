"""In-process request limits for live coach turns (Gemini cost control).

A sliding-window counter per key. It is per server process and resets on
restart, which fits the single Render instance; it is not a substitute for
authentication.
"""

from __future__ import annotations

import os
import threading
import time
from collections import deque


def _env_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, "") or default))
    except ValueError:
        return default


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, now: float | None = None) -> bool:
        """Record a hit for key and return False when it exceeds the limit."""
        t = time.monotonic() if now is None else now
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and t - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(t)
            if len(self._hits) > 10_000:
                # Drop idle keys so the map cannot grow without bound.
                for stale in [k for k, v in self._hits.items() if not v or t - v[-1] >= self.window]:
                    del self._hits[stale]
            return True


# Defaults: a learner session gets 20 live turns a minute; one client IP gets 60.
SESSION_LIMITER = SlidingWindowLimiter(_env_int("COACH_CHAT_PER_SESSION_PER_MIN", 20), 60.0)
IP_LIMITER = SlidingWindowLimiter(_env_int("COACH_CHAT_PER_IP_PER_MIN", 60), 60.0)
