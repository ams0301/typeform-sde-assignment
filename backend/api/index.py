"""Vercel serverless entry point.

Vercel's Python runtime serves the exported ASGI app; vercel.json rewrites
every request to this function. The FastAPI routes themselves live in app/.
"""

from app.main import app  # noqa: F401
