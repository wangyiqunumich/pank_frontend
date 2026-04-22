# PlannerAgent API — Frontend Integration Guide

Complete reference for all HTTP endpoints exposed by `server.py`. Aimed at frontend developers integrating the biomedical knowledge-graph Q&A assistant.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Core Concepts](#2-core-concepts)
3. [System Endpoints](#3-system-endpoints)
   - `GET /` — API info
   - `GET /health` — health check
4. [Chat Endpoints (Multi-Turn Dialogue)](#4-chat-endpoints-multi-turn-dialogue)
   - `POST /chat/start` — start a chat session
   - `POST /chat/message` — send a follow-up (smart-routed)
   - `POST /chat/plan/confirm` — confirm a pending plan
   - `POST /chat/revise` — revise the last confirmed plan
   - `GET /chat/history` — fetch conversation history
   - `DELETE /chat/end` — end a chat session
5. [Plan Endpoints (Standalone Manual Review)](#5-plan-endpoints-standalone-manual-review)
   - `POST /plan/start`, `POST /plan/revise`, `POST /plan/confirm`
6. [Data Models Reference](#6-data-models-reference)
7. [Smart Router — Deep Dive](#7-smart-router--deep-dive)
8. [Session Lifecycle & TTLs](#8-session-lifecycle--ttls)
9. [Parsing the Final Answer](#9-parsing-the-final-answer)
10. [Error Handling](#10-error-handling)
11. [Full Flow Examples](#11-full-flow-examples)
12. [Frontend UX Recommendations](#12-frontend-ux-recommendations)

---

## 1. Quick Start

**Production Base URL:** `https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent`

All examples in this doc use the production URL. When developing locally, substitute `http://localhost:<PORT>` (default `8080`; override with the `PORT` env var or CLI arg `python3 server.py 8001`). All endpoints below are relative to the base URL — e.g. `POST /chat/start` is `POST https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/start`.

**Two integration paths:**

| Path | When to use | Pattern |
|---|---|---|
| **Chat** (`/chat/*`) | Multi-turn conversational UX (ChatGPT-style) | `chat/start` → `chat/plan/confirm` → many `chat/message` (+ `chat/plan/confirm` on new-query rounds) → `chat/end` |
| **Plan** (`/plan/*`) | Single-shot query with explicit plan review UX | `plan/start` → (optional `plan/revise`) → `plan/confirm` |

Both use the same underlying pipelines. Chat endpoints additionally maintain conversation history and auto-route follow-ups to a fast path. `/chat/start` returns a plan for user review by default; pass `auto_confirm: true` to run the first round in one shot.

**CORS:** currently `allow_origins=["*"]` — tighten in production.

**Timeouts:** a single `new_query` round can take **30–90 s** (plan + multi-source execution + format agent). Set frontend fetch timeouts to ≥ **180 s**.

---

## 2. Core Concepts

### 2.1 Rigor mode
The server defaults to **rigor mode** (`rigor=True`). In rigor mode the system uses evidence-only format/reasoning agents that refuse to speculate or hallucinate. Unless you have a specific reason, keep `rigor: true`.

### 2.2 Literature search (HIRN)
Each plan round can optionally run a parallel HIRN literature search (scientific abstracts). Controlled by `use_literature` (default `true`). Set to `false` for faster KG-only answers.

### 2.3 Chat session vs plan session
- A **ChatSession** persists the full dialogue history and the most recently confirmed query state. Long-lived, 1h idle TTL.
- A **PlanSession** represents a single plan awaiting user review. Short-lived, 30-min TTL. Internally reused by the chat flow when the router decides a new query needs explicit review.

### 2.4 The smart router
When you call `POST /chat/message`, a Haiku classifier decides one of two routes:
- **`follow_up`** — the question extends the previous turn. Reuses the session's stored retrieved data. Fast (~5–25 s). No plan review.
- **`new_query`** — the question is genuinely new. Runs the full planner, creates a pending `PlanSession`, returns the plan for the user to review. You must then call `/chat/plan/confirm` to complete the round.

See [§7](#7-smart-router--deep-dive) for details.

### 2.5 History compression
The full dialogue is sent to the format agent for `follow_up` rounds. If the history exceeds ~25 KB, older turns are summarised via Haiku before being passed. The API signals this via `history_compressed: true` in the response — show a visual indicator to the user.

---

## 3. System Endpoints

### 3.1 `GET /` — API info

Returns a JSON descriptor of the service and available endpoints.

**Request:** no body.

**Response 200:**
```json
{
  "service": "PlannerAgent API",
  "version": "2.1.0",
  "status": "running",
  "endpoints": { ... }
}
```

### 3.2 `GET /health` — health check

For load-balancer probes and frontend readiness checks.

**Response 200:**
```json
{
  "status": "healthy",
  "message": "Server is running and ready to accept requests",
  "uptime_seconds": 1234.56
}
```

---

## 4. Chat Endpoints (Multi-Turn Dialogue)

This is the **primary** integration surface for a conversational frontend.

### 4.1 `POST /chat/start` — start a chat session

Runs the plan pipeline on the first question and, **by default, returns the plan for user review** (`route: "new_query_pending"`) without running the format/reasoning agent. The client must then call `POST /chat/plan/confirm` with the returned `pending_plan_session_id` to produce the final answer. This is the same two-stage flow as `/chat/message` when it classifies a question as a new query.

Pass `auto_confirm: true` to skip review and run everything in one shot (returns `route: "new_query"` with the final answer). Off by default — only opt in when your UI explicitly does not need plan review.

**Request body (`ChatStartRequest`):**
```json
{
  "question": "Tell me about PTPN22 in T1D",
  "rigor": true,
  "use_literature": true,
  "auto_confirm": false
}
```
| Field | Type | Default | Notes |
|---|---|---|---|
| `question` | string | required | The first user question. Non-empty. |
| `rigor` | bool | `true` | Evidence-only mode. Keep `true` for production. |
| `use_literature` | bool | `true` | Include HIRN abstract search in parallel. |
| `auto_confirm` | bool | `false` | `false`: returns the plan as `new_query_pending` (client must call `/chat/plan/confirm`). `true`: run plan + format in one shot, returns the final answer. |

**Response 200 (`ChatResponse`) — default (`auto_confirm: false`):**
```json
{
  "session_id": "4701b4ba16d4",
  "answer": "",
  "answer_markdown": "",
  "route": "new_query_pending",
  "round": 1,
  "plan_markdown": "## Interpreted Question\n\n...\n\n## Query Plan (parallel)\n...",
  "plan_json": { "plan_type": "parallel", "steps": [...] },
  "pending_plan_session_id": "615e4a05808a",
  "history_compressed": false,
  "processing_time_ms": 18391.0
}
```

**What the client should do (default flow):**
- Save `session_id` for all subsequent calls.
- `answer_markdown` is empty — do **not** render it as a chat bubble.
- Render `plan_markdown` in a plan-review card with Confirm / Revise / Cancel buttons.
- Store `pending_plan_session_id` — it's required for `/chat/plan/confirm`.

**Response 200 (`ChatResponse`) — with `auto_confirm: true`:**
```json
{
  "session_id": "4701b4ba16d4",
  "answer": "{...full JSON...}",
  "answer_markdown": "## PTPN22 in T1D\n\n### Gene Identity\n...",
  "route": "new_query",
  "round": 1,
  "plan_markdown": "## Interpreted Question\n\n...\n\n## Query Plan (parallel)\n...",
  "plan_json": { "plan_type": "parallel", "steps": [...] },
  "pending_plan_session_id": null,
  "history_compressed": false,
  "processing_time_ms": 45109.09
}
```

**What the client should do (auto-confirm flow):**
- Save `session_id` for all subsequent calls.
- Render `answer_markdown` as the assistant's first message.
- Optionally show `plan_markdown` in a collapsed "What I did" section.

**Errors:**
- `400` — empty question
- `500` — planning or confirm failure (see `detail` for the exception string)

---

### 4.2 `POST /chat/message` — send a follow-up (smart-routed)

The **workhorse** endpoint. Classifies the question and takes one of three response shapes depending on the route.

**Request body (`ChatMessageRequest`):**
```json
{
  "session_id": "4701b4ba16d4",
  "question": "which of those GO terms are most specific to immune response?"
}
```

The response shape depends on `route`. The frontend must branch on the `route` field.

#### Route A: `follow_up` — answered immediately

The system reused the stored data from the prior round. Answer is ready.

```json
{
  "session_id": "4701b4ba16d4",
  "answer": "{...}",
  "answer_markdown": "From the PTPN22 GO annotations...",
  "route": "follow_up",
  "round": 2,
  "plan_markdown": "",
  "plan_json": null,
  "pending_plan_session_id": null,
  "history_compressed": false,
  "processing_time_ms": 24950
}
```

Render `answer_markdown` and append it to the chat. If `history_compressed` is `true`, display a subtle notice (e.g. "Older messages were summarised to fit context").

#### Route B: `new_query_pending` — plan awaiting review

The system planned a new query but **did not execute the format step**. The user must review the plan before confirming.

```json
{
  "session_id": "4701b4ba16d4",
  "answer": "",
  "answer_markdown": "",
  "route": "new_query_pending",
  "round": 3,
  "plan_markdown": "## Interpreted Question\n\nWhat SNPs are near INS?\n\n## Query Plan (parallel)\n\n### Steps\n\n1. Find gene with name INS — **1 records**\n2. [Genomic] What SNPs are located near the INS gene region...",
  "plan_json": { "plan_type": "parallel", "steps": [...] },
  "pending_plan_session_id": "615e4a05808a",
  "history_compressed": false,
  "processing_time_ms": 18391
}
```

`answer_markdown` is empty — do **not** show it as a chat bubble. Instead, show a **plan review UI** with:
- The `plan_markdown` rendered
- "Confirm" button → calls `POST /chat/plan/confirm`
- Optional text input for revision + "Revise & confirm" button → same endpoint with `revision_prompt`
- Optional "Cancel" button → do not call confirm; the `PlanSession` will auto-expire in 30 min

Store the returned `pending_plan_session_id` — it's required for `/chat/plan/confirm`.

> **Note:** `route` values you may see in the response: `"follow_up"`, `"new_query_pending"`. `"new_query"` only appears after confirmation (in `/chat/plan/confirm` or `/chat/revise` responses, or in `/chat/start` responses when `auto_confirm: true`).

**Errors:**
- `400` — empty question
- `404` — session not found/expired
- `410` — session TTL expired (1 h inactive)
- `500` — pipeline failure

---

### 4.3 `POST /chat/plan/confirm` — confirm a pending plan

Called after `POST /chat/message` returned `route: new_query_pending`. Optionally revises the plan, then runs the format/reasoning agent on the already-retrieved data and appends the Q+A to the chat history.

**Request body (`ChatPlanConfirmRequest`):**
```json
{
  "chat_session_id": "4701b4ba16d4",
  "plan_session_id": "615e4a05808a",
  "revision_prompt": null
}
```
| Field | Type | Default | Notes |
|---|---|---|---|
| `chat_session_id` | string | required | The chat session ID. |
| `plan_session_id` | string | required | The `pending_plan_session_id` from the last `/chat/message`. |
| `revision_prompt` | string\|null | `null` | If provided, the plan is revised before confirmation. Re-executes Cypher/SQL/ssGSEA on the revised plan. |

**Response 200 (`ChatResponse`):**
```json
{
  "session_id": "4701b4ba16d4",
  "answer": "{...}",
  "answer_markdown": "**INS gene location (GRCh38.p14):** chr11: 2,159,779 – 2,161,221\n\nThe query searched for GWAS SNPs within ±1 Mb of INS on chr11...",
  "route": "new_query",
  "round": 3,
  "plan_markdown": "## Query Plan (parallel)\n\n### Steps\n...",
  "plan_json": { ... },
  "pending_plan_session_id": null,
  "history_compressed": false,
  "processing_time_ms": 6319
}
```

After this call:
- The pending `PlanSession` is deleted server-side
- The chat session's `last_*` data fields are updated so subsequent `follow_up` rounds operate on the new data
- The Q+A pair is appended to `history`

**Errors:**
- `404` — chat session or plan session not found/expired
- `409` — `plan_session_id` doesn't match the chat session's pending plan
- `500` — revision or confirm failure

---

### 4.4 `POST /chat/revise` — revise the last confirmed plan

Use when the user wants to adjust the **most recently confirmed** answer (e.g., "also add QTL SNPs", "drop the GO terms section"). Revises the plan and auto-confirms, **replacing** the last assistant turn in history (not a new round).

**Request body (`ChatReviseRequest`):**
```json
{
  "session_id": "4701b4ba16d4",
  "prompt": "focus on immune-related GO terms only"
}
```

**Response 200 (`ChatResponse`):** shape identical to `/chat/plan/confirm` with `route: "new_query"`.

**Differences from `/chat/plan/confirm`:**
| | `/chat/plan/confirm` | `/chat/revise` |
|---|---|---|
| When to call | After `new_query_pending` | After any confirmed round |
| Modifies history | Appends new Q+A | Replaces last assistant turn |
| Needs `plan_session_id` | Yes | No (uses session.last_plan) |

**Errors:**
- `400` — empty prompt
- `404`/`410` — session not found/expired
- `409` — no prior plan in the session (first call was `context_only`)
- `500` — pipeline failure

---

### 4.5 `GET /chat/history` — fetch conversation history

**Query string:**
```
GET /chat/history?session_id=4701b4ba16d4
```

**Response 200 (`ChatHistoryResponse`):**
```json
{
  "session_id": "4701b4ba16d4",
  "rounds": 3,
  "history": [
    {"role": "user",      "content": "Tell me about PTPN22 in T1D"},
    {"role": "assistant", "content": "## PTPN22 in T1D\n..."},
    {"role": "user",      "content": "which of those GO terms ..."},
    {"role": "assistant", "content": "From the PTPN22 GO annotations..."},
    {"role": "user",      "content": "now tell me about the INS gene..."},
    {"role": "assistant", "content": "**INS gene location ..."}
  ]
}
```

`history` alternates `user`/`assistant` messages. `rounds = len(history) / 2`. A **pending** round (`new_query_pending` not yet confirmed) is NOT in history.

**Errors:**
- `404`/`410` — session not found/expired

---

### 4.6 `DELETE /chat/end` — end a chat session

**Query string:**
```
DELETE /chat/end?session_id=4701b4ba16d4
```

**Response 200:**
```json
{ "status": "ended", "session_id": "4701b4ba16d4", "rounds": 3 }
```

Call when the user closes the chat UI to free server memory immediately. Sessions auto-expire after 1 h of inactivity regardless.

**Errors:**
- `404` — session not found (already ended or never existed)

---

## 5. Plan Endpoints (Standalone Manual Review)

Use these only if you want an explicit plan-review UX **without** chat history. The chat endpoints already implement plan review internally for `new_query` rounds. Most frontends only need `/chat/*`.

### 5.1 `POST /plan/start`

**Request (`PlanStartRequest`):**
```json
{
  "question": "What GO terms are associated with TCF7L2?",
  "rigor": true,
  "use_literature": false
}
```

**Response (`PlanResponse`):**
```json
{
  "session_id": "fbd58c05f070",
  "plan_markdown": "## Interpreted Question\n\n...",
  "plan_json": { "plan_type": "parallel", "steps": [...] },
  "use_literature": false,
  "error": null
}
```

### 5.2 `POST /plan/revise`

**Request (`PlanReviseRequest`):**
```json
{
  "session_id": "fbd58c05f070",
  "prompt": "also include KEGG pathways"
}
```

**Response:** `PlanResponse` (same shape as `/plan/start`).

Can be called multiple times on the same session.

### 5.3 `POST /plan/confirm`

**Request (`PlanConfirmRequest`):**
```json
{ "session_id": "fbd58c05f070" }
```

**Response (`PlanConfirmResponse`):**
```json
{
  "answer": "{...full JSON...}",
  "answer_markdown": "TCF7L2 (ENSG00000148737) has 54 GO annotations...",
  "processing_time_ms": 19395.88
}
```

After confirmation the session is deleted.

---

## 6. Data Models Reference

Pydantic models defined in `server.py`. All JSON keys are `snake_case`.

### `ChatResponse` (unified shape for all chat endpoints)

| Field | Type | Notes |
|---|---|---|
| `session_id` | string | The chat session ID. |
| `answer` | string | Full pipeline JSON (stringified). Empty for `new_query_pending`. |
| `answer_markdown` | string | Rendered Markdown answer. Empty for `new_query_pending`. |
| `route` | string | `"follow_up"`, `"new_query"`, or `"new_query_pending"`. |
| `round` | int | 1-indexed conversation round number. |
| `plan_markdown` | string | Plan summary. Empty for `follow_up`. |
| `plan_json` | object\|null | Full plan dict. `null` for `follow_up`. |
| `pending_plan_session_id` | string\|null | Present only when `route == "new_query_pending"`. Pass to `/chat/plan/confirm`. |
| `history_compressed` | bool | `true` when older turns were summarised via Haiku. Show notice to user. |
| `processing_time_ms` | float | Server-side processing time. |

### `ChatSession` lifecycle

```
created_at ─┬── last_active updated on every /chat/* call
            │
            ├── last_question, last_plan, last_neo4j_results, last_cypher_queries,
            │   last_complexity, last_literature_result  ← updated on /chat/start and
            │                                              /chat/plan/confirm and /chat/revise
            │
            ├── pending_question, pending_plan_session_id  ← set on /chat/message
            │                                                with route=new_query_pending,
            │                                                cleared on /chat/plan/confirm
            │
            └── history: [{"role", "content"}, ...]  ← appended on follow_up, new_query confirm
```

### `plan_json` shape

```json
{
  "plan_type": "parallel" | "chain",
  "reasoning": "...why this plan...",
  "steps": [
    {
      "id": 1,
      "natural_language": "Find gene with name PTPN22",
      "source": null,
      "depends_on": null,
      "join_var": "g"
    }
  ]
}
```

`source` is `null` for knowledge-graph (Neo4j) steps, `"genomic"` for PostgreSQL genomic-coordinate steps, `"ssgsea"` for immune enrichment steps.

---

## 7. Smart Router — Deep Dive

### How the classifier decides

On every `/chat/message` call a Claude Haiku classifier (0.5 s, cheap) reads the last 3 rounds + the new question and returns `follow_up` or `new_query`.

**Reply `follow_up` if the question:**
- References same entities as before ("those GO terms", "that SNP")
- Asks to explain / expand / summarise / compare / clarify existing data
- Does not introduce a new gene/SNP/disease/entity

**Reply `new_query` if the question:**
- Introduces a new entity not mentioned before
- Needs a new data source (ssGSEA, genomic, literature)
- Is ambiguous enough that plan review is warranted

On any classifier API failure, falls back to `new_query` (safe: user just sees a plan review).

### Why three response routes, not two

The classifier returns 2 labels but the response has 3 possible `route` values:
- `"follow_up"` — answered immediately, no plan review
- `"new_query_pending"` — plan was built but not executed-through-format-agent; awaiting user confirm
- `"new_query"` — plan was confirmed (only seen in `/chat/plan/confirm` and `/chat/revise` responses)

Treat `new_query_pending` as a **two-stage** `new_query`.

### Edge cases

- **First-turn `follow_up` classification**: if `/chat/message` is called on a brand-new session with no stored data yet, the router automatically promotes to `new_query`. This shouldn't happen since `/chat/start` always populates stored state, but the server handles it defensively.
- **`follow_up` when stored data is stale**: the router has no way to know if the user's question actually needs fresh data. If the follow-up answer says *"the retrieved data does not contain ..."*, encourage the user to ask again as a new question (which the classifier will then route as `new_query`).

---

## 8. Session Lifecycle & TTLs

| Session | TTL | Measured from | Cleanup trigger |
|---|---|---|---|
| `ChatSession` | 1 h (`CHAT_SESSION_TTL_SECONDS = 3600`) | `last_active` (updated on every call) | Every `/chat/*` request runs a GC sweep |
| `PlanSession` (standalone) | 30 min (`SESSION_TTL_SECONDS = 1800`) | `created_at` | Every `/plan/*` request runs a GC sweep |
| `PlanSession` (pending from chat) | 30 min | `created_at` | Deleted on successful `/chat/plan/confirm` |

**Expired session behavior:**
- `ChatSession` expired → `410 Gone` on next call
- `PlanSession` expired → `410 Gone` from `/chat/plan/confirm` (frontend should re-ask the question)

**History size cap:** the server auto-trims history at 150 KB total to keep future calls under token budgets. The first Q+A pair is always preserved; oldest pairs after that are dropped.

---

## 9. Parsing the Final Answer

The `answer` field contains the raw pipeline JSON (stringified). 99% of frontends should use `answer_markdown` directly. Parse `answer` only if you need structured sub-fields.

**Shape of parsed `answer`:**
```json
{
  "to": "user",
  "text": {
    "template_matching": "agent_answer",
    "cypher": ["MATCH (g:gene {name: 'PTPN22'}) RETURN g LIMIT 1", "..."],
    "summary": "## PTPN22 in T1D\n\n### Gene Identity\n...",
    "reasoning_trace": "...",
    "follow_up_questions": [
      "What GWAS credible-set SNPs associate with PTPN22?",
      "Which QTLs overlap PTPN22?",
      "..."
    ]
  }
}
```

`reasoning_trace` is present only in reasoning-pipeline responses (complex `chain` plans).

Frontend picks to surface:
- `summary` — the Markdown answer (same as `answer_markdown`)
- `cypher` — list of executed Cypher queries; show in a "Queries run" drawer
- `follow_up_questions` — 3 suggested next questions; render as chips/buttons

**Parsing example (TypeScript):**
```ts
type AnswerPayload = {
  to: "user";
  text: {
    template_matching: string;
    cypher: string[];
    summary: string;
    reasoning_trace?: string;
    follow_up_questions: string[];
  };
};

const parsed: AnswerPayload = JSON.parse(response.answer);
const suggestedQuestions = parsed.text.follow_up_questions;
```

---

## 10. Error Handling

All errors return JSON of the form:
```json
{ "detail": "human-readable error message" }
```

| Status | Meaning | Frontend action |
|---|---|---|
| `400` | Bad request (empty field, malformed JSON) | Show inline validation error |
| `404` | Session not found | Clear client-side session_id and prompt user to start a new chat |
| `409` | Conflict (e.g., `plan_session_id` doesn't match pending) | Refresh state; likely a stale pending plan |
| `410` | Session expired (TTL elapsed) | Same as 404 — start fresh |
| `500` | Internal pipeline failure | Retry once; if persistent show "system error" banner |
| `503` | Upstream service (Neo4j / vLLM / Claude) unavailable | Show "assistant is temporarily unavailable" |

Unhandled server exceptions are caught by `global_exception_handler` and returned as 500 with the exception stringified.

**Recommended retry policy:** retry `500` once after 2 s; do **not** retry `400`/`404`/`409`/`410`.

---

## 11. Full Flow Examples

### Example A — Default chat (plan review on first turn, then a follow-up)

```js
// 1. Start session — returns the plan for review (auto_confirm defaults to false)
const start = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/start", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({ question: "Tell me about PTPN22 in T1D" })
}).then(r => r.json());

const sessionId = start.session_id;
// start.route === "new_query_pending", start.answer_markdown === ""
showPlanReview({
  plan: start.plan_markdown,
  onConfirm: async () => {
    const answer = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/plan/confirm", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        chat_session_id: sessionId,
        plan_session_id: start.pending_plan_session_id,
      })
    }).then(r => r.json());
    renderAssistant(answer.answer_markdown);
  },
});

// 2. Follow-up — classifier routes to follow_up, answered immediately
const msg1 = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/message", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    session_id: sessionId,
    question: "which of those GO terms are most specific to immune response?"
  })
}).then(r => r.json());

// msg1.route === "follow_up"
renderAssistant(msg1.answer_markdown);
if (msg1.history_compressed) showBanner("Older messages were summarised to fit context.");

// 3. End session
await fetch(`https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/end?session_id=${sessionId}`, { method: "DELETE" });
```

### Example A' — One-shot start (opt-in auto-confirm, skips plan review on first turn)

```js
const start = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/start", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({ question: "Tell me about PTPN22 in T1D", auto_confirm: true })
}).then(r => r.json());

// start.route === "new_query", start.answer_markdown is populated
const sessionId = start.session_id;
renderAssistant(start.answer_markdown);
```

### Example B — Chat with plan review on a new_query

```js
const sessionId = /* from /chat/start */;

// User types a new_query question
const msg = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/message", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    session_id: sessionId,
    question: "now tell me about INS gene and what SNPs are near it"
  })
}).then(r => r.json());

if (msg.route === "new_query_pending") {
  // Render plan review UI
  showPlanReview({
    plan: msg.plan_markdown,
    onConfirm: async () => {
      const final = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/plan/confirm", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          chat_session_id: sessionId,
          plan_session_id: msg.pending_plan_session_id,
        })
      }).then(r => r.json());
      renderAssistant(final.answer_markdown);
    },
    onRevise: async (revisionPrompt) => {
      const final = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/plan/confirm", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          chat_session_id: sessionId,
          plan_session_id: msg.pending_plan_session_id,
          revision_prompt: revisionPrompt
        })
      }).then(r => r.json());
      renderAssistant(final.answer_markdown);
    },
    onCancel: () => { /* do nothing — plan will expire in 30 min */ }
  });
} else if (msg.route === "follow_up") {
  renderAssistant(msg.answer_markdown);
}
```

### Example C — Standalone plan flow (no chat history)

```js
// 1. Start plan
const plan = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/plan/start", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({ question: "What GO terms are associated with TCF7L2?" })
}).then(r => r.json());

showPlanReview(plan.plan_markdown);

// 2. Revise (optional, repeatable)
const revised = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/plan/revise", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    session_id: plan.session_id,
    prompt: "also include KEGG pathways"
  })
}).then(r => r.json());

// 3. Confirm
const answer = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/plan/confirm", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({ session_id: plan.session_id })
}).then(r => r.json());

renderAnswer(answer.answer_markdown);
// session is auto-deleted after confirm
```

### Example D — Dealing with a revision on the last confirmed answer

```js
// After a round has been confirmed, user says "actually focus on immune terms only"
const revised = await fetch("https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/revise", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    session_id: sessionId,
    prompt: "focus on immune-related GO terms only"
  })
}).then(r => r.json());

// The last assistant turn in history is REPLACED with revised.answer_markdown.
// Do not add a new chat bubble — replace the previous one.
replaceLastAssistant(revised.answer_markdown);
```

---

## 12. Frontend UX Recommendations

### 12.1 Three distinct UI states for `/chat/message`

Render differently based on `route`:

| Route | UI state |
|---|---|
| `follow_up` | Normal assistant chat bubble with `answer_markdown` |
| `new_query_pending` | **Plan review card** — NOT a chat bubble. Has Confirm/Revise/Cancel buttons |
| `new_query` | (seen only from `/chat/plan/confirm` / `/chat/revise`) Normal assistant chat bubble |

### 12.2 Loading states

- `follow_up` — show typing indicator, expect ~5–25 s
- `new_query_pending` — show "planning..." indicator, expect ~15–30 s (plan only, format hasn't run yet)
- `/chat/plan/confirm` — show "running query..." indicator, expect ~5–30 s
- `/chat/start` (default, `auto_confirm: false`) — show "planning your query..." indicator, expect ~15–30 s (plan only)
- `/chat/start` (`auto_confirm: true`) — show "analyzing your question..." indicator, expect ~30–60 s (plan + format)

### 12.3 `history_compressed` notice

When `history_compressed: true`:
- Show a non-dismissive banner: *"Older messages in this conversation were summarised to stay within context limits. Recent replies may reference the summary."*
- Optionally provide a link to `/chat/history` so the user can see the full uncompressed history (the server keeps the full history even after summarising it for the agent).

### 12.4 Plan-review card layout

For `new_query_pending`, render something like:

```
┌────────────────────────────────────────────────────┐
│  🔍 Review the plan before running                │
│                                                    │
│  [plan_markdown rendered here]                    │
│                                                    │
│  ┌─────────────────────────────────────────┐     │
│  │ (Optional) Suggest a revision...        │     │
│  └─────────────────────────────────────────┘     │
│                                                    │
│  [ Cancel ]   [ Revise & Run ]   [ ✓ Run as-is ] │
└────────────────────────────────────────────────────┘
```

### 12.5 Follow-up suggestions

Parse `answer.text.follow_up_questions` and render as 3 clickable chips. Clicking one calls `/chat/message` with that as the question.

### 12.6 Cypher/plan inspection drawer

Let power users inspect:
- `plan_json` — the structured plan
- `answer.text.cypher` — list of Cypher queries executed
- `answer.text.reasoning_trace` — present in complex-question responses

Keep this hidden by default behind a "Show details" toggle.

### 12.7 Session management

- Generate a fresh `session_id` via `/chat/start` on every new conversation
- Persist `session_id` in `sessionStorage` (not `localStorage`) — chats are ephemeral
- On `404`/`410`, clear the stored ID and start a new session gracefully

### 12.8 Concurrency

The server serialises all pipeline calls under a single internal request lock. Do **not** send parallel `/chat/message` calls for the same or different sessions — they'll queue server-side and may cause user-visible latency spikes. One request at a time per backend instance.

---

## Quick Endpoint Summary

| Method | Path | Body | Primary use |
|---|---|---|---|
| `GET` | `/` | — | API info |
| `GET` | `/health` | — | Health check |
| `POST` | `/chat/start` | `ChatStartRequest` | Start chat; returns plan for review by default (`auto_confirm: true` to skip) |
| `POST` | `/chat/message` | `ChatMessageRequest` | Follow-up; smart-routed |
| `POST` | `/chat/plan/confirm` | `ChatPlanConfirmRequest` | Confirm pending `new_query_pending` |
| `POST` | `/chat/revise` | `ChatReviseRequest` | Revise last confirmed plan |
| `GET` | `/chat/history?session_id=...` | — | Fetch conversation |
| `DELETE` | `/chat/end?session_id=...` | — | End session |
| `POST` | `/plan/start` | `PlanStartRequest` | Standalone plan start |
| `POST` | `/plan/revise` | `PlanReviseRequest` | Revise standalone plan |
| `POST` | `/plan/confirm` | `PlanConfirmRequest` | Confirm standalone plan |

---

**Need interactive docs?** The server exposes Swagger UI at [`/docs`](https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/docs) and ReDoc at [`/redoc`](https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/redoc) — both auto-generated from the Pydantic models.
