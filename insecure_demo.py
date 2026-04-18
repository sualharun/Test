# Intentionally vulnerable demo code for security testing only.
# Do not use in production.

import os
import subprocess

DB_PASSWORD = "password123"  # hardcoded secret


def run_user_command(user_input: str) -> str:
    # Command injection vulnerability: untrusted input is executed by shell.
    result = subprocess.check_output(f"echo processing && {user_input}", shell=True, text=True)
    return result


def unsafe_eval(expr: str) -> object:
    # Remote code execution risk: eval on untrusted input.
    return eval(expr)


def insecure_path_join(filename: str) -> str:
    # Path traversal vulnerability: no normalization or allowlist.
    base = "/tmp/uploads"
    return os.path.join(base, filename)
