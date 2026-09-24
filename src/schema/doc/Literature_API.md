# Hirn Literature API

REST API for the Hirn Literature biomedical Q&A agent. It answers biomedical
questions by querying a Neo4j knowledge graph (263M+ biomedical terms, 14.6M+
relationships) and retrieving PubMed/PMC literature, returning grounded,
cited answers with genuine token usage.

---

## Base URL

```
https://jieliulab3.dcmb.med.umich.edu/hirn-literature-api
```

Health check:

```
GET https://jieliulab3.dcmb.med.umich.edu/hirn-literature-api/health
```

The reverse proxy forwards to the local service on port `8006`. All paths below
are relative to the base URL.

---

## Conventions

- All request and response bodies are JSON (`Content-Type: application/json`),
  except Server-Sent Events (SSE) streams.
- **SSE streams** return `Content-Type: text/event-stream`. Each event is a
  `data: <json>\n\n` line. A `: keepalive` comment line is sent periodically
  during long agent runs to keep the connection alive — ignore it.
- **Token usage** is reported as `{ "prompt_tokens", "completion_tokens",
  "total_tokens" }` and reflects the genuine token counts consumed by the
  agent's LLM calls.
- Interactive API docs (Swagger UI) are available at `/docs`.

---

## Endpoint summary

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/stream` | Streaming answer with references + trajectory + usage |
| POST | `/apps/{app}/users/{user}/batch` | Run the agent over many items in parallel |
| POST | `/apps/{app}/users/{user}/sessions` | Create a session |
| GET | `/apps/{app}/users/{user}/sessions` | List sessions |
| GET | `/apps/{app}/users/{user}/sessions/{session}` | Get a session |
| DELETE | `/apps/{app}/users/{user}/sessions/{session}` | Delete a session |
| POST | `/apps/{app}/users/{user}/sessions/{session}/chat` | Chat (non-streaming) |
| POST | `/apps/{app}/users/{user}/sessions/{session}/chat/stream` | Chat (SSE streaming) |
| GET | `/apps/{app}/users/{user}/sessions/{session}/messages` | Conversation history |
| POST | `/apps/{app}/users/{user}/sessions/{session}/rewind` | Undo a turn |

---

## Health

### `GET /health`

```bash
curl https://jieliulab3.dcmb.med.umich.edu/hirn-literature-api/health
```

**200 OK**
```json
{ "status": "healthy", "timestamp": "2026-06-26T02:02:34.468243" }
```

---

## Streaming answer

### `POST /stream`

Streams the answer plus structured **references** (with evidence), a reasoning
**trajectory**, and token **usage**.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | **yes** | The user's question. |
| `messages` | array | no | Prior conversation messages (default `[]`). |
| `max_articles` | integer | no | Max references to return (default `30`). |
| `session_id` | string | no | Reuse a session for multi-turn context. |

```bash
curl -N -X POST https://jieliulab3.dcmb.med.umich.edu/hirn-literature-api/stream \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{ "question": "In under 60 words, what is the role of ZnT8/SLC30A8 in type 1 diabetes?", "max_articles": 10 }'
```

Intermediate events report progress as `{"step": "...", "content": "..."}`. The
final event:

```json
{
  "step": "Complete",
  "response": "ZnT8 (SLC30A8) is a zinc transporter ...",
  "references": [
    {
      "pmid": "38743124",
      "title": "…",
      "url": "https://pubmed.ncbi.nlm.nih.gov/38743124/",
      "n_citation": 12,
      "date": 2024,
      "journal": "…",
      "authors": ["…"],
      "evidence": [{ "quote": "…", "context_type": "abstract" }]
    }
  ],
  "trajectory": [ { "phase": "Searching for relevant articles", "actions": [ … ] } ],
  "execution_time": 18.4,
  "session_id": "stream_ab12cd34",
  "invocation_id": "…",
  "usage": { "prompt_tokens": 1300, "completion_tokens": 420, "total_tokens": 1720 },
  "done": true
}
```

---

## Batch endpoint

### `POST /apps/{app}/users/{user}/batch`

Run the agent over a list of items in parallel, substituting each item into a
prompt template. Results stream back via SSE in completion order.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | array of strings | **yes** | Items to process (1–500). |
| `prompt_template` | string | **yes** | Prompt with a `{item}` placeholder. |
| `concurrency` | integer | no | Parallel runs, 1–50 (default `10`). |

```bash
curl -N -X POST https://jieliulab3.dcmb.med.umich.edu/hirn-literature-api/apps/hirn/users/u1/batch \
  -H 'Content-Type: application/json' \
  -d '{
        "items": ["TP53", "BRCA1", "EGFR"],
        "prompt_template": "Summarize the role of {item} in cancer.",
        "concurrency": 3
      }'
