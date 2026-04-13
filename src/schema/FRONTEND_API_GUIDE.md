# PlannerAgent API — Frontend Integration Guide

Base URL: `http://<host>:8080` (default port; override with `PORT` env var or CLI arg)

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [Simple Query (Synchronous)](#2-simple-query-synchronous)
3. [Simple Query (Streaming)](#3-simple-query-streaming)
4. [Interactive Plan Mode](#4-interactive-plan-mode)
   - [Step 1 — Start a Plan](#step-1--start-a-plan)
   - [Step 2 — Revise the Plan (optional)](#step-2--revise-the-plan-optional)
   - [Step 3 — Confirm and Get Final Answer](#step-3--confirm-and-get-final-answer)
5. [Parsing the Final Answer](#5-parsing-the-final-answer)
6. [Streaming Event Reference](#6-streaming-event-reference)
7. [Error Handling](#7-error-handling)
8. [Full JavaScript Examples](#8-full-javascript-examples)

---

## 1. Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "Server is running and ready to accept requests",
  "uptime_seconds": 3600.5
}
```

Use this to poll until the server is ready before making queries (startup takes ~10–30 s while agents initialize).

---

## 2. Simple Query (Synchronous)

Blocks until the full answer is ready. Suitable for non-interactive use.

```
POST /query
Content-Type: application/json
```

**Request body:**
```json
{
  "question": "What genes are associated with Type 1 Diabetes?",
  "rigor": true
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `question` | string | required | Natural language question |
| `rigor` | boolean | `true` | Strict evidence-only mode (no speculation) |

**Response:**
```json
{
  "answer": "{\"to\":\"user\",\"text\":{\"summary\":\"## Genes associated with T1D\\n...\"}}",
  "processing_time_ms": 4321.0
}
```

The `answer` field is a **JSON string** — parse it and read `text.summary` for the Markdown output (see [§5](#5-parsing-the-final-answer)).

---

## 3. Simple Query (Streaming)

Returns NDJSON events in real time as the pipeline progresses.

```
POST /query/stream
Content-Type: application/json
```

**Request body:** same as `/query`

**Response:** `Content-Type: application/x-ndjson`

Each line is a JSON event:
```json
{"event": "pipeline_start", "ts": 1709500000.123, "data": {...}}
{"event": "cypher_executing", "ts": 1709500001.456, "data": {"index": 0, "cypher": "MATCH ..."}}
{"event": "cypher_result",    "ts": 1709500002.789, "data": {"index": 0, "num_records": 12}}
{"event": "format_start",     "ts": 1709500003.000, "data": {}}
{"event": "final_response",   "ts": 1709500005.000, "data": {"response": "{\"to\":\"user\",...}"}}
```

The stream ends with a `final_response` event. Parse `data.response` the same way as the synchronous `/query` answer (see [§5](#5-parsing-the-final-answer)).

See [§6](#6-streaming-event-reference) for the full list of events.

---

## 4. Interactive Plan Mode

The plan flow lets the user review and optionally revise the query plan before the final answer is generated. This is a **3-step stateful workflow** managed by a server-side session.

```
/plan/start  →  (optional) /plan/revise  →  /plan/confirm
```

Sessions expire after **30 minutes** of inactivity.

---

### Step 1 — Start a Plan

```
POST /plan/start
Content-Type: application/json
```

**Request body:**
```json
{
  "question": "What genes are associated with Type 1 Diabetes?",
  "rigor": true,
  "use_literature": false
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `question` | string | required | Natural language question |
| `rigor` | boolean | `true` | Strict evidence-only mode |
| `use_literature` | boolean | `false` | Also run HIRN literature search in parallel |

**Response:**
```json
{
  "session_id": "abc123def456",
  "plan_markdown": "## Interpreted Question\n\ngive me all the information related to gene CFTR\n\n## Query Plan (parallel)\n\nThe user wants all information about CFTR...\n\n### Steps\n\n1. Find gene with name CFTR — **1 records**\n...",
  "plan_json": {
    "plan_type": "parallel",
    "reasoning": "The user wants all information about CFTR: gene details, associated SNPs...",
    "steps": [
      { "id": 1, "natural_language": "Find gene with name CFTR", "join_var": "g", "depends_on": null, "cypher": "MATCH (g:Gene {name: 'CFTR'}) RETURN g" },
      { "id": 2, "natural_language": "Get SNPs that have part_of_QTL_signal relationships with gene CFTR", "join_var": "s", "depends_on": null, "cypher": "MATCH (s:SNP)-[:part_of_QTL_signal]->(g:Gene {name: 'CFTR'}) RETURN s" }
    ]
  },
  "use_literature": false,
  "error": null
}
```

- **`session_id`** — store this; required for all subsequent calls
- **`plan_markdown`** — render this directly as Markdown (see structure below)
- **`plan_json`** — structured plan; use if you need to build a custom UI from individual steps. Each step has `id`, `natural_language`, `join_var`, `depends_on`, and `cypher` (added after translation)
- **`use_literature`** — reflects whether HIRN literature was actually searched

#### `plan_markdown` structure

The `plan_markdown` string is fully formatted and ready to render. It always follows this layout:

```markdown
## Interpreted Question

give me all the information related to gene CFTR

## Query Plan (parallel)

The user wants all information about CFTR: gene details, associated SNPs (QTL),
diseases (COLOC, effector), cell types (DEG, expression), GO annotations, PPI
partners, genetic regulation partners, and OCRs located near it.

### Steps

1. Find gene with name CFTR — **1 records**
2. Get SNPs that have part_of_QTL_signal relationships with gene CFTR — **4 records**
3. Get diseases that have signal_COLOC_with relationships with gene CFTR — **2 records**
4. Get diseases that have effector_gene_of relationships with gene CFTR — **2 records**
5. Get cell types where gene CFTR has expression_level_in relationships — **3 records**
6. Get gene ontology terms that have function_annotation relationships with gene CFTR — **64 records**
7. ~~Search HIRN publications for relevant literature~~ — **disabled**

**Scope:** 6 data sources, 6 returned data.

---
Type a revision, **confirm** to generate the answer, or **new** for a different question.
```

| Section | What it contains |
|---------|-----------------|
| `## Interpreted Question` | The original user question verbatim |
| `## Query Plan (parallel\|chain)` | Plan type + Claude's reasoning about what data to fetch |
| `### Steps` | Each step's natural language description + record count from Neo4j |
| Literature step | Shown as ~~strikethrough~~ + **disabled** when off; **found results** / **no results** when on |
| `**Scope:**` line | Total data sources queried and how many returned data |
| Last line | CLI prompt hint — **strip or ignore** this in your UI; use your own Revise/Confirm buttons instead |

> **Note:** This step runs the full plan + Cypher execution in the background. The Neo4j results are cached in the session — `/plan/confirm` reuses them without re-querying the database.

---

### Step 2 — Revise the Plan (optional)

Call this if the user wants to adjust the plan. Can be called **multiple times**.

```
POST /plan/revise
Content-Type: application/json
```

**Request body:**
```json
{
  "session_id": "abc123def456",
  "prompt": "Also include gene expression data and search literature"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | From `/plan/start` |
| `prompt` | string | User's revision instruction |

**Literature toggle phrases** (detected automatically in the prompt):
- Enable: `"search literature"`, `"add literature"`, `"include literature"`, `"enable literature"`, `"also search literature"`, `"with literature"`, `"search publications"`, `"add publications"`, `"include publications"`, `"search hirn"`, `"add hirn"`, `"include hirn"`
- Disable: `"no literature"`, `"remove literature"`, `"disable literature"`, `"without literature"`, `"don't search literature"`, `"skip literature"`, `"no publications"`, `"remove publications"`, `"no hirn"`, `"remove hirn"`

**Response:** same shape as `/plan/start`

```json
{
  "session_id": "abc123def456",
  "plan_markdown": "## Interpreted Question\n\n...\n\n## Query Plan (parallel)\n\n...",
  "plan_json": { ... },
  "use_literature": true,
  "error": null
}
```

> **Note:** The `plan_markdown` format is identical to the initial `/plan/start` response — same `## Interpreted Question` + `## Query Plan` structure, just with updated steps and data.

If revision fails, `error` will be non-null and the **previous plan remains active**:
```json
{
  "session_id": "abc123def456",
  "plan_markdown": "**Revision failed:** ...\n\nThe previous plan is still active.",
  "plan_json": { ... },
  "error": "Failed to revise plan: ..."
}
```

---

### Step 3 — Confirm and Get Final Answer

Once the user approves the plan, call confirm to run the format/reasoning pipeline.

```
POST /plan/confirm
Content-Type: application/json
```

**Request body:**
```json
{
  "session_id": "abc123def456"
}
```

**Response:**
```json
{
  "answer": "{\"to\":\"user\",\"text\":{\"summary\":\"## Results\\n...\"}}",
  "processing_time_ms": 2100.0
}
```

- The session is **deleted** after a successful confirm — do not call confirm twice
- Parse `answer` the same way as `/query` (see [§5](#5-parsing-the-final-answer))

---

## 5. Parsing the Final Answer

The `answer` field returned by `/query`, `/query/stream` (`final_response` event), and `/plan/confirm` is a **JSON string**. Parse it like this:

```javascript
const outer = JSON.parse(answer);
// outer.to === "user"
// outer.text is an object or string

const text = outer.text;

// The Markdown summary for display:
const summary = typeof text === "string" ? text : text.summary;

// Optional structured fields (may be present):
const cypherQueries   = text.cypher;            // string[] — Cypher queries used
const templateMatch   = text.template_matching;  // string — "agent_answer" etc.
const reasoningTrace  = text.reasoning_trace;    // string — multi-hop reasoning trace (complex questions only)
```

**Minimal display helper:**
```javascript
function extractSummary(answerString) {
  try {
    const outer = JSON.parse(answerString);
    const text = outer?.text;
    if (!text) return answerString;
    return typeof text === "string" ? text : (text.summary ?? JSON.stringify(text));
  } catch {
    return answerString;
  }
}
```

---

## 6. Streaming Event Reference

All events share this envelope:

```json
{ "event": "<type>", "ts": 1709500000.0, "data": { ... } }
```

### Planner Stage
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `planner_test_time_start` | `num_candidates`, `question` | Planner best-of-N dispatched |
| `planner_test_time_result` | `selected`, `candidates[]`, `elapsed_s` | Planner best candidate chosen |
| `planner_agent_claude_done` | `model`, `tokens` | PlannerAgent Claude call finished |

### Query Planner Stage
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `pipeline_start` | `question` | Query-planner pipeline begins |
| `planner_claude_done` | `plan_type`, `num_steps` | Claude plan generation call finished |
| `plan_generated` | `question`, `plan_type`, `reasoning`, `num_steps`, `steps[]` | Plan fully generated |
| `text2cypher_done` | `step_id`, `success`, `cypher`, `error?` | One step translated by vLLM (or failed) |
| `cypher_executing` | `index`, `cypher`, `plan_type` | Cypher query sent to Neo4j |
| `cypher_result` | `index`, `num_records`, `error?` | Neo4j returned result |
| `test_time_scaling_result` | `num_candidates`, `selected`, `selected_score`, `candidates[]`, `elapsed_s` | Best-of-N query planner candidate chosen |

### Plan Mode Stage (Interactive Plan)
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `plan_test_time_start` | `num_candidates`, `question`, `use_literature` | Plan best-of-N started |
| `plan_test_time_result` | `num_candidates`, `selected`, `selected_score`, `candidates[]`, `elapsed_s` | Best plan candidate chosen |
| `plan_revised` | `plan_type`, `reasoning`, `num_steps` | Plan revised after user feedback |
| `plan_revision_claude_done` | `model`, `tokens` | Revision Claude call finished |
| `plan_revision_error` | `reasoning` | Revision returned an error plan |
| `plan_hirn_search_start` | `question`, `trigger?` | HIRN literature search started |
| `plan_hirn_search_done` | `success`, `length`, `trigger?` | HIRN search finished |

### HIRN Literature Stage
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `hirn_search_start` | `query` | HIRN skill begins |
| `hirn_publications_loaded` | `count` | Publication index loaded |
| `hirn_matches_found` | `count` | Title search done |
| `hirn_pmcids_resolved` | `count` | PMCIDs resolved |
| `hirn_chunks_ready` | `count` | Chunks extracted and ranked |
| `hirn_result` | `status`, `query`, `result_length?`, `error?` | Final HIRN result (`status`: `"success"`, `"timeout"`, or `"error"`) |

### Format Agent Stage (simple questions)
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `format_start` | — | Format pipeline begins |
| `format_no_data` | `reason` | Skipped — no data from Neo4j |
| `format_compress` | `original_len`, `compressed_len` | Compression step |
| `format_claude_start` | `mode`, `model` | Calling Claude |
| `format_claude_input` | (debug info) | Input details sent to Claude |
| `format_claude_done` | `model`, `tokens` | Claude responded |
| `format_raw_output` | `output` (truncated to 3000 chars) | Raw Claude output |
| `format_halluc_check` | `passed`, `issues?`, `error?` | Hallucination check result |
| `format_auto_clean` | — | Auto-cleaned hallucinated content |
| `format_done` | — | Format pipeline finished |

### Reasoning Agent Stage (complex questions)
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `reasoning_start` | — | Reasoning pipeline begins |
| `reasoning_no_data` | `reason` | Skipped — no data from Neo4j |
| `reasoning_compress` | `original_len`, `compressed_len` | Compression step |
| `reasoning_claude_start` | `mode`, `model` | Calling Claude |
| `reasoning_claude_input` | (debug info) | Input details sent to Claude |
| `reasoning_claude_done` | `model`, `tokens` | Claude responded |
| `reasoning_raw_output` | `output` (truncated to 3000 chars) | Raw Claude output |
| `reasoning_halluc_check` | `passed`, `issues?`, `error?` | Hallucination check result |
| `reasoning_auto_clean` | — | Auto-cleaned hallucinated content |
| `reasoning_done` | — | Reasoning pipeline finished |

### Rigor Format Agent Stage (simple questions, rigor=true)
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `rigor_format_start` | — | Rigor format pipeline begins |
| `rigor_format_no_data` | `reason` | Skipped — no data from Neo4j |
| `rigor_format_claude_start` | `mode`, `model` | Calling Claude |
| `rigor_format_claude_input` | (debug info) | Input details sent to Claude |
| `rigor_format_claude_done` | `model`, `tokens` | Claude responded |
| `rigor_format_raw_output` | `output` (truncated to 3000 chars) | Raw Claude output |
| `rigor_format_halluc_check` | `passed`, `issues?`, `error?` | Hallucination check result |
| `rigor_format_auto_clean` | — | Auto-cleaned hallucinated content |
| `follow_up_questions` | `questions: string[]` | Suggested follow-up questions |
| `rigor_format_done` | — | Rigor format pipeline finished |

### Rigor Reasoning Agent Stage (complex questions, rigor=true)
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `rigor_reasoning_start` | — | Rigor reasoning pipeline begins |
| `rigor_reasoning_no_data` | `reason` | Skipped — no data from Neo4j |
| `rigor_reasoning_claude_start` | `mode`, `model` | Calling Claude |
| `rigor_reasoning_claude_input` | (debug info) | Input details sent to Claude |
| `rigor_reasoning_claude_done` | `model`, `tokens` | Claude responded |
| `rigor_reasoning_raw_output` | `output` (truncated to 3000 chars) | Raw Claude output |
| `rigor_reasoning_halluc_check` | `passed`, `issues?`, `error?` | Hallucination check result |
| `rigor_reasoning_auto_clean` | — | Auto-cleaned hallucinated content |
| `follow_up_questions` | `questions: string[]` | Suggested follow-up questions |
| `rigor_reasoning_done` | — | Rigor reasoning pipeline finished |

### Sub-Agent Claude Calls
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `pankbase_agent_claude_done` | `model`, `tokens` | PankBaseAgent Claude call finished |
| `template_agent_claude_done` | `model`, `tokens` | TemplateToolAgent Claude call finished |
| `glkb_agent_claude_done` | `model`, `tokens` | GLKBAgent Claude call finished |
| `pankbase_summary` | `response` (truncated) | PankBaseAgent result summary |

### Routing & Final
| Event | Key data fields | Description |
|-------|----------------|-------------|
| `main_routing` | `agent: "rigor_reasoning"\|"reasoning"\|"rigor_format"\|"format"`, `complexity` | Routing decision |
| `rigor_mode` | `enabled: bool` | Rigor mode toggle event |
| `hallucination_check_start` | `checker`, `output_length` | Hallucination checker invoked |
| `final_response` | `response` | Final answer (JSON string) |
| `error` | `message` | Pipeline error (streaming only) |

---

## 7. Error Handling

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Empty or invalid request body |
| `404` | Session not found (expired or wrong ID) |
| `410` | Session expired (30-minute TTL exceeded) |
| `500` | Internal pipeline error |

All error responses have this shape:
```json
{ "detail": "Human-readable error message" }
```

For 500 errors from the global handler:
```json
{ "error": "Internal server error", "message": "..." }
```

---

## 8. Full JavaScript Examples

### Streaming query with progress display

```javascript
async function streamQuery(question, onEvent, onDone) {
  const res = await fetch("/query/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, rigor: true }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.event === "final_response") {
          onDone(extractSummary(event.data.response));
        } else {
          onEvent(event);
        }
      } catch {}
    }
  }
}
```

### Interactive plan mode

```javascript
async function planMode(question) {
  // Step 1: Start
  const startRes = await fetch("/plan/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, rigor: true, use_literature: false }),
  });
  const startData = await startRes.json();
  const { session_id, plan_markdown } = startData;

  // Render plan_markdown to the user for review...
  displayPlan(plan_markdown);

  // Step 2 (optional): Revise if user requests changes
  const userRevision = await getUserInput(); // your UI logic
  if (userRevision) {
    const revRes = await fetch("/plan/revise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id, prompt: userRevision }),
    });
    const revData = await revRes.json();
    if (revData.error) {
      showWarning(revData.error); // previous plan still active
    } else {
      displayPlan(revData.plan_markdown);
    }
  }

  // Step 3: Confirm
  const confirmRes = await fetch("/plan/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id }),
  });
  const confirmData = await confirmRes.json();
  const summary = extractSummary(confirmData.answer);
  displayAnswer(summary); // render Markdown
}

function extractSummary(answerString) {
  try {
    const outer = JSON.parse(answerString);
    const text = outer?.text;
    if (!text) return answerString;
    return typeof text === "string" ? text : (text.summary ?? JSON.stringify(text));
  } catch {
    return answerString;
  }
}
```

### Polling for server readiness on startup

```javascript
async function waitForServer(maxWaitMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch("/health");
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Server did not become ready in time");
}
```
