# Vedic Maths knowledge pack (Phase 7C)

Curated, version-controlled educational knowledge for Rishi.

- **Engines** decide what is mathematically correct.
- **This pack** explains why methods work and how to teach them.
- **Rishi** communicates using retrieved approved excerpts + tools.

## Layout

- `concepts/` — reusable foundations (place value, complements, carrying, …)
- `sutras/` — per-sutra overviews, principles, misconceptions, applicability
- `sources/references.json` — document metadata (no wholesale textbook text)
- `retrieval.py` — exact + lexical search over `approved_for_agent` entries
- `validation.py` — schema + engine example checks

## Feature flag

```text
VEDIC_KNOWLEDGE_RAG=1
```

When unset, `search_vedic_math_knowledge` returns disabled and production coaching stays on pre-7C behavior for retrieval.

## Rebuild

```bash
python -m backend.knowledge._build_pack
```

Only run when intentionally regenerating JSON. Prefer editing JSON or the builder, then validate with pytest.