```

**SSE**: one event per finished item, then a final summary:
```
data: {"index": 1, "item": "BRCA1", "status": "done", "response": "…"}
data: {"index": 0, "item": "TP53",  "status": "done", "response": "…"}
data: {"index": 2, "item": "EGFR",  "status": "done", "response": "…"}
data: {"status": "complete", "total": 3, "succeeded": 3}
```

---

## Session-scoped endpoints

`{app}` and `{user}` are caller-chosen identifiers (e.g. `hirn` / `user123`).
Sessions persist conversation history for multi-turn chat.

### `POST /apps/{app}/users/{user}/sessions` — create

**Request body** (all optional)
```json
{ "session_id": "my-session", "state": {} }
```
**200 OK**
```json
{ "id": "my-session", "app_name": "hirn", "user_id": "user123", "created_at": "2026-06-26T02:10:00Z" }
```

### `GET /apps/{app}/users/{user}/sessions` — list

Query params: `limit` (default 100, max 1000), `offset` (default 0).
```json
{ "sessions": [ { "id": "…", "message_count": 4, "created_at": "…", "updated_at": "…", "state": {} } ], "total": 1 }
```

### `GET /apps/{app}/users/{user}/sessions/{session}` — get

Returns a single session (same shape as a list entry). `404` if not found.

### `DELETE /apps/{app}/users/{user}/sessions/{session}` — delete

```json
{ "status": "deleted", "session_id": "my-session" }
```

### `POST /apps/{app}/users/{user}/sessions/{session}/chat` — non-streaming chat

**Request body**
```json
{ "message": "What is the role of TP53 in cancer?" }
```
**200 OK**
```json
{
  "session_id": "my-session",
  "response": "TP53 is a tumor suppressor gene ...",
  "events": [ … ],
  "state": { … },
  "usage": { "prompt_tokens": 1300, "completion_tokens": 420, "total_tokens": 1720 }
}
```

### `POST /apps/{app}/users/{user}/sessions/{session}/chat/stream` — streaming chat

Same request body as above. Returns an SSE stream of agent events, ending with:
```
event: done
data: {"status": "complete"}
```

### `GET /apps/{app}/users/{user}/sessions/{session}/messages` — history

Query param: `limit` (default 100, max 1000).
```json
{ "session_id": "my-session", "messages": [ { "id": 1, "role": "user", "content": "…", "timestamp": "…", "invocation_id": "…" } ], "total": 1 }
```

### `POST /apps/{app}/users/{user}/sessions/{session}/rewind` — undo a turn

Removes a given invocation and everything after it (for "edit message" /
"regenerate" UX). Then re-submit a message via `/chat` or `/chat/stream`.

**Request body**
```json
{ "invocation_id": "e-1234abcd" }
```
**200 OK**
```json
{
  "session_id": "my-session",
  "rewound_invocation_ids": ["e-1234abcd"],
  "remaining_message_count": 2,
  "messages": [ … ]
}
```

---

## Error responses

| Status | Meaning |
|--------|---------|
| `400` | Bad request. |
| `404` | Session not found. |
| `422` | Request validation error (malformed body). |
| `500` | Internal server error. |

Error bodies follow:
```json
{ "detail": "Session not found" }
```

---

## Notes

- Answers are grounded in retrieved literature and cite PubMed articles inline
  as `[PMID](https://pubmed.ncbi.nlm.nih.gov/PMID)`.
- Token usage in every response reflects genuine LLM token consumption.
- The service answers questions related to biomedical research and the Hirn
  Literature knowledge base; unrelated questions are politely declined.
****


