"""Simple in-memory sliding-window rate limiter.

Single-process er jonno. Production e multiple instance thakle Redis-based limiter use korun.
"""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_hits: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, limit_per_minute: int):
    def dependency(request: Request):
        key = f"{bucket}:{_client_ip(request)}"
        now = time.monotonic()
        window = _hits[key]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= limit_per_minute:
            raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
        window.append(now)

    return dependency


def reset_rate_limits() -> None:
    _hits.clear()
