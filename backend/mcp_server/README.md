# VedicMath MCP server

An optional [Model Context Protocol](https://modelcontextprotocol.io/) server
that exposes the same deterministic maths tools Rishi uses, so any MCP client
(Claude, Gemini CLI, Cursor, a future teacher dashboard) can call the Sutra
engines. The web app and the Rishi agent don't use it, and Render doesn't
install it.

## Tools

| Tool | What it returns |
|------|-----------------|
| `calculate_sutra` | Result, teaching steps and a `calculation_id` |
| `get_lesson` | Teaching steps and animation events |
| `check_practice_answer` | `correct` / `incorrect` / `invalid` and a mistake tag; the correct value only with `reveal_correct_answer=true` |
| `get_progressive_hint` | Level-gated hint text and the values it must not reveal |
| `search_vedic_math_knowledge` | Knowledge-pack excerpts (only when `VEDIC_KNOWLEDGE_RAG=1`) |

Every number comes from the Python engines. The server adds no maths of its own.

## Run it

```powershell
pip install -r backend\mcp_server\requirements.txt
python -m backend.mcp_server
```

It speaks MCP over stdio. To add it to an MCP client, point the client at that
command, run from the repository root. For example, in a client's JSON config:

```json
{
  "mcpServers": {
    "vedicmath": {
      "command": "python",
      "args": ["-m", "backend.mcp_server"],
      "cwd": "C:/path/to/vedicmath-ai"
    }
  }
}
```

No API keys are needed: the tools don't call Gemini.

## Tests

```powershell
python -m pytest backend/tests/test_mcp_server.py
```

The tests are skipped when the `mcp` package isn't installed.
