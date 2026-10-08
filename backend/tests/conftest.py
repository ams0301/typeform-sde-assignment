"""Test configuration: isolated SQLite database per test session.

The DATABASE_URL env var must be set before any `app` module is imported,
because app.database.py reads it at import time.
"""

import os
import pathlib
import sys
import tempfile

BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

_TMP_DIR = tempfile.mkdtemp(prefix="typeform_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_TMP_DIR, 'test.db').replace(os.sep, '/')}"
