"""Run the VedicMath MCP server over stdio: ``python -m backend.mcp_server``."""

import contextlib
import sys

# Over stdio, stdout carries the MCP protocol. The vendored vedicpy library
# prints a line when imported (vendor/vedicpy/squareroot.py), so send any
# import-time output to stderr instead.
with contextlib.redirect_stdout(sys.stderr):
    from .server import build_server

if __name__ == "__main__":
    build_server().run(transport="stdio")
